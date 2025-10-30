import { NextRequest, NextResponse } from "next/server";
import {
  correctFlightStatus,
  logStatusCorrection,
} from "@/lib/flightStatusRules";
import { withFlightBrowseAccess } from "@/lib/withActionAccess";

const AERODATABOX_API_KEY =
  process.env.AERODATABOX_API_KEY || process.env.RAPID_KEY;
const AERODATABOX_BASE_URL = "https://aerodatabox.p.rapidapi.com";

// Cache optimisé avec TTL et nettoyage automatique
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const pendingRequests = new Map<string, Promise<any>>();

// Nettoyer le cache toutes les 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > value.ttl) {
      cache.delete(key);
    }
  }
}, 10 * 60 * 1000);

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

// Fonction de cache
function getCache(key: string): string | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: string, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

// Fonction pour appeler AeroDataBox avec timeout et déduplication
async function callAero(
  path: string
): Promise<{ ok: boolean; status: number; text: string; url: string }> {
  const url = `${AERODATABOX_BASE_URL}${path}`;

  // Déduplication des requêtes identiques
  if (pendingRequests.has(url)) {
    return pendingRequests.get(url);
  }

  const requestPromise = (async () => {
    const startTime = Date.now();
    try {
      // Timeout de 15 secondes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": AERODATABOX_API_KEY!,
          "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const text = await response.text();

      // Logger la requête API
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

      return {
        ok: response.ok,
        status: response.status,
        text,
        url,
      };
    } catch (error: any) {
      if (error.name === "AbortError") {
        return {
          ok: false,
          status: 408,
          text: JSON.stringify({ error: "Request timeout" }),
          url,
        };
      }
      return {
        ok: false,
        status: 500,
        text: JSON.stringify({ error: "Network error" }),
        url,
      };
    }
  })();

  pendingRequests.set(url, requestPromise);

  // Nettoyer après completion
  requestPromise.finally(() => {
    pendingRequests.delete(url);
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

      // Clé de cache optimisée (ajouter timestamp pour éviter le cache en dev)
      const isHistoricalDate = dateLocal && new Date(dateLocal) < new Date();
      const cacheKey = `flight:${numberRaw}:${
        dateLocal || "today"
      }:${Date.now()}`;

      // Vérifier le cache pour toutes les dates (avec TTL différent)
      const cached = getCache(cacheKey);
      if (cached) {
        const response = NextResponse.json(JSON.parse(cached));
        response.headers.set("X-Cache", "HIT");
        response.headers.set("Cache-Control", "public, max-age=300"); // 5 minutes
        return response;
      }

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
      }

      if (allFlights.length === 0) {
        return NextResponse.json(
          { error: "Flight not found" },
          { status: 404 }
        );
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
      const flightData = {
        status: correctedStatus,
        departure: {
          scheduledTime: f?.departure?.scheduledTime?.local,
          actualTime: f?.departure?.actualTime?.local,
        },
        arrival: {
          scheduledTime: f?.arrival?.scheduledTime?.local,
          estimatedTime: f?.arrival?.estimatedTime?.local,
          actualTime: f?.arrival?.actualTime?.local,
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

      // Cache optimisé avec TTL adaptatif
      const ttl = isHistoricalDate ? 10 * 60 * 1000 : 2 * 60 * 1000; // 10min pour historique, 2min pour futur
      setCache(cacheKey, textOut, ttl);

      const response = NextResponse.json(payload);
      response.headers.set(
        "Cache-Control",
        `public, max-age=${Math.floor(ttl / 1000)}`
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
