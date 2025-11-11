import { NextRequest, NextResponse } from "next/server";
import { withFlightBrowseAccess } from "@/lib/withActionAccess";
import { getCache, setCache } from "@/lib/supabaseCache";

const AERODATABOX_API_KEY =
  process.env.API_MARKET_KEY || process.env.AERODATABOX_API_KEY;
const AERODATABOX_BASE_URL =
  process.env.API_MARKET_BASE_URL ||
  "https://prod.api.market/api/v1/aedbx/aerodatabox";

// Fonction pour appeler AeroDataBox
async function callAero(
  path: string
): Promise<{ ok: boolean; status: number; text: string; url: string }> {
  const url1 = `https://prod.api.market/api/v1/aedbx/aerodatabox${path}`;
  const url2 = `https://api.market/api/v1/aedbx/aerodatabox${path}`;
  const url3 = `https://api.market/api/aedbx/aerodatabox${path}`;
  const url4 = `https://api.market/aedbx/aerodatabox${path}`;

  const urlsToTry = [url1, url2, url3, url4];

  for (const url of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-magicapi-key": AERODATABOX_API_KEY!,
          "x-api-market-key": AERODATABOX_API_KEY!,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const text = await response.text();

      if (response.ok) {
        return {
          ok: response.ok,
          status: response.status,
          text,
          url,
        };
      }

      if (response.status === 401 || response.status === 403) {
        console.log(
          `[AircraftStatus] Auth error (${response.status}) with ${url}, trying next...`
        );
        continue;
      }

      return {
        ok: response.ok,
        status: response.status,
        text,
        url,
      };
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log(`[AircraftStatus] Timeout with ${url}, trying next...`);
        if (url === urlsToTry[urlsToTry.length - 1]) {
          return {
            ok: false,
            status: 408,
            text: JSON.stringify({ error: "Request timeout" }),
            url,
          };
        }
        continue;
      }
      console.log(
        `[AircraftStatus] Network error with ${url}: ${error.message}, trying next...`
      );
      if (url === urlsToTry[urlsToTry.length - 1]) {
        return {
          ok: false,
          status: 500,
          text: JSON.stringify({ error: "Network error" }),
          url,
        };
      }
      continue;
    }
  }

  return {
    ok: false,
    status: 502,
    text: JSON.stringify({ error: "All API endpoints failed" }),
    url: urlsToTry[0],
  };
}

// Helper pour convertir Date en ISO string (YYYY-MM-DD)
function toISOZ(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const GET = withFlightBrowseAccess(
  async (req: Request, { params }: { params: Promise<{ reg: string }> }) => {
    try {
      if (!AERODATABOX_API_KEY) {
        return NextResponse.json(
          { error: "AeroDataBox API key not configured" },
          { status: 500 }
        );
      }

      const { reg } = await params;
      const registration = reg.toUpperCase().trim();

      if (!registration) {
        return NextResponse.json(
          { error: "Registration is required" },
          { status: 400 }
        );
      }

      // Récupérer les vols d'aujourd'hui ET d'hier (pour détecter les vols en cours qui ont commencé hier)
      const today = new Date();
      const todayDate = toISOZ(today);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = toISOZ(yesterday);

      const cacheKey = `aircraft-status:${registration}:${yesterdayDate}:${todayDate}`;

      // Vérifier le cache (TTL de 30 minutes)
      const cached = await getCache(cacheKey);
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          console.log(
            `[AircraftStatus] Cache HIT for ${cacheKey} - skipping credit charge`
          );
          return NextResponse.json(cachedData, {
            headers: {
              "X-Cache": "HIT",
              "X-Skip-Credit-Charge": "true", // Ne pas charger de crédits si on utilise uniquement le cache
              "Cache-Control": "public, max-age=1800, s-maxage=1800", // 30 minutes
            },
          });
        } catch (e) {
          console.log(
            `[AircraftStatus] Failed to parse cached response, ignoring cache:`,
            e
          );
        }
      }

      console.log(`[AircraftStatus] Cache MISS for ${cacheKey} - calling API`);

      // Appel API pour récupérer les vols d'hier et d'aujourd'hui (pour détecter les vols en cours)
      const apiPath = `/flights/Reg/${encodeURIComponent(
        registration
      )}/${encodeURIComponent(yesterdayDate)}/${encodeURIComponent(
        todayDate
      )}?withLocation=true&withCodeshared=true&withCancelled=true&limit=100`;

      const response = await callAero(apiPath);

      if (response.status === 204 || !response.text) {
        // Pas de vols aujourd'hui
        const emptyResult = {
          registration,
          date: todayDate,
          status: "no_flights",
          message: "No flights scheduled for today",
          flights: [],
        };

        // Mettre en cache même les résultats vides (TTL plus court : 1 heure)
        await setCache(cacheKey, JSON.stringify(emptyResult), 3600);

        return NextResponse.json(emptyResult, {
          headers: {
            "X-Cache": "MISS",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      }

      if (!response.ok) {
        return NextResponse.json(
          {
            error: `API error: ${response.status}`,
            registration,
            date: todayDate,
          },
          { status: response.status }
        );
      }

      // Parser la réponse
      let flights: any[] = [];
      try {
        const data = JSON.parse(response.text);
        flights = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : [];
      } catch (e) {
        console.error(`[AircraftStatus] Failed to parse API response:`, e);
        return NextResponse.json(
          {
            error: "Failed to parse API response",
            registration,
            date: todayDate,
          },
          { status: 500 }
        );
      }

      // Trouver le vol le plus récent ou en cours
      const now = new Date();
      let currentFlight: any = null;
      let status:
        | "in_flight"
        | "on_ground"
        | "scheduled"
        | "no_flights"
        | "unknown" = "unknown";
      let message = "";
      let location = "";
      let flightInfo: any = null;

      // Trier les vols intelligemment :
      // 1. Priorité aux vols en cours (départé mais pas encore arrivé)
      // 2. Puis par heure de départ (du plus récent au plus ancien)
      const sortedFlights = flights.sort((a, b) => {
        const timeA =
          a.departure?.actualTime?.utc ||
          a.departure?.revisedTime?.utc ||
          a.departure?.scheduledTime?.utc ||
          "";
        const timeB =
          b.departure?.actualTime?.utc ||
          b.departure?.revisedTime?.utc ||
          b.departure?.scheduledTime?.utc ||
          "";

        const arrTimeA =
          a.arrival?.predictedTime?.utc ||
          a.arrival?.actualTime?.utc ||
          a.arrival?.revisedTime?.utc ||
          a.arrival?.scheduledTime?.utc ||
          "";
        const arrTimeB =
          b.arrival?.predictedTime?.utc ||
          b.arrival?.actualTime?.utc ||
          b.arrival?.revisedTime?.utc ||
          b.arrival?.scheduledTime?.utc ||
          "";

        // Vérifier si les vols sont en cours
        const isAInFlight =
          timeA &&
          arrTimeA &&
          new Date(timeA) <= now &&
          new Date(arrTimeA) > now;
        const isBInFlight =
          timeB &&
          arrTimeB &&
          new Date(timeB) <= now &&
          new Date(arrTimeB) > now;

        // Prioriser les vols en cours
        if (isAInFlight && !isBInFlight) return -1;
        if (!isAInFlight && isBInFlight) return 1;

        // Si les deux sont en cours ou aucun n'est en cours, trier par heure de départ
        return timeB.localeCompare(timeA);
      });

      console.log(
        `[AircraftStatus] Processing ${
          sortedFlights.length
        } flights for ${registration} at ${now.toISOString()}`
      );

      // Log tous les vols pour déboguer
      console.log(
        `[AircraftStatus] All flights for ${registration}:`,
        sortedFlights.map((f) => ({
          number: f.number,
          status: f.status,
          dep: f.departure?.airport?.iata || f.departure?.airport?.icao,
          arr: f.arrival?.airport?.iata || f.arrival?.airport?.icao,
          depTime:
            f.departure?.actualTime?.utc || f.departure?.scheduledTime?.utc,
          arrTime:
            f.arrival?.predictedTime?.utc ||
            f.arrival?.actualTime?.utc ||
            f.arrival?.scheduledTime?.utc,
        }))
      );

      // Chercher le vol le plus pertinent (en cours ou le plus récent)
      // PRIORITÉ 1: Vols en cours (status "Departed", "InFlight", etc.)
      for (const flight of sortedFlights) {
        const depTimeUtc =
          flight.departure?.actualTime?.utc ||
          flight.departure?.revisedTime?.utc ||
          flight.departure?.scheduledTime?.utc;
        // Utiliser predictedTime pour les vols en cours, sinon actualTime, puis scheduledTime
        const arrTimeUtc =
          flight.arrival?.predictedTime?.utc ||
          flight.arrival?.actualTime?.utc ||
          flight.arrival?.revisedTime?.utc ||
          flight.arrival?.scheduledTime?.utc;
        const depTimeLocal =
          flight.departure?.actualTime?.local ||
          flight.departure?.revisedTime?.local ||
          flight.departure?.scheduledTime?.local;
        const arrTimeLocal =
          flight.arrival?.predictedTime?.local ||
          flight.arrival?.actualTime?.local ||
          flight.arrival?.revisedTime?.local ||
          flight.arrival?.scheduledTime?.local;
        const flightStatus = (flight.status || "").toLowerCase();

        // Détecter les vols en cours par statut (PRIORITÉ ABSOLUE)
        // Mais seulement si l'heure d'arrivée n'est pas encore passée
        const isInFlightByStatus =
          flightStatus === "inflight" ||
          flightStatus === "in flight" ||
          flightStatus === "departed" ||
          flightStatus === "enroute" ||
          flightStatus === "flying" ||
          flightStatus === "airborne";

        if (isInFlightByStatus && depTimeUtc) {
          const dep = new Date(depTimeUtc);
          // Si pas d'heure d'arrivée, utiliser une heure future par défaut (vol long-courrier)
          const arr = arrTimeUtc
            ? new Date(arrTimeUtc)
            : new Date(now.getTime() + 12 * 60 * 60 * 1000); // +12h par défaut

          // VÉRIFIER que l'avion n'est pas déjà arrivé
          // Si l'heure d'arrivée est passée, ne pas considérer ce vol comme en cours
          // même si le statut est "Departed" (l'API peut ne pas être à jour)
          if (now >= arr) {
            console.log(
              `[AircraftStatus] Flight ${
                flight.number
              } has status "${flightStatus}" but arrival time (${arr.toISOString()}) has passed, skipping...`
            );
            continue; // Passer au vol suivant
          }

          // Vérifier aussi que le départ est dans le passé (vol a bien décollé)
          if (now < dep) {
            console.log(
              `[AircraftStatus] Flight ${
                flight.number
              } has status "${flightStatus}" but departure time (${dep.toISOString()}) is in the future, skipping...`
            );
            continue; // Passer au vol suivant
          }

          // Le vol est vraiment en cours : départé mais pas encore arrivé
          currentFlight = flight;
          status = "in_flight";
          const depAirport =
            flight.departure?.airport?.iata ||
            flight.departure?.airport?.icao ||
            "";
          const arrAirport =
            flight.arrival?.airport?.iata ||
            flight.arrival?.airport?.icao ||
            "";
          const flightNumber = flight.number || "";
          const hoursInFlight = Math.floor(
            (now.getTime() - dep.getTime()) / (1000 * 60 * 60)
          );
          const minutesInFlight = Math.floor(
            ((now.getTime() - dep.getTime()) % (1000 * 60 * 60)) / (1000 * 60)
          );
          message = `In flight from ${depAirport} to ${arrAirport} since ${hoursInFlight}H${
            minutesInFlight > 0 ? " " + minutesInFlight + "m" : ""
          }`;
          location = `${depAirport} → ${arrAirport}`;
          flightInfo = {
            number: flightNumber,
            departure: {
              airport: depAirport,
              name: flight.departure?.airport?.name || "",
              time: depTimeLocal || depTimeUtc,
            },
            arrival: {
              airport: arrAirport,
              name: flight.arrival?.airport?.name || "",
              time: arrTimeLocal || arrTimeUtc,
            },
          };
          console.log(
            `[AircraftStatus] Found in_flight by status "${flightStatus}" for ${registration}: ${flightNumber} from ${depAirport} to ${arrAirport} (dep: ${dep.toISOString()}, arr: ${arr.toISOString()}, now: ${now.toISOString()})`
          );
          break;
        }
      }

      // PRIORITÉ 2: Si aucun vol en cours trouvé par statut, chercher par comparaison d'heures
      if (!currentFlight || status !== "in_flight") {
        for (const flight of sortedFlights) {
          const depTimeUtc =
            flight.departure?.actualTime?.utc ||
            flight.departure?.revisedTime?.utc ||
            flight.departure?.scheduledTime?.utc;
          const arrTimeUtc =
            flight.arrival?.predictedTime?.utc ||
            flight.arrival?.actualTime?.utc ||
            flight.arrival?.revisedTime?.utc ||
            flight.arrival?.scheduledTime?.utc;
          const depTimeLocal =
            flight.departure?.actualTime?.local ||
            flight.departure?.revisedTime?.local ||
            flight.departure?.scheduledTime?.local;
          const arrTimeLocal =
            flight.arrival?.predictedTime?.local ||
            flight.arrival?.actualTime?.local ||
            flight.arrival?.revisedTime?.local ||
            flight.arrival?.scheduledTime?.local;
          const flightStatus = (flight.status || "").toLowerCase();

          if (depTimeUtc && arrTimeUtc) {
            const dep = new Date(depTimeUtc);
            const arr = new Date(arrTimeUtc);

            // Vol en cours par comparaison d'heures
            if (now >= dep && now < arr) {
              currentFlight = flight;
              status = "in_flight";
              const depAirport =
                flight.departure?.airport?.iata ||
                flight.departure?.airport?.icao ||
                "";
              const arrAirport =
                flight.arrival?.airport?.iata ||
                flight.arrival?.airport?.icao ||
                "";
              const flightNumber = flight.number || "";
              const hoursInFlight = Math.floor(
                (now.getTime() - dep.getTime()) / (1000 * 60 * 60)
              );
              const minutesInFlight = Math.floor(
                ((now.getTime() - dep.getTime()) % (1000 * 60 * 60)) /
                  (1000 * 60)
              );
              message = `In flight from ${depAirport} to ${arrAirport} since ${hoursInFlight}H${
                minutesInFlight > 0 ? " " + minutesInFlight + "m" : ""
              }`;
              location = `${depAirport} → ${arrAirport}`;
              flightInfo = {
                number: flightNumber,
                departure: {
                  airport: depAirport,
                  name: flight.departure?.airport?.name || "",
                  time: depTimeLocal || depTimeUtc,
                },
                arrival: {
                  airport: arrAirport,
                  name: flight.arrival?.airport?.name || "",
                  time: arrTimeLocal || arrTimeUtc,
                },
              };
              console.log(
                `[AircraftStatus] Found in_flight by time for ${registration}: ${flightNumber} from ${depAirport} to ${arrAirport}`
              );
              break;
            }

            // Vol terminé (arrivé) - prendre le plus récent
            if (now >= arr) {
              const currentArrTime =
                currentFlight?.arrival?.actualTime?.utc ||
                currentFlight?.arrival?.scheduledTime?.utc ||
                "";
              const currentArrDate = currentArrTime
                ? new Date(currentArrTime)
                : new Date(0);
              const thisArrDate = new Date(arrTimeUtc);

              if (!currentFlight || thisArrDate > currentArrDate) {
                currentFlight = flight;
                status = "on_ground";
                const arrAirport =
                  flight.arrival?.airport?.iata ||
                  flight.arrival?.airport?.icao ||
                  "";
                const arrAirportName = flight.arrival?.airport?.name || "";
                message = `On ground at ${arrAirport}${
                  arrAirportName ? " - " + arrAirportName : ""
                }`;
                location = arrAirport;
                flightInfo = {
                  number: flight.number || "",
                  arrival: {
                    airport: arrAirport,
                    name: arrAirportName,
                    time: arrTimeLocal || arrTimeUtc,
                  },
                };
                console.log(
                  `[AircraftStatus] Found on_ground status for ${registration}: ${arrAirport} (arrived at ${arrTimeUtc})`
                );
              }
            }

            // Vol futur (pas encore parti) - prendre le plus proche
            if (now < dep) {
              if (
                !currentFlight ||
                new Date(depTimeUtc) <
                  new Date(
                    currentFlight.departure?.actualTime?.utc ||
                      currentFlight.departure?.scheduledTime?.utc ||
                      Infinity
                  )
              ) {
                currentFlight = flight;
                status = "scheduled";
                const depAirport =
                  flight.departure?.airport?.iata ||
                  flight.departure?.airport?.icao ||
                  "";
                message = `Scheduled departure from ${depAirport}`;
                location = depAirport;
                flightInfo = {
                  number: flight.number || "",
                  departure: {
                    airport: depAirport,
                    name: flight.departure?.airport?.name || "",
                    time: depTimeLocal || depTimeUtc,
                  },
                };
              }
            }
          }
        }
      }

      // Si aucun vol en cours trouvé mais qu'on a des vols, chercher le dernier vol arrivé
      if (!currentFlight && sortedFlights.length > 0) {
        // Chercher le dernier vol qui est arrivé (arrival time <= now)
        const arrivedFlights = sortedFlights.filter((f) => {
          const arrTime =
            f.arrival?.actualTime?.utc || f.arrival?.scheduledTime?.utc;
          return arrTime && new Date(arrTime) <= now;
        });

        if (arrivedFlights.length > 0) {
          // Prendre le vol le plus récent qui est arrivé
          const lastArrivedFlight = arrivedFlights[0];
          const arrTimeUtc =
            lastArrivedFlight.arrival?.actualTime?.utc ||
            lastArrivedFlight.arrival?.scheduledTime?.utc;
          const arrTimeLocal =
            lastArrivedFlight.arrival?.actualTime?.local ||
            lastArrivedFlight.arrival?.scheduledTime?.local;
          if (arrTimeUtc) {
            status = "on_ground";
            const arrAirport =
              lastArrivedFlight.arrival?.airport?.iata ||
              lastArrivedFlight.arrival?.airport?.icao ||
              "";
            const arrAirportName =
              lastArrivedFlight.arrival?.airport?.name || "";
            message = `On ground at ${arrAirport}${
              arrAirportName ? " - " + arrAirportName : ""
            }`;
            location = arrAirport;
            flightInfo = {
              number: lastArrivedFlight.number || "",
              arrival: {
                airport: arrAirport,
                name: arrAirportName,
                time: arrTimeLocal || arrTimeUtc,
              },
            };
            currentFlight = lastArrivedFlight;
          }
        } else {
          // Aucun vol arrivé, chercher le prochain vol programmé
          const futureFlights = sortedFlights.filter((f) => {
            const depTime =
              f.departure?.actualTime?.utc || f.departure?.scheduledTime?.utc;
            return depTime && new Date(depTime) > now;
          });

          if (futureFlights.length > 0) {
            // Prendre le vol programmé le plus proche
            const nextFlight = futureFlights[futureFlights.length - 1]; // Le plus proche dans le futur
            const depTimeUtc =
              nextFlight.departure?.actualTime?.utc ||
              nextFlight.departure?.scheduledTime?.utc;
            const depTimeLocal =
              nextFlight.departure?.actualTime?.local ||
              nextFlight.departure?.scheduledTime?.local;
            if (depTimeUtc) {
              status = "scheduled";
              const depAirport =
                nextFlight.departure?.airport?.iata ||
                nextFlight.departure?.airport?.icao ||
                "";
              const depAirportName = nextFlight.departure?.airport?.name || "";
              message = `Scheduled departure from ${depAirport}${
                depAirportName ? " - " + depAirportName : ""
              }`;
              location = depAirport;
              flightInfo = {
                number: nextFlight.number || "",
                departure: {
                  airport: depAirport,
                  name: depAirportName,
                  time: depTimeLocal || depTimeUtc,
                },
              };
              currentFlight = nextFlight;
            }
          }
        }
      }

      // Si toujours rien, utiliser le statut par défaut
      if (!currentFlight && sortedFlights.length === 0) {
        status = "no_flights";
        message = "No flights scheduled for today";
      }

      // Si on a toujours pas de statut mais qu'on a des vols, déduire depuis le dernier vol
      if (status === "unknown" && sortedFlights.length > 0) {
        const lastFlight = sortedFlights[0]; // Le plus récent
        const arrTimeUtc =
          lastFlight.arrival?.actualTime?.utc ||
          lastFlight.arrival?.scheduledTime?.utc;
        const depTimeUtc =
          lastFlight.departure?.actualTime?.utc ||
          lastFlight.departure?.scheduledTime?.utc;

        if (arrTimeUtc && new Date(arrTimeUtc) <= now) {
          // Le dernier vol est arrivé, l'avion est au sol
          status = "on_ground";
          const arrAirport =
            lastFlight.arrival?.airport?.iata ||
            lastFlight.arrival?.airport?.icao ||
            "";
          const arrAirportName = lastFlight.arrival?.airport?.name || "";
          message = `On ground at ${arrAirport}${
            arrAirportName ? " - " + arrAirportName : ""
          }`;
          location = arrAirport;
          flightInfo = {
            number: lastFlight.number || "",
            arrival: {
              airport: arrAirport,
              name: arrAirportName,
              time:
                lastFlight.arrival?.actualTime?.local ||
                lastFlight.arrival?.scheduledTime?.local ||
                arrTimeUtc,
            },
          };
        } else if (depTimeUtc && new Date(depTimeUtc) > now) {
          // Le dernier vol est programmé, l'avion est au sol en attente
          status = "scheduled";
          const depAirport =
            lastFlight.departure?.airport?.iata ||
            lastFlight.departure?.airport?.icao ||
            "";
          const depAirportName = lastFlight.departure?.airport?.name || "";
          message = `Scheduled departure from ${depAirport}${
            depAirportName ? " - " + depAirportName : ""
          }`;
          location = depAirport;
          flightInfo = {
            number: lastFlight.number || "",
            departure: {
              airport: depAirport,
              name: depAirportName,
              time:
                lastFlight.departure?.actualTime?.local ||
                lastFlight.departure?.scheduledTime?.local ||
                depTimeUtc,
            },
          };
        }
      }

      // Simplifier les statuts : tout sauf "in_flight" devient "on_ground"
      const simplifiedStatus =
        status === "in_flight" ? "in_flight" : "on_ground";

      // Pour ON_GROUND, s'assurer qu'on a l'emplacement le plus récent
      // Si on n'a pas déjà un flightInfo ou si on a seulement un départ, chercher le plus récent
      if (
        simplifiedStatus === "on_ground" &&
        (!flightInfo || (flightInfo.departure && !flightInfo.arrival))
      ) {
        let mostRecentFlight: any = null;
        let mostRecentTime: Date = new Date(0);
        let bestFlightInfo: any = null;
        let bestLocation = location;
        let bestMessage = message;

        // Parcourir tous les vols pour trouver le plus récent (arrivée prioritaire, puis départ)
        for (const flight of sortedFlights) {
          const arrTimeUtc =
            flight.arrival?.actualTime?.utc ||
            flight.arrival?.scheduledTime?.utc;
          const depTimeUtc =
            flight.departure?.actualTime?.utc ||
            flight.departure?.scheduledTime?.utc;

          // Prioriser l'arrivée si elle existe
          if (arrTimeUtc) {
            const arrTime = new Date(arrTimeUtc);
            if (arrTime > mostRecentTime) {
              mostRecentTime = arrTime;
              mostRecentFlight = flight;
              const arrAirport =
                flight.arrival?.airport?.iata ||
                flight.arrival?.airport?.icao ||
                "";
              const arrAirportName = flight.arrival?.airport?.name || "";
              const arrTimeLocal =
                flight.arrival?.actualTime?.local ||
                flight.arrival?.scheduledTime?.local;

              bestLocation = arrAirport;
              bestMessage = `On ground at ${arrAirport}${
                arrAirportName ? " - " + arrAirportName : ""
              }`;
              bestFlightInfo = {
                number: flight.number || "",
                arrival: {
                  airport: arrAirport,
                  name: arrAirportName,
                  time: arrTimeLocal || arrTimeUtc,
                },
              };
            }
          }
          // Sinon, utiliser le départ si c'est plus récent et qu'on n'a pas d'arrivée
          else if (depTimeUtc && !mostRecentFlight) {
            const depTime = new Date(depTimeUtc);
            if (depTime > mostRecentTime) {
              mostRecentTime = depTime;
              mostRecentFlight = flight;
              const depAirport =
                flight.departure?.airport?.iata ||
                flight.departure?.airport?.icao ||
                "";
              const depAirportName = flight.departure?.airport?.name || "";
              const depTimeLocal =
                flight.departure?.actualTime?.local ||
                flight.departure?.scheduledTime?.local;

              bestLocation = depAirport;
              bestMessage = `On ground at ${depAirport}${
                depAirportName ? " - " + depAirportName : ""
              }`;
              bestFlightInfo = {
                number: flight.number || "",
                departure: {
                  airport: depAirport,
                  name: depAirportName,
                  time: depTimeLocal || depTimeUtc,
                },
              };
            }
          }
        }

        // Utiliser le meilleur résultat trouvé
        if (bestFlightInfo) {
          flightInfo = bestFlightInfo;
          location = bestLocation;
          message = bestMessage;
        }
      }

      const result = {
        registration,
        date: todayDate,
        status: simplifiedStatus,
        message,
        location,
        flightInfo,
        allFlights: sortedFlights.slice(0, 10), // Limiter à 10 vols pour la réponse
      };

      // Mettre en cache (TTL de 30 minutes)
      await setCache(cacheKey, JSON.stringify(result), 1800);

      return NextResponse.json(result, {
        headers: {
          "X-Cache": "MISS",
          "Cache-Control": "public, max-age=1800, s-maxage=1800",
        },
      });
    } catch (error: any) {
      console.error("[AircraftStatus] Error:", error);
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 }
      );
    }
  }
);
