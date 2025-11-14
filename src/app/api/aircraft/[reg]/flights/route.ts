import { NextResponse } from "next/server";
import { withCreditChargeABD } from "@/lib/withCreditChargeABD";
import { ActionType } from "@prisma/client";
import { getCache as getSupabaseCache, setCache as setSupabaseCache } from "@/lib/supabaseCache";

const AERODATABOX_BASE_URL = process.env.API_MARKET_BASE_URL || "https://prod.api.market/api/v1/aedbx/aerodatabox";
const AERODATABOX_API_KEY =
  process.env.API_MARKET_KEY || process.env.AERODATABOX_API_KEY;

// Cache TTL (en secondes pour Supabase cache)
const FLIGHTS_TTL_SECONDS = 8 * 60 * 60; // 8 hours

// Cache Supabase persistant (partagé entre toutes les instances serverless)
async function getCache<T = any>(k: string): Promise<T | null> {
  const cached = await getSupabaseCache(k);
  if (cached) {
    try {
      return JSON.parse(cached) as T;
    } catch (e) {
      console.error("[Cache] Failed to parse cached value:", e);
      return null;
    }
  }
  return null;
}

async function setCache(k: string, data: any, ttlSeconds: number): Promise<void> {
  await setSupabaseCache(k, JSON.stringify(data), ttlSeconds);
}

// Helper function to convert date to ISO string
function toISOZ(date: Date): string {
  return date.toISOString().slice(0, -1) + "Z";
}

// Helper function to call AeroDataBox API
// Utilise la même logique que l'endpoint principal avec plusieurs URLs à essayer
async function callAero(path: string) {
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
    "x-magicapi-key": AERODATABOX_API_KEY || "", // api.market REST API header (selon documentation)
    "x-api-market-key": AERODATABOX_API_KEY || "", // Compatibilité MCP
  };

  // Essayer chaque URL jusqu'à trouver une qui fonctionne
  let attempt = 0;
  for (const url of urlsToTry) {
    attempt++;
    console.log(`[callAero flights] Attempt ${attempt}: Fetching URL: ${url}`);
    try {
      const response = await fetch(url, { headers, cache: "no-store" });
      const text = await response.text();
      
      console.log(`[callAero flights] Response status: ${response.status}, URL: ${url}`);
      if (text.length > 0 && !text.startsWith("<!DOCTYPE")) {
        console.log(`[callAero flights] Response preview: ${text.substring(0, 200)}`);
      }
      
      // Si succès, retourner immédiatement
      if (response.ok) {
        console.log(`[callAero flights] ✅ Success with ${url}`);
        return {
          status: response.status,
          ok: response.ok,
          text,
          url,
        };
      }
      
      // Si erreur 401/403, essayer la prochaine URL
      if (response.status === 401 || response.status === 403) {
        console.log(`[callAero flights] ❌ Auth error (${response.status}) with ${url}, trying next...`);
        continue;
      }
      
      // Pour les autres erreurs, retourner quand même (404, 500, etc.)
      console.log(`[callAero flights] ⚠️ Error ${response.status} with ${url}, returning...`);
      return {
        status: response.status,
        ok: response.ok,
        text,
        url,
      };
    } catch (error) {
      // En cas d'erreur réseau, essayer la prochaine URL
      console.log(`[callAero flights] ❌ Network error with ${url}: ${error}, trying next...`);
      continue;
    }
  }
  
  // Si toutes les URLs ont échoué, retourner une erreur
  return {
    status: 502,
    ok: false,
    text: JSON.stringify({ error: "All API endpoints failed" }),
    url: urlsToTry[0],
  };
}

import { withFlightHistoryAccess } from "@/lib/withActionAccess";

export const GET = withFlightHistoryAccess(
  async (req: Request, ctx: { params: Promise<{ reg: string }> }) => {
    const { reg } = await ctx.params;
    const { searchParams } = new URL(req.url);

    if (!reg) {
      return NextResponse.json({ flights: [] }, { status: 400 });
    }

    const registration = reg.toUpperCase().trim();
    const days = Math.max(
      1,
      Math.min(30, Number(searchParams.get("days") || 7))
    );
    const forceRefresh = searchParams.get("cache") === "refresh";

    // Calculate date range
    const to = new Date();
    const from = new Date(Date.now() - days * 86400000);
    const toISO = toISOZ(to);
    const fromISO = toISOZ(from);
    const fromDate = fromISO.slice(0, 10);
    const toDate = toISO.slice(0, 10);

    const cacheKey = `flights:${registration}:${days}:${fromDate}:${toDate}`;

    if (!forceRefresh) {
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log(`[AircraftFlights] Cache HIT for ${cacheKey}`);
        return NextResponse.json(cached, {
          headers: {
            "X-Cache": "HIT",
            "Cache-Control": "public, max-age=300, s-maxage=300", // 5 minutes pour permettre le bfcache
          },
        });
      }
      console.log(`[AircraftFlights] Cache MISS for ${cacheKey}`);
    }

    try {
      // Try multiple AeroDataBox endpoints
      const candidates = [
        `/flights/Reg/${encodeURIComponent(registration)}/${encodeURIComponent(
          fromDate
        )}/${encodeURIComponent(
          toDate
        )}?withLocation=true&withCodeshared=true&withCancelled=true&limit=200`,
        `/flights/Reg/${encodeURIComponent(registration)}/${encodeURIComponent(
          fromDate
        )}/${encodeURIComponent(toDate)}`,
      ];

      let last = null;
      // Try first candidate (most complete endpoint)
      const resp = await callAero(candidates[0]);
      console.log(`[AeroDataBox] ${resp.status} ${resp.url}`);

      // Handle empty responses or 204
      if (resp.status === 204 || !resp.text) {
        last = resp;
      } else if (resp.ok) {
        let out = resp.text || "[]";

        // Parse and filter the response
        try {
          const payload = JSON.parse(out);
          if (Array.isArray(payload)) {
            const filtered = payload.filter(
              (f) =>
                f?.codeshareStatus !== "IsCodeshared" &&
                (!f?.aircraft?.reg ||
                  String(f.aircraft.reg).toUpperCase() === registration)
            );

            // Transform the data to match our interface
            const transformedFlights = filtered.map((flight) => ({
              number: flight.number || "",
              airline: {
                name: flight.airline?.name || "",
                iata: flight.airline?.iata || "",
                icao: flight.airline?.icao || "",
              },
              departure: {
                airport: {
                  iata: flight.departure?.airport?.iata || "",
                  name: flight.departure?.airport?.name || "",
                  city: flight.departure?.airport?.city || "",
                },
                scheduledTime: flight.departure?.scheduledTime?.local || "",
                actualTime: flight.departure?.actualTime?.local || "",
                terminal: flight.departure?.terminal || "",
                gate: flight.departure?.gate || "",
              },
              arrival: {
                airport: {
                  iata: flight.arrival?.airport?.iata || "",
                  name: flight.arrival?.airport?.name || "",
                  city: flight.arrival?.airport?.city || "",
                },
                scheduledTime: flight.arrival?.scheduledTime?.local || "",
                actualTime: flight.arrival?.actualTime?.local || "",
                terminal: flight.arrival?.terminal || "",
                gate: flight.arrival?.gate || "",
              },
              status: flight.status || "",
              distance:
                flight.greatCircleDistance?.km ||
                flight.distance?.km ||
                flight.distance ||
                0,
              duration: flight.duration?.minutes || flight.duration || 0,
              date:
                flight.departure?.scheduledTime?.local?.slice(0, 10) || "",
            }));

            const result = { flights: transformedFlights };
            await setCache(cacheKey, result, FLIGHTS_TTL_SECONDS);

            return NextResponse.json(result, {
              headers: {
                "X-Cache": "MISS",
                "X-Filtered": "codeshare,reg",
                "Cache-Control": "public, max-age=28800, s-maxage=28800", // 8 heures
              },
            });
          }
        } catch (parseError) {
          console.error("Failed to parse JSON response:", parseError);
        }
      }

      last = resp;

      // If nothing found
      if (
        last &&
        (last.status === 400 || last.status === 404 || last.status === 204)
      ) {
        const result = { flights: [], message: "No flights found" };
        await setCache(cacheKey, result, 10 * 60); // Cache empty results for 10 minutes (en secondes)
        return NextResponse.json(result, {
          status: 404,
          headers: {
            "Cache-Control": "public, max-age=300, s-maxage=300", // 5 minutes pour permettre le bfcache
          },
        });
      }

      return NextResponse.json(
        { flights: [], error: "Upstream error (flights)" },
        { status: last?.status || 502 }
      );
    } catch (e) {
      console.error("Error fetching flight history:", e);
      return NextResponse.json(
        { flights: [], error: "Proxy error (flights)" },
        { status: 500 }
      );
    }
  }
);
