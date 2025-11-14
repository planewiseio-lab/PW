import { NextRequest, NextResponse } from "next/server";
import { withCreditChargeABD } from "@/lib/withCreditChargeABD";
import { ActionType } from "@prisma/client";
import { getCache as getSupabaseCache, setCache as setSupabaseCache } from "@/lib/supabaseCache";

const AERODATABOX_API_KEY =
  process.env.API_MARKET_KEY || process.env.AERODATABOX_API_KEY;
const AERODATABOX_BASE_URL = process.env.API_MARKET_BASE_URL || "https://prod.api.market/api/v1/aedbx/aerodatabox";

// Cache TTL (en secondes pour Supabase cache)
const HISTORY_TTL_SECONDS = 8 * 60 * 60; // 8 heures (28800 secondes)

// Cache Supabase persistant (partagé entre toutes les instances serverless)
async function getCache(key: string): Promise<any | null> {
  const cached = await getSupabaseCache(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.error("[Cache] Failed to parse cached value:", e);
      return null;
    }
  }
  return null;
}

async function setCache(key: string, data: any, ttlSeconds: number): Promise<void> {
  await setSupabaseCache(key, JSON.stringify(data), ttlSeconds);
  console.log(`[Cache] stored flight history for ${ttlSeconds}s`);
}

// Fonction pour appeler AeroDataBox avec timeout
// Utilise la même logique que l'endpoint principal avec plusieurs URLs à essayer
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
  
  const headers = {
    Accept: "application/json",
    "x-magicapi-key": String(AERODATABOX_API_KEY), // api.market REST API header (selon documentation)
    "x-api-market-key": String(AERODATABOX_API_KEY), // Compatibilité MCP
  };

  // Essayer chaque URL jusqu'à trouver une qui fonctionne
  for (const url of urlsToTry) {
    try {
      // Timeout de 15 secondes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const text = await response.text();
      
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
        console.log(`[callAero history] Auth error (${response.status}) with ${url}, trying next...`);
        continue;
      }
      
      // Pour les autres erreurs, retourner quand même (404, 500, etc.)
      return {
        ok: response.ok,
        status: response.status,
        text,
        url,
      };
    } catch (error: any) {
      // En cas d'erreur réseau ou timeout, essayer la prochaine URL
      if (error.name === "AbortError") {
        console.log(`[callAero history] Timeout with ${url}, trying next...`);
      } else {
        console.log(`[callAero history] Network error with ${url}, trying next...`);
      }
      continue;
    }
  }
  
  // Si toutes les URLs ont échoué, retourner une erreur
  return {
    ok: false,
    status: 502,
    text: JSON.stringify({ error: "All API endpoints failed" }),
    url: urlsToTry[0],
  };
}

import { withFlightHistoryAccess } from "@/lib/withActionAccess";

export const GET = withFlightHistoryAccess(
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

      // Vérifier le cache Supabase persistant (partagé entre toutes les instances serverless)
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log(`[CACHE] hit flight history ${reg} from Supabase`);
        return NextResponse.json(cached, {
          headers: {
            "X-Cache": "HIT",
            "Cache-Control": "public, max-age=28800, s-maxage=28800", // 8 heures
          },
        });
      }

      console.log(`[CACHE] miss flight history ${reg} - calling API`);

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

      // Mettre en cache Supabase persistant (partagé entre toutes les instances serverless)
      await setCache(cacheKey, result, HISTORY_TTL_SECONDS); // 8 heures (28800 secondes)
      console.log(`[CACHE] stored flight history ${reg} in Supabase for 8h`);

      return NextResponse.json(result, {
        headers: {
          "X-Cache": "MISS",
          "Cache-Control": "public, max-age=28800, s-maxage=28800", // 8 heures
          // Compression gérée automatiquement par Next.js via compress: true
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
