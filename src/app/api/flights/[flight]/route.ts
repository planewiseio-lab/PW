import { NextRequest, NextResponse } from "next/server";

const AERODATABOX_API_KEY =
  process.env.AERODATABOX_API_KEY || process.env.RAPID_KEY;
const AERODATABOX_BASE_URL = "https://aerodatabox.p.rapidapi.com";

// Cache simple en mémoire (en production, utiliser Redis)
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

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

// Fonction pour appeler AeroDataBox
async function callAero(
  path: string
): Promise<{ ok: boolean; status: number; text: string; url: string }> {
  const url = `${AERODATABOX_BASE_URL}${path}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": AERODATABOX_API_KEY!,
        "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
      },
    });

    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      text,
      url,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      text: JSON.stringify({ error: "Network error" }),
      url,
    };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ flight: string }> }
) {
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

    // Clé de cache (seulement pour les dates passées/récentes)
    const isHistoricalDate = dateLocal && new Date(dateLocal) < new Date();
    const cacheKey = `flight:${numberRaw}:${dateLocal || "today"}`;

    // Ne pas utiliser le cache pour les dates futures
    if (isHistoricalDate) {
      const cached = getCache(cacheKey);
      if (cached) {
        const response = NextResponse.json(JSON.parse(cached));
        response.headers.set("X-Cache", "HIT");
        return response;
      }
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
      return NextResponse.json({ error: "Flight not found" }, { status: 404 });
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
      return NextResponse.json({ error: "Flight not found" }, { status: 404 });
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
    const scheduledArrival = f?.arrival?.scheduledTime?.local;
    const scheduledDeparture = f?.departure?.scheduledTime?.local;

    if (scheduledArrival) {
      try {
        const scheduledTime = new Date(scheduledArrival);
        const now = new Date();
        const hoursDiff =
          (now.getTime() - scheduledTime.getTime()) / (1000 * 60 * 60);

        // Logique de correction des statuts
        if (correctedStatus.toLowerCase() === "approaching" && hoursDiff > 4) {
          correctedStatus = "Arrived";
          console.log(
            `[Flight Logic] Status corrected from "Approaching" to "Arrived" for ${numberRaw} (${hoursDiff.toFixed(
              1
            )}h late)`
          );
        } else if (
          correctedStatus.toLowerCase() === "in flight" &&
          hoursDiff > 4
        ) {
          correctedStatus = "Arrived";
          console.log(
            `[Flight Logic] Status corrected from "In Flight" to "Arrived" for ${numberRaw} (${hoursDiff.toFixed(
              1
            )}h late)`
          );
        } else if (
          correctedStatus.toLowerCase() === "departed" &&
          hoursDiff > 4
        ) {
          correctedStatus = "Arrived";
          console.log(
            `[Flight Logic] Status corrected from "Departed" to "Arrived" for ${numberRaw} (${hoursDiff.toFixed(
              1
            )}h late)`
          );
        } else if (
          correctedStatus.toLowerCase() === "expected" &&
          hoursDiff > 4
        ) {
          correctedStatus = "Arrived";
          console.log(
            `[Flight Logic] Status corrected from "Expected" to "Arrived" for ${numberRaw} (${hoursDiff.toFixed(
              1
            )}h late)`
          );
        }
      } catch (error) {
        console.log(
          `[Flight Logic] Could not parse scheduled arrival time: ${scheduledArrival}`
        );
      }
    }

    // Logique pour les vols qui n'ont pas encore décollé mais sont très en retard
    if (scheduledDeparture && correctedStatus.toLowerCase() === "scheduled") {
      try {
        const scheduledTime = new Date(scheduledDeparture);
        const now = new Date();
        const hoursDiff =
          (now.getTime() - scheduledTime.getTime()) / (1000 * 60 * 60);

        if (hoursDiff > 12) {
          correctedStatus = "Delayed";
          console.log(
            `[Flight Logic] Status corrected from "Scheduled" to "Delayed" for ${numberRaw} (${hoursDiff.toFixed(
              1
            )}h late)`
          );
        }
      } catch (error) {
        console.log(
          `[Flight Logic] Could not parse scheduled departure time: ${scheduledDeparture}`
        );
      }
    }

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
          f?.arrival?.revisedTime?.local || f?.arrival?.actualTime?.local || "",
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

    // Cache avec TTL de 5 minutes (seulement pour les dates historiques)
    if (isHistoricalDate) {
      setCache(cacheKey, textOut, 5 * 60 * 1000);
    }

    const response = NextResponse.json(payload);
    response.headers.set("Cache-Control", "no-store");
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
