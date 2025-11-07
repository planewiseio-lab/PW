import { NextRequest, NextResponse } from "next/server";
import {
  correctFlightStatus,
  logStatusCorrection,
} from "@/lib/flightStatusRules";
import { withFlightBrowseAccess } from "@/lib/withActionAccess";
import { getCache as getSupabaseCache, setCache as setSupabaseCache } from "@/lib/supabaseCache";

const AERODATABOX_API_KEY =
  process.env.API_MARKET_KEY || process.env.AERODATABOX_API_KEY;
const AERODATABOX_BASE_URL = process.env.API_MARKET_BASE_URL || "https://prod.api.market/api/v1/aedbx/aerodatabox";

// Cache Supabase persistant (partagé entre toutes les instances serverless)
// Utilise PostgreSQL au lieu d'un Map en mémoire pour fonctionner en serverless
const pendingRequests = new Map<string, Promise<any>>();

// Fonction de cache Supabase (asynchrone)
async function getCache(key: string): Promise<string | null> {
  const cached = await getSupabaseCache(key);
  if (cached) {
    console.log(`[FlightAPI] Cache HIT from Supabase for ${key}`);
    return cached;
  }
  return null;
}

async function setCache(key: string, data: string, ttlSeconds: number): Promise<void> {
  await setSupabaseCache(key, data, ttlSeconds);
  console.log(`[FlightAPI] Cache SET in Supabase for ${key} (TTL: ${ttlSeconds}s)`);
}

// Fonction de calcul de distance Haversine
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fonction pour obtenir l'offset UTC d'un timezone
function getTimezoneOffset(timezone: string): number {
  // Mapping des timezones courants vers leurs offsets UTC (en heures)
  const timezoneOffsets: { [key: string]: number } = {
    // Amérique du Nord
    "America/New_York": -5, // EST/EDT
    "America/Chicago": -6, // CST/CDT
    "America/Denver": -7, // MST/MDT
    "America/Los_Angeles": -8, // PST/PDT
    "America/Toronto": -5, // EST/EDT
    "America/Vancouver": -8, // PST/PDT
    "America/Edmonton": -7, // MST/MDT (Calgary)
    "America/Montreal": -5, // EST/EDT

    // Europe
    "Europe/London": 0, // GMT/BST
    "Europe/Paris": 1, // CET/CEST
    "Europe/Frankfurt": 1, // CET/CEST
    "Europe/Rome": 1, // CET/CEST
    "Europe/Madrid": 1, // CET/CEST

    // Asie
    "Asia/Tokyo": 9, // JST
    "Asia/Shanghai": 8, // CST
    "Asia/Hong_Kong": 8, // HKT
    "Asia/Singapore": 8, // SGT

    // Australie
    "Australia/Sydney": 10, // AEST/AEDT
    "Australia/Melbourne": 10, // AEST/AEDT

    // UTC
    UTC: 0,
  };

  return timezoneOffsets[timezone] || 0; // Default to UTC si timezone inconnu
}

// Fonction pour appeler AeroDataBox avec timeout et déduplication
async function callAero(
  path: string
): Promise<{ ok: boolean; status: number; text: string; url: string }> {
  // api.market REST API - selon documentation: https://docs.api.market
  // Base URL: https://prod.api.market/api/v1
  // Authentication: x-magicapi-key header
  
  // Structure 1: URL REST api.market officielle (prod.api.market/api/v1/{workspace}/{product})
  const url1 = `https://prod.api.market/api/v1/aedbx/aerodatabox${path}`;
  
  // Structure 2: URL api.market sans prod (fallback)
  const url2 = `https://api.market/api/v1/aedbx/aerodatabox${path}`;
  
  // Structure 3: URL api.market alternative (sans /v1)
  const url3 = `https://api.market/api/aedbx/aerodatabox${path}`;
  
  // Structure 4: URL api.market directe (structure simplifiée)
  const url4 = `https://api.market/aedbx/aerodatabox${path}`;
  
  const urlsToTry = [url1, url2, url3, url4];
  
  // Utiliser la première URL comme clé de déduplication
  const dedupKey = url1;
  if (pendingRequests.has(dedupKey)) {
    return pendingRequests.get(dedupKey);
  }

  const requestPromise = (async () => {
    const startTime = Date.now();
    
    // Essayer chaque URL jusqu'à trouver une qui fonctionne
    for (const url of urlsToTry) {
      try {
        // Timeout de 15 secondes
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "x-magicapi-key": AERODATABOX_API_KEY!, // api.market REST API header (selon documentation)
            "x-api-market-key": AERODATABOX_API_KEY!, // Compatibilité MCP
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const text = await response.text();

        // Logger la requête API (seulement pour la première tentative)
        // Ne pas tracker les réponses 204 (No Content) car elles ne consomment pas d'appel API
        if (url === url1 && response.status !== 204) {
          const responseTime = Date.now() - startTime;
          const { logApiRequest } = await import("@/lib/apiTracker");

          // Récupérer l'utilisateur pour le logging
          const { createClient } = await import("@/lib/supabase/server");
          const supabase = await createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          await logApiRequest(
            path,
            "GET",
            response.status,
            responseTime,
            user?.id || null
          );
        }

        // Si succès, retourner immédiatement
        if (response.ok) {
          return {
            ok: response.ok,
            status: response.status,
            text,
            url,
          };
        }

        // Si erreur 401/403, essayer la prochaine URL
        if (response.status === 401 || response.status === 403) {
          console.log(`[callAero flights] Auth error (${response.status}) with ${url}, trying next...`);
          continue;
        }

        // Pour les autres erreurs (429, 500, etc.), retourner quand même
        return {
          ok: response.ok,
          status: response.status,
          text,
          url,
        };
      } catch (error: any) {
        // Si erreur réseau ou timeout, essayer la prochaine URL
        if (error.name === "AbortError") {
          console.log(`[callAero flights] Timeout with ${url}, trying next...`);
          if (url === urlsToTry[urlsToTry.length - 1]) {
            // Dernière URL, retourner l'erreur timeout
            return {
              ok: false,
              status: 408,
              text: JSON.stringify({ error: "Request timeout" }),
              url,
            };
          }
          continue;
        }
        console.log(`[callAero flights] Network error with ${url}: ${error.message}, trying next...`);
        if (url === urlsToTry[urlsToTry.length - 1]) {
          // Dernière URL, retourner l'erreur
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
    
    // Si toutes les URLs ont échoué
    return {
      ok: false,
      status: 502,
      text: JSON.stringify({ error: "All API endpoints failed" }),
      url: urlsToTry[0],
    };
  })();

  pendingRequests.set(dedupKey, requestPromise);

  // Nettoyer après completion
  requestPromise.finally(() => {
    pendingRequests.delete(dedupKey);
  });

  return requestPromise;
}

export const GET = withFlightBrowseAccess(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ flight: string }> }
  ) => {
    try {
      if (!AERODATABOX_API_KEY) {
        return NextResponse.json(
          { error: "AeroDataBox API key not configured" },
          { status: 500 }
        );
      }

      const { flight } = await params;
      const { searchParams: urlSearchParams } = new URL(request.url);
      const dateLocal =
        urlSearchParams.get("dateLocal") || urlSearchParams.get("date");

      // Validation stricte du numéro de vol (supprimer les espaces)
      const numberRaw = String(flight).trim().toUpperCase().replace(/\s+/g, "");
      if (!/^[A-Z0-9]{1,3}\d{1,4}$/.test(numberRaw)) {
        return NextResponse.json(
          { error: "Invalid flight number format. Use format like AC123" },
          { status: 400 }
        );
      }

      // Validation de la date si fournie
      if (dateLocal && !/^\d{4}-\d{2}-\d{2}$/.test(dateLocal)) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }

      // Clé de cache optimisée (sans timestamp pour permettre le cache)
      const now = new Date();
      const requestedDate = dateLocal ? new Date(dateLocal) : now;
      const isHistoricalDate = dateLocal && requestedDate < now;
      const isOlderThan24h = isHistoricalDate && (now.getTime() - requestedDate.getTime()) > 24 * 60 * 60 * 1000;
      const cacheKey = `flight:${numberRaw}:${dateLocal || "today"}`;

      // Vérifier le cache Supabase persistant (partagé entre toutes les instances serverless)
      const cached = await getCache(cacheKey);
      if (cached) {
        try {
          let cachedPayload = JSON.parse(cached);
          
          // Si le cache contient un tableau brut (format API externe), l'ignorer et refaire la normalisation
          if (Array.isArray(cachedPayload)) {
            console.log(`[FlightAPI] Cache contains raw array format, ignoring and calling API to normalize`);
            cachedPayload = null; // Forcer un nouvel appel API
          }
          
          // Si cachedPayload est null après vérification, continuer avec l'appel API
          if (!cachedPayload) {
            // Continue to API call below
          } else if (cachedPayload && cachedPayload.__pending === true) {
            console.log(`[FlightAPI] Request already in progress for ${cacheKey}, waiting...`);
            // Attendre que la requête en cours se termine (max 5 secondes)
            for (let i = 0; i < 50; i++) {
              await new Promise(resolve => setTimeout(resolve, 100));
              const retryCache = await getCache(cacheKey);
              if (retryCache) {
                const retryPayload = JSON.parse(retryCache);
                // Si c'est toujours en pending après 5s, continuer quand même
                if (retryPayload.__pending !== true || i >= 49) {
                  if (retryPayload.__pending !== true) {
                    // Le résultat est maintenant disponible, l'utiliser
                    const hasFlightsArray = Array.isArray(retryPayload.flights);
                    const isEmptyFlightsArray = hasFlightsArray && retryPayload.flights.length === 0;
                    const hasValidFlightData = retryPayload && (
                      retryPayload.airline || 
                      retryPayload.departure || 
                      retryPayload.arrival ||
                      (hasFlightsArray && retryPayload.flights.length > 0)
                    );
                    
                    if (hasValidFlightData && !isEmptyFlightsArray) {
                      console.log(`[FlightAPI] Cache HIT (after waiting) for ${cacheKey}`);
                      const response = NextResponse.json(retryPayload);
                      response.headers.set("X-Cache", "HIT");
                      const cachedRequestedDate = dateLocal ? new Date(dateLocal) : new Date();
                      const cachedIsOlderThan24h = dateLocal && (now.getTime() - cachedRequestedDate.getTime()) > 24 * 60 * 60 * 1000;
                      const cachedTtlSeconds = cachedIsOlderThan24h ? 7 * 24 * 60 * 60 : 30 * 60;
                      response.headers.set("Cache-Control", `public, max-age=${cachedTtlSeconds}, s-maxage=${cachedTtlSeconds}`);
                      return response;
                    }
                  }
                  break;
                }
              }
            }
            // Si on arrive ici, on continue avec l'appel API (timeout ou résultat invalide)
          } else if (cachedPayload) {
            // Ne pas utiliser le cache si c'est une réponse vide (flights: [] ou tableau vide)
            // Vérifier si c'est un payload valide avec des données de vol (airline, departure, etc.)
            const hasFlightsArray = Array.isArray(cachedPayload.flights);
            const isEmptyFlightsArray = hasFlightsArray && cachedPayload.flights.length === 0;
            const hasValidFlightData = cachedPayload && (
              cachedPayload.airline || 
              cachedPayload.departure || 
              cachedPayload.arrival ||
              (hasFlightsArray && cachedPayload.flights.length > 0)
            );
            
            // Utiliser le cache seulement si c'est un payload valide (pas une réponse vide)
            if (hasValidFlightData && !isEmptyFlightsArray) {
              console.log(`[FlightAPI] Cache HIT for ${cacheKey}`, {
                hasNumber: !!cachedPayload.number,
                hasAirline: !!cachedPayload.airline,
                hasDeparture: !!cachedPayload.departure,
                hasArrival: !!cachedPayload.arrival,
              });
              const response = NextResponse.json(cachedPayload);
              response.headers.set("X-Cache", "HIT");
              // Déterminer le TTL du cache HIT en fonction de l'âge du vol
              const cachedRequestedDate = dateLocal ? new Date(dateLocal) : new Date();
              const cachedIsOlderThan24h = dateLocal && (now.getTime() - cachedRequestedDate.getTime()) > 24 * 60 * 60 * 1000;
              const cachedTtlSeconds = cachedIsOlderThan24h ? 7 * 24 * 60 * 60 : 30 * 60;
              response.headers.set("Cache-Control", `public, max-age=${cachedTtlSeconds}, s-maxage=${cachedTtlSeconds}`);
              return response;
            } else {
              console.log(`[FlightAPI] Cache contains empty response (flights: [] or no valid data), ignoring cache and calling API`, {
                hasFlightsArray,
                isEmptyFlightsArray,
                hasValidFlightData,
                cachedPayloadKeys: cachedPayload ? Object.keys(cachedPayload) : [],
              });
            }
          }
        } catch (e) {
          console.log(`[FlightAPI] Failed to parse cached response, ignoring cache:`, e);
        }
      }

      // Si pas de cache, mettre un placeholder de déduplication pour éviter les appels dupliqués
      const lockKey = `${cacheKey}:__lock`;
      const existingLock = await getCache(lockKey);
      if (!existingLock) {
        // Mettre un placeholder de déduplication (TTL court : 5 secondes)
        await setCache(lockKey, JSON.stringify({ __pending: true }), 5);
        console.log(`[FlightAPI] Set deduplication lock for ${cacheKey}`);
      } else {
        console.log(`[FlightAPI] Another request is already processing ${cacheKey}, will wait and retry cache`);
        // Attendre un peu et réessayer le cache
        await new Promise(resolve => setTimeout(resolve, 200));
        const retryCache = await getCache(cacheKey);
        if (retryCache) {
          const retryPayload = JSON.parse(retryCache);
          if (retryPayload.__pending !== true) {
            const hasFlightsArray = Array.isArray(retryPayload.flights);
            const isEmptyFlightsArray = hasFlightsArray && retryPayload.flights.length === 0;
            const hasValidFlightData = retryPayload && (
              retryPayload.airline || 
              retryPayload.departure || 
              retryPayload.arrival ||
              (hasFlightsArray && retryPayload.flights.length > 0)
            );
            
            if (hasValidFlightData && !isEmptyFlightsArray) {
              console.log(`[FlightAPI] Cache HIT (after lock wait) for ${cacheKey}`);
              const response = NextResponse.json(retryPayload);
              response.headers.set("X-Cache", "HIT");
              const cachedRequestedDate = dateLocal ? new Date(dateLocal) : new Date();
              const cachedIsOlderThan24h = dateLocal && (now.getTime() - cachedRequestedDate.getTime()) > 24 * 60 * 60 * 1000;
              const cachedTtlSeconds = cachedIsOlderThan24h ? 7 * 24 * 60 * 60 : 30 * 60;
              response.headers.set("Cache-Control", `public, max-age=${cachedTtlSeconds}, s-maxage=${cachedTtlSeconds}`);
              return response;
            }
          }
        }
      }

      console.log(`[FlightAPI] Cache MISS for ${cacheKey} - calling API`);

      // SOLUTION OPTIMALE: Une seule requête à AeroDataBox avec le numéro exact
      // Ne pas générer de variations car L et I sont des lettres différentes
      let candidates: string[] = [];

      if (dateLocal) {
        // Essayer d'abord avec la date exacte
        candidates.push(
          `/flights/number/${encodeURIComponent(
            numberRaw
          )}/${encodeURIComponent(
            dateLocal
          )}?withLocation=true&withCodeshared=true&withCancelled=true&limit=25`
        );
        
        // Si aucune variation ne fonctionne avec la date, essayer sans date
        // (pour récupérer le vol le plus récent disponible)
        candidates.push(
          `/flights/number/${encodeURIComponent(
            numberRaw
          )}?withLocation=true&withCodeshared=true&withCancelled=true&limit=25`
        );
      } else {
        // Essayer sans date
        candidates.push(
          `/flights/number/${encodeURIComponent(
            numberRaw
          )}?withLocation=true&withCodeshared=true&withCancelled=true&limit=25`
        );
      }

      // Collecter TOUS les résultats de tous les candidats pour filtrer ensuite
      const allFlights: any[] = [];
      let foundExactMatch = false; // Flag pour arrêter si on trouve un vol avec la date exacte

      for (const pathPart of candidates) {
        // Si on a déjà trouvé un vol avec la date exacte, arrêter la recherche
        if (foundExactMatch && dateLocal) {
          console.log(`[FlightAPI] Exact match found, skipping remaining variations`);
          break;
        }

        const resp = await callAero(pathPart);
        console.log(`[AeroDataBox] ${resp.status} ${resp.url}`);

        // Si 204 (pas de contenu), continuer sans erreur et sans parser
        if (resp.status === 204) {
          console.log(`[FlightAPI] No content (204) for ${pathPart}, continuing`);
          continue;
        }

        // Si 5xx, arrêter
        if (resp.status >= 500) {
          return NextResponse.json(
            { error: "AeroDataBox server error" },
            { status: resp.status }
          );
        }

        if (resp.ok) {
          try {
            // Vérifier que resp.text n'est pas vide avant de parser
            if (!resp.text || resp.text.trim().length === 0) {
              console.log(`[FlightAPI] Empty response body for ${pathPart}`);
              continue;
            }
            const data = JSON.parse(resp.text);
            const flights = Array.isArray(data)
              ? data
              : Array.isArray(data?.data)
              ? data.data
              : [];
            console.log(
              `[FlightAPI] Found ${flights.length} flights from ${pathPart}`
            );
            
            // Si on a une date et qu'on trouve un vol, vérifier si c'est un match exact
            if (dateLocal && flights.length > 0) {
              const exactMatch = flights.find((flight: any) => {
                const depLocalTime =
                  flight.departure?.scheduledTime?.local ||
                  flight.departure?.revisedTime?.local ||
                  flight.dep?.scheduledTime?.local ||
                  flight.dep?.revisedTime?.local;
                if (!depLocalTime) return false;
                const depLocalDate = depLocalTime.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
                return depLocalDate === dateLocal;
              });
              
              if (exactMatch) {
                foundExactMatch = true;
                console.log(`[FlightAPI] ✅ Found exact date match from ${pathPart}`);
              }
            }
            
            allFlights.push(...flights);
            
            // Si on a trouvé des vols et qu'on n'a pas de date spécifique, arrêter
            if (!dateLocal && allFlights.length > 0) {
              console.log(`[FlightAPI] Found flights without date filter, stopping search`);
              break;
            }
          } catch (e) {
            console.log(
              `[FlightAPI] Failed to parse response from ${pathPart}: ${e}`
            );
            // Continuer même si le parsing échoue (peut être une réponse vide)
            continue;
          }
        }
      }

      if (allFlights.length === 0) {
        // Retourner un payload vide 200 plutôt qu'un 404 pour éviter erreurs UI
        console.log(`[FlightAPI] No flights found for ${numberRaw} on ${dateLocal || "today"}`);
        return NextResponse.json({ number: numberRaw, flights: [] });
      }

      // Utiliser les vols collectés
      const flights = allFlights;

      // Trouver le bon avion en filtrant par date et en évitant les vols codeshare incorrects
      let f = flights[0];

      // Log détaillé pour débugger
      console.log(
        `[FlightAPI] Processing ${flights.length} flights for ${numberRaw} on ${
          dateLocal || "today"
        }`
      );
      flights.forEach((flight: any, idx: number) => {
        // Essayer différentes structures possibles pour l'immatriculation
        const reg =
          flight.aircraft?.registration ||
          flight.aircraft?.reg ||
          flight.aircraft?.aircraft?.registration ||
          flight.aircraft?.aircraft?.reg ||
          flight.aircraft?.aircraftRegistration ||
          "Unknown";
        const codeshare =
          flight.codeshare?.airlineIata ||
          flight.codeshare?.airline?.iata ||
          flight.codeshare?.airlineIataCode ||
          "None";
        console.log(
          `[FlightAPI] Flight ${idx}: reg=${reg}, codeshare=${codeshare}, airline=${
            flight.airline?.name || "Unknown"
          }`
        );
        console.log(
          `[FlightAPI] Flight ${idx} aircraft structure:`,
          JSON.stringify(flight.aircraft, null, 2)
        );
      });

      // Si on a une date spécifique, filtrer par date locale de départ
      if (dateLocal) {
        // Filtrer les vols pour trouver celui qui correspond à la date locale demandée
        const matchingFlight = flights.find((flight: any) => {
          // Extraire la date locale de départ
          const depLocalTime =
            flight.departure?.scheduledTime?.local ||
            flight.departure?.revisedTime?.local ||
            flight.dep?.scheduledTime?.local ||
            flight.dep?.revisedTime?.local;

          if (!depLocalTime) return false;

          // Extraire juste la date (sans heure)
          // Format: "2025-10-23 17:35+09:00" -> "2025-10-23"
          const depLocalDate = depLocalTime.match(/^\d{4}-\d{2}-\d{2}/)?.[0];

          if (!depLocalDate) return false;

          console.log(
            `[FlightAPI] Comparing: requested=${dateLocal}, flight=${depLocalDate}`
          );

          return depLocalDate === dateLocal;
        });

        if (matchingFlight) {
          f = matchingFlight;
          console.log(
            `[FlightAPI] ✅ Found flight matching date ${dateLocal}: reg=${f.aircraft?.reg}`
          );
        } else {
          // Si aucun vol ne correspond à la date exacte, utiliser le premier vol disponible
          // (c'est souvent le cas pour les dates futures où l'API retourne le vol le plus récent)
          console.log(
            `[FlightAPI] ⚠️ No flight matches date ${dateLocal}, using first result`
          );
          flights.forEach((flight: any, idx: number) => {
            const depLocalTime =
              flight.departure?.scheduledTime?.local ||
              flight.departure?.revisedTime?.local ||
              flight.dep?.scheduledTime?.local ||
              flight.dep?.revisedTime?.local;
            const depLocalDate = depLocalTime?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || depLocalTime?.split("T")[0] || "Unknown";
            const reg = flight.aircraft?.reg || flight.aircraft?.registration || "Unknown";
            console.log(
              `[FlightAPI] Flight ${idx}: date=${depLocalDate}, reg=${reg}`
            );
          });
          // Utiliser le premier vol même si la date ne correspond pas exactement
          // (utile pour les dates futures ou les vols récurrents)
          f = flights[0];
          console.log(
            `[FlightAPI] Using first available flight: reg=${f.aircraft?.reg || f.aircraft?.registration}`
          );
        }
      }

      // Log de la structure complète du vol sélectionné pour débugger
      console.log(
        `[FlightAPI] Selected flight complete structure:`,
        JSON.stringify(f, null, 2)
      );

      // Récupérer les aéroports et coordonnées
      const depAp = f?.departure?.airport || f?.dep?.airport || {};
      const arrAp = f?.arrival?.airport || f?.arr?.airport || {};
      const dlat = depAp.location?.lat ?? depAp.latitude;
      const dlon = depAp.location?.lon ?? depAp.longitude;
      const alat = arrAp.location?.lat ?? arrAp.latitude;
      const alon = arrAp.location?.lon ?? arrAp.longitude;

      // Calculer la distance si les coordonnées sont disponibles
      const distanceKm = [dlat, dlon, alat, alon].every(
        (v) => typeof v === "number"
      )
        ? Math.round(haversineKm(dlat, dlon, alat, alon))
        : Math.round(f?.greatCircleDistance?.km || 0);

      // Logique métier : Corriger les statuts obsolètes
      let correctedStatus = f?.status || "Unknown";
      // Utiliser les règles centralisées pour corriger le statut
      // Utiliser revisedTime ou predictedTime comme estimatedTime pour la correction
      const estimatedArrivalTime = 
        f?.arrival?.predictedTime?.local ||
        f?.arrival?.revisedTime?.local ||
        f?.arrival?.estimatedTime?.local;
      
      const flightData = {
        status: correctedStatus,
        departure: {
          scheduledTime: f?.departure?.scheduledTime?.local,
          actualTime: f?.departure?.revisedTime?.local || f?.departure?.actualTime?.local,
        },
        arrival: {
          scheduledTime: f?.arrival?.scheduledTime?.local,
          estimatedTime: estimatedArrivalTime,
          actualTime: f?.arrival?.revisedTime?.local || f?.arrival?.actualTime?.local,
        },
      };

      const correctedFlight = correctFlightStatus(flightData);
      if (correctedFlight.status !== correctedStatus) {
        const now = new Date();
        const departureTime =
          f?.departure?.actualTime?.local || f?.departure?.scheduledTime?.local;
        const hoursDiff = departureTime
          ? (now.getTime() - new Date(departureTime).getTime()) /
            (1000 * 60 * 60)
          : 0;

        logStatusCorrection(correctedStatus, numberRaw, hoursDiff);
        correctedStatus = correctedFlight.status;
      }

      // Note: Les règles de statut sont maintenant gérées par la fonction centralisée correctFlightStatus

      // Normalisation des données (structure stable)
      const payload = {
        number: f?.number || numberRaw,
        airline: {
          name: f?.airline?.name || f?.airline?.icao || "Unknown Airline",
          iata: f?.airline?.iata || "",
          icao: f?.airline?.icao || "",
        },
        aircraft: {
          model: f?.aircraft?.model || f?.model || "Unknown Aircraft",
          registration: f?.aircraft?.reg || "Not available",
        },
        departure: {
          airport: {
            iata: depAp.iata || depAp.icao || depAp.code || "",
            name: depAp.name || depAp.municipalityName || depAp.city || "",
            city: depAp.city || depAp.municipalityName || "",
            latitude: dlat || null,
            longitude: dlon || null,
          },
          terminal: f?.departure?.terminal || null,
          gate: f?.departure?.gate || null,
          scheduledTimeLocal: f?.departure?.scheduledTime?.local || "",
          actualTimeLocal:
            f?.departure?.revisedTime?.local ||
            f?.departure?.actualTime?.local ||
            "",
          estimatedTimeLocal: f?.departure?.estimatedTime?.local || "",
          runwayTime: f?.departure?.runwayTime?.local || null,
        },
        arrival: {
          airport: {
            iata: arrAp.iata || arrAp.icao || arrAp.code || "",
            name: arrAp.name || arrAp.municipalityName || arrAp.city || "",
            city: arrAp.city || arrAp.municipalityName || "",
            latitude: alat || null,
            longitude: alon || null,
          },
          terminal: f?.arrival?.terminal || null,
          gate: f?.arrival?.gate || null,
          scheduledTimeLocal: f?.arrival?.scheduledTime?.local || "",
          actualTimeLocal:
            f?.arrival?.revisedTime?.local ||
            f?.arrival?.actualTime?.local ||
            "",
          estimatedTimeLocal:
            f?.arrival?.predictedTime?.local ||
            f?.arrival?.estimatedTime?.local ||
            "",
          runwayTime: f?.arrival?.runwayTime?.local || null,
        },
        status: correctedStatus,
        distance: distanceKm || null,
        codeshares: f?.codeshares || [],
        lastUpdated: f?.lastUpdatedUtc || new Date().toISOString(),
      };

      const textOut = JSON.stringify(payload);
      
      // Vérifier que le payload est bien un objet normalisé (pas un tableau)
      if (Array.isArray(payload)) {
        console.error(`[FlightAPI] ERROR: Payload is an array instead of normalized object! This should not happen.`);
        // Ne pas mettre en cache un tableau
        const response = NextResponse.json(payload);
        response.headers.set("X-Cache", "MISS");
        return response;
      }

      // Ne pas mettre en cache les réponses vides (pas de données de vol valides)
      const hasValidData = payload && (
        payload.airline || 
        payload.departure || 
        payload.arrival
      );

      // Cache optimisé avec TTL adaptatif (en secondes pour Supabase cache)
      // Vol plus vieux de 24h → 7 jours, sinon → 30min
      const ttlSeconds = isOlderThan24h 
        ? 7 * 24 * 60 * 60  // 7 jours pour les vols plus vieux de 24h
        : 30 * 60;           // 30min pour les vols futurs ou récents (< 24h)
      
      // Ne mettre en cache que si on a des données valides
      if (hasValidData) {
        console.log(`[FlightAPI] Caching normalized payload for ${cacheKey}`, {
          hasNumber: !!payload.number,
          hasAirline: !!payload.airline,
          hasDeparture: !!payload.departure,
          hasArrival: !!payload.arrival,
          payloadType: typeof payload,
          isArray: Array.isArray(payload),
        });
        await setCache(cacheKey, textOut, ttlSeconds);
        console.log(`[FlightAPI] Cached flight data for ${cacheKey} (TTL: ${ttlSeconds}s)`);
        
        // Retirer le verrou de déduplication maintenant que le résultat est en cache
        const lockKey = `${cacheKey}:__lock`;
        try {
          // Supprimer le verrou en mettant une valeur expirée (TTL 0)
          await setSupabaseCache(lockKey, "", 0);
          console.log(`[FlightAPI] Removed deduplication lock for ${cacheKey}`);
        } catch (e) {
          // Ignorer les erreurs de suppression du verrou (non critique)
          console.log(`[FlightAPI] Failed to remove lock (non-critical):`, e);
        }
      } else {
        console.log(`[FlightAPI] Not caching empty response for ${cacheKey}`);
        
        // Retirer quand même le verrou même si on ne cache pas
        const lockKey = `${cacheKey}:__lock`;
        try {
          await setSupabaseCache(lockKey, "", 0);
        } catch (e) {
          // Ignorer
        }
      }

      const response = NextResponse.json(payload);
      response.headers.set(
        "Cache-Control",
        `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}` // TTL adaptatif: 7 jours pour vols > 24h, 30min pour vols futurs/récents
      );
      response.headers.set("X-Cache", "MISS");

      return response;
    } catch (error) {
      console.error("Flight API error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);
