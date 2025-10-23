import { NextRequest, NextResponse } from "next/server";
import { withCreditChargeABD } from "@/lib/withCreditChargeABD";
import { ActionType } from "@prisma/client";

const AERODATABOX_API_KEY =
  process.env.AERODATABOX_API_KEY || process.env.RAPID_KEY;
const AERODATABOX_BASE_URL = "https://aerodatabox.p.rapidapi.com";

// Cache pour l'historique des vols
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

function getCache(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

// Fonction pour appeler AeroDataBox avec timeout
async function callAero(
  path: string
): Promise<{ ok: boolean; status: number; text: string; url: string }> {
  const url = `${AERODATABOX_BASE_URL}${path}`;

  try {
    // Timeout de 15 secondes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": String(AERODATABOX_API_KEY),
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
    return {
      ok: false,
      status: 500,
      text: error.message || "Request failed",
      url,
    };
  }
}

export const GET = withCreditChargeABD(
  ActionType.VIEW_FLIGHT_HISTORY,
  async (
    request: NextRequest,
    { params }: { params: Promise<{ reg: string }> }
  ) => {
    try {
      if (!AERODATABOX_API_KEY) {
        return NextResponse.json(
          { error: "AeroDataBox API key not configured" },
          { status: 500 }
        );
      }

      const { reg } = await params;
      const { searchParams } = new URL(request.url);

      // Paramètres de l'historique
      const days = Math.min(
        30,
        Math.max(1, Number(searchParams.get("days") || 14))
      );
      const limit = Math.min(
        200,
        Math.max(1, Number(searchParams.get("limit") || 50))
      );

      const now = new Date();
      const from = new Date(Date.now() - days * 86400000);
      const fromDate = from.toISOString().slice(0, 10);
      const toDate = now.toISOString().slice(0, 10);

      const cacheKey = `flight-history:${reg}:${fromDate}:${toDate}:${limit}`;

      // Vérifier le cache (1 heure)
      const cached = getCache(cacheKey);
      if (cached) {
        console.log(`[CACHE] hit flight history ${reg}`);
        return NextResponse.json(cached, {
          headers: {
            "X-Cache": "HIT",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }

      // Construire l'URL de l'API AeroDataBox
      const apiPath = `/flights/Reg/${encodeURIComponent(
        reg
      )}/${encodeURIComponent(fromDate)}/${encodeURIComponent(
        toDate
      )}?withLocation=true&withCodeshared=true&withCancelled=true&limit=${limit}`;

      console.log(
        `[FLIGHT_HISTORY] Fetching history for ${reg} from ${fromDate} to ${toDate}`
      );

      const response = await callAero(apiPath);

      if (!response.ok) {
        return NextResponse.json(
          {
            error: "Failed to fetch flight history",
            status: response.status,
            detail: response.text,
          },
          { status: response.status }
        );
      }

      let data: any = null;
      try {
        data = JSON.parse(response.text);
      } catch (parseError) {
        return NextResponse.json(
          { error: "Invalid response from AeroDataBox API" },
          { status: 502 }
        );
      }

      // Normaliser les données
      const flights = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];

      const result = {
        registration: reg.toUpperCase(),
        period: {
          from: fromDate,
          to: toDate,
          days,
        },
        flights: flights.map((flight: any) => ({
          id: flight.id || null,
          flightNumber: flight.number || null,
          airline: flight.airline?.name || null,
          aircraft: {
            registration: flight.aircraft?.reg || reg.toUpperCase(),
            model: flight.aircraft?.model || null,
            type: flight.aircraft?.type || null,
          },
          departure: {
            airport: flight.departure?.airport?.iata || null,
            city: flight.departure?.airport?.name || null,
            scheduled: flight.departure?.scheduledTimeLocal || null,
            actual: flight.departure?.actualTimeLocal || null,
            terminal: flight.departure?.terminal || null,
            gate: flight.departure?.gate || null,
          },
          arrival: {
            airport: flight.arrival?.airport?.iata || null,
            city: flight.arrival?.airport?.name || null,
            scheduled: flight.arrival?.scheduledTimeLocal || null,
            actual: flight.arrival?.actualTimeLocal || null,
            terminal: flight.arrival?.terminal || null,
            gate: flight.arrival?.gate || null,
          },
          status: flight.status || null,
          duration: flight.duration || null,
          distance: flight.distance || null,
        })),
        total: flights.length,
        cached: false,
        timestamp: new Date().toISOString(),
      };

      // Mettre en cache
      setCache(cacheKey, result, 60 * 60 * 1000); // 1 heure
      console.log(`[CACHE] stored flight history ${reg} for 1h`);

      return NextResponse.json(result, {
        headers: {
          "X-Cache": "MISS",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (error) {
      console.error("Flight history API error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);
