import { NextRequest, NextResponse } from "next/server";
import {
  correctFlightStatus,
  logStatusCorrection,
} from "@/lib/flightStatusRules";
import { withCreditChargeABD } from "@/lib/withCreditChargeABD";
import { ActionType } from "@prisma/client";

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

export const GET = withCreditChargeABD(
  ActionType.BROWSE_FLIGHT,
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

      // Clé de cache optimisée
      const isHistoricalDate = dateLocal && new Date(dateLocal) < new Date();
      const cacheKey = `flight:${numberRaw}:${dateLocal || "today"}`;

      // Vérifier le cache pour toutes les dates (avec TTL différent)
      const cached = getCache(cacheKey);
      if (cached) {
        const response = NextResponse.json(JSON.parse(cached));
        response.headers.set("X-Cache", "HIT");
        response.headers.set("Cache-Control", "public, max-age=300"); // 5 minutes
        return response;
      }

      // Essayer plusieurs endpoints AeroDataBox (fallback)
      const candidates = dateLocal
        ? [
            `/flights/number/${encodeURIComponent(
              numberRaw
            )}/${encodeURIComponent(
              dateLocal
            )}?withLocation=true&withCodeshared=true&withCancelled=true&limit=25`,
            `/flights/number/${encodeURIComponent(
              numberRaw
            )}/${encodeURIComponent(dateLocal)}`,
          ]
        : [
            `/flights/number/${encodeURIComponent(
              numberRaw
            )}?withLocation=true&withCodeshared=true&withCancelled=true&limit=25`,
            `/flights/number/${encodeURIComponent(numberRaw)}`,
          ];

      let upstream = null;
      for (const pathPart of candidates) {
        const resp = await callAero(pathPart);
        console.log(`[AeroDataBox] ${resp.status} ${resp.url}`);

        if (resp.ok) {
          upstream = resp.text;
          break;
        }

        // Si 5xx, arrêter; si 4xx, continuer
        if (resp.status >= 500) {
          return NextResponse.json(
            { error: "AeroDataBox server error" },
            { status: resp.status }
          );
        }

        upstream = resp;
      }

      if (!upstream || typeof upstream !== "string") {
        return NextResponse.json(
          { error: "Flight not found" },
          { status: 404 }
        );
      }

      // Parser la réponse
      let data;
      try {
        data = JSON.parse(upstream);
      } catch {
        return NextResponse.json(
          { error: "Invalid response from AeroDataBox" },
          { status: 500 }
        );
      }

      const flights = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];

      if (!flights.length) {
        // Cache négatif court
        setCache(
          cacheKey,
          JSON.stringify({ error: "Flight not found" }),
          5 * 60 * 1000
        );
        return NextResponse.json(
          { error: "Flight not found" },
          { status: 404 }
        );
      }

      // Prendre le premier vol (le plus pertinent)
      const f = flights[0];

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
          registration:
            f?.aircraft?.reg || f?.aircraft?.registration || "Not available",
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
