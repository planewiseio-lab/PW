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
        if (url === url1) {
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
      const isHistoricalDate = dateLocal && new Date(dateLocal) < new Date();
      const cacheKey = `flight:${numberRaw}:${dateLocal || "today"}`;

      // Vérifier le cache Supabase persistant (partagé entre toutes les instances serverless)
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log(`[FlightAPI] Cache HIT for ${cacheKey}`);
        const response = NextResponse.json(JSON.parse(cached));
        response.headers.set("X-Cache", "HIT");
        response.headers.set("Cache-Control", "public, max-age=300, s-maxage=300"); // 5 minutes
        return response;
      }

      console.log(`[FlightAPI] Cache MISS for ${cacheKey} - calling API`);

      // SOLUTION OPTIMALE: Une seule requête à AeroDataBox
      let candidates: string[] = [];

      if (dateLocal) {
        candidates = [
          `/flights/number/${encodeURIComponent(
            numberRaw
          )}/${encodeURIComponent(
            dateLocal
          )}?withLocation=true&withCodeshared=true&withCancelled=true&limit=25`,
        ];
      } else {
        candidates = [
          `/flights/number/${encodeURIComponent(
            numberRaw
          )}?withLocation=true&withCodeshared=true&withCancelled=true&limit=25`,
        ];
      }

      // Collecter TOUS les résultats de tous les candidats pour filtrer ensuite
      const allFlights: any[] = [];

      for (const pathPart of candidates) {
        const resp = await callAero(pathPart);
        console.log(`[AeroDataBox] ${resp.status} ${resp.url}`);

        if (resp.ok) {
          try {
            const data = JSON.parse(resp.text);
            const flights = Array.isArray(data)
              ? data
              : Array.isArray(data?.data)
              ? data.data
              : [];
            console.log(
              `[FlightAPI] Found ${flights.length} flights from ${pathPart}`
            );
            allFlights.push(...flights);
          } catch (e) {
            console.log(
              `[FlightAPI] Failed to parse response from ${pathPart}: ${e}`
            );
          }
        }

        // Si 5xx, arrêter
        if (resp.status >= 500) {
          return NextResponse.json(
            { error: "AeroDataBox server error" },
            { status: resp.status }
          );
        }

        // Si 204 (pas de contenu), continuer sans erreur
        if (resp.status === 204) {
          continue;
        }
      }

      if (allFlights.length === 0) {
        // Retourner un payload vide 200 plutôt qu'un 404 pour éviter erreurs UI
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
          // Si aucun vol ne correspond à la date exacte, logger et prendre le premier
          console.log(
            `[FlightAPI] ⚠️ No flight matches date ${dateLocal}, using first result`
          );
          flights.forEach((flight: any, idx: number) => {
            const depLocalTime =
              flight.departure?.scheduledTime?.local ||
              flight.dep?.scheduledTime?.local;
            const depLocalDate = depLocalTime?.split("T")[0] || "Unknown";
            const reg = flight.aircraft?.reg || "Unknown";
            console.log(
              `[FlightAPI] Flight ${idx}: date=${depLocalDate}, reg=${reg}`
            );
          });
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

      // Cache optimisé avec TTL adaptatif (en secondes pour Supabase cache)
      const ttlSeconds = isHistoricalDate ? 10 * 60 : 2 * 60; // 10min pour historique, 2min pour futur (en secondes)
      await setCache(cacheKey, textOut, ttlSeconds);

      const response = NextResponse.json(payload);
      response.headers.set(
        "Cache-Control",
        `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}` // Ajouter s-maxage pour permettre le bfcache
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
