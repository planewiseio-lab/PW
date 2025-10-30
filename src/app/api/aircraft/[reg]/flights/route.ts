import { NextResponse } from "next/server";
import { withCreditChargeABD } from "@/lib/withCreditChargeABD";
import { ActionType } from "@prisma/client";

const AERODATABOX_BASE_URL = "https://aerodatabox.p.rapidapi.com";
const AERODATABOX_API_KEY =
  process.env.AERODATABOX_API_KEY || process.env.RAPID_KEY;

// Cache TTL
const FLIGHTS_TTL_MS = 1000 * 60 * 60 * 2; // 2 hours

// In-memory cache
const cache = new Map<string, { data: any; exp: number }>();
const getCache = <T = any>(k: string): T | null => {
  const v = cache.get(k);
  if (v && v.exp > Date.now()) return v.data as T;
  cache.delete(k);
  return null;
};
const setCache = (k: string, data: any, ttl: number) =>
  cache.set(k, { data, exp: Date.now() + ttl });

// Helper function to convert date to ISO string
function toISOZ(date: Date): string {
  return date.toISOString().slice(0, -1) + "Z";
}

// Helper function to call AeroDataBox API
async function callAero(path: string) {
  const url = `${AERODATABOX_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      "X-RapidAPI-Key": AERODATABOX_API_KEY || "",
      "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
    },
  });

  const text = await response.text();
  return {
    status: response.status,
    ok: response.ok,
    text,
    url,
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
      const cached = getCache(cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: { "X-Cache": "HIT" },
        });
      }
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
      for (const pathPart of candidates) {
        const resp = await callAero(pathPart);
        console.log(`[AeroDataBox] ${resp.status} ${resp.url}`);

        // Handle empty responses or 204
        if (resp.status === 204 || !resp.text) {
          last = resp;
          continue;
        }

        if (resp.ok) {
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

              // Debug: Log first flight to see structure
              if (filtered.length > 0) {
                console.log(
                  "First flight data structure:",
                  JSON.stringify(filtered[0], null, 2)
                );
              }

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
              setCache(cacheKey, result, FLIGHTS_TTL_MS);

              return NextResponse.json(result, {
                headers: { "X-Cache": "MISS", "X-Filtered": "codeshare,reg" },
              });
            }
          } catch (parseError) {
            console.log("Failed to parse JSON response:", parseError);
          }
        }

        last = resp;
        if (resp.status >= 500) break; // upstream KO -> exit
      }

      // If nothing found
      if (
        last &&
        (last.status === 400 || last.status === 404 || last.status === 204)
      ) {
        const result = { flights: [], message: "No flights found" };
        setCache(cacheKey, result, 1000 * 60 * 10); // Cache empty results for 10 minutes
        return NextResponse.json(result, { status: 404 });
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
