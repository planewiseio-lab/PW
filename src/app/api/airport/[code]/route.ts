import { NextResponse } from "next/server";
import { correctFlightStatus } from "@/lib/flightStatusRules";
import { withAirportBrowseAccess } from "@/lib/withActionAccess";
import { getAirport, getFlightsRelative, getFlightsRelativeCachedOnly } from "@/services/abdClient";
import { normalizeAirportInfo, normalizeFids } from "@/utils/abdNormalizers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Direction = "departures" | "arrivals";

function detectCodeType(code: string): "icao" | "iata" {
  const c = code.trim();
  if (c.length === 4) return "icao";
  return "iata";
}

function bool(v: string | null | undefined, d = false) {
  if (v == null) return d;
  return v === "1" || v === "true";
}

export const GET = withAirportBrowseAccess(
  async (req: Request, ctx: { params: Promise<{ code: string }> }) => {
    // Check for required API key
    const apiKey = process.env.AIRREG_API_KEY || process.env.RAPID_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing AIRREG_API_KEY environment variable" },
        { status: 500 }
      );
    }

    const { code } = await ctx.params;
    const url = new URL(req.url);

    // Check if requesting airport info (TIER 1)
    const infoOnly = url.searchParams.get("info") === "true";
    if (infoOnly) {
      return getAirportInfo(code, apiKey);
    }

    // Tier 2 relative-time FIDS endpoint
    const dir = (url.searchParams.get("dir") as Direction) || "departures";
    // Réduire la plage horaire pour accélérer les requêtes
    const hoursBefore = Math.max(
      0,
      Math.min(6, Number(url.searchParams.get("before") || 1))
    );
    const hoursAfter = Math.max(
      0,
      Math.min(6, Number(url.searchParams.get("after") || 1))
    );
    const withCancelled = bool(url.searchParams.get("cancelled"), true);
    const withCodeshared = bool(url.searchParams.get("codeshared"), true);
    const withLocation = bool(url.searchParams.get("location"), true);

    // Pagination pour optimiser le chargement
    const limit = Number(url.searchParams.get("limit")) || 20;
    const offset = Number(url.searchParams.get("offset")) || 0;

    try {
      const { data } = await getFlightsRelative(
        code,
        dir,
        hoursBefore,
        hoursAfter,
        { timeoutMs: 3000, retry: 1, cacheTtlSeconds: 60 }
      );
      const allFlights = normalizeFids(data, dir);

      // Appliquer la pagination côté serveur
      const paginatedFlights = allFlights.slice(offset, offset + limit);
      const hasMore = offset + limit < allFlights.length;

      return NextResponse.json(
        {
          flights: paginatedFlights,
          pagination: {
            total: allFlights.length,
            limit,
            offset,
            hasMore,
          },
        },
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=120, stale-while-revalidate=300, max-age=60",
            Vary: "Accept-Encoding",
            "X-Cache": "MISS",
          },
        }
      );
    } catch (e: any) {
      // Fallback: tenter un cache récent pour éviter 504
      const cached = await getFlightsRelativeCachedOnly(code, dir, hoursBefore, hoursAfter);
      if (cached) {
        const allFlights = normalizeFids(cached, dir);
        return NextResponse.json(
          { flights: allFlights, pagination: { total: allFlights.length, limit, offset, hasMore: false }, stale: true },
          { headers: { "X-Cache": "STALE" } }
        );
      }
      const status = e?.name === "AbortError" ? 504 : 500;
      return NextResponse.json(
        { error: e?.message || "fetch_failed", code: status === 504 ? "UPSTREAM_TIMEOUT" : "INTERNAL_ERROR" },
        { status }
      );
    }
  }
);

// TIER 1: Airport information endpoint
async function getAirportInfo(code: string, _apiKey: string) {
  try {
    const { data } = await getAirport(code, { timeoutMs: 2500, retry: 1, cacheTtlSeconds: 300 });
    const airportInfo = normalizeAirportInfo(data);
    return NextResponse.json(
      { airport: airportInfo },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800", // Cache 1 hour
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "fetch_failed" },
      { status: 500 }
    );
  }
}

// Local normalizers removed in favor of utils/abdNormalizers imports
