import { NextResponse } from "next/server";
import { correctFlightStatus } from "@/lib/flightStatusRules";
import { withAirportBrowseAccess } from "@/lib/withActionAccess";
import { getAirport, getFlightsRelative, getFlightsRelativeBoth, getFlightsRelativeCachedOnly } from "@/services/abdClient";
import { normalizeAirportInfo, normalizeFids } from "@/utils/abdNormalizers";
import { getCache as getSupabaseCache, setCache as setSupabaseCache } from "@/lib/supabaseCache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cache Supabase persistant pour les vols normalisés (partagé entre toutes les instances serverless)
// TTL: 60 secondes (même que getFlightsRelative)
async function getNormalizedFlightsCache(key: string): Promise<any[] | null> {
  const cached = await getSupabaseCache(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.error("[AirportAPI] Failed to parse cached normalized flights:", e);
      return null;
    }
  }
  return null;
}

async function setNormalizedFlightsCache(key: string, flights: any[], ttlSeconds: number): Promise<void> {
  await setSupabaseCache(key, JSON.stringify(flights), ttlSeconds);
}

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
    const apiKey = process.env.API_MARKET_KEY || process.env.AIRREG_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing API_MARKET_KEY environment variable" },
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

    // Clé de cache pour les vols normalisés (partagée entre toutes les instances serverless)
    // On utilise une clé unique pour les deux directions pour optimiser
    const normalizedCacheKeyBoth = `airport:normalized:${code.toUpperCase()}:both:${hoursBefore}:${hoursAfter}`;
    const normalizedCacheKey = `airport:normalized:${code.toUpperCase()}:${dir}:${hoursBefore}:${hoursAfter}`;
    const NORMALIZED_CACHE_TTL_SECONDS = 60 * 60; // 1 heure (3600 secondes)

    try {
      // Vérifier d'abord le cache des vols normalisés pour la direction demandée
      let allFlights = await getNormalizedFlightsCache(normalizedCacheKey);
      
      if (!allFlights) {
        // Vérifier si on a déjà récupéré les deux directions en cache
        const cachedBoth = await getNormalizedFlightsCache(normalizedCacheKeyBoth);
        
        if (cachedBoth && cachedBoth.departures && cachedBoth.arrivals) {
          // Utiliser les données déjà en cache pour les deux directions
          allFlights = dir === "departures" ? cachedBoth.departures : cachedBoth.arrivals;
          console.log(`[AirportAPI] Using cached normalized flights for ${code} ${dir} from both cache (${allFlights.length} flights)`);
        } else {
          // Pas dans le cache, récupérer les DEUX (departures et arrivals) en un seul appel API
          console.log(`[AirportAPI] Fetching both departures and arrivals for ${code} in one API call`);
          const { data } = await getFlightsRelativeBoth(
            code,
            hoursBefore,
            hoursAfter,
            { timeoutMs: 3000, retry: 1, cacheTtlSeconds: 60 * 60 } // 1 heure (3600 secondes)
          );
          
          // Normaliser les deux directions séparément
          const departures = normalizeFids(data, "departures");
          const arrivals = normalizeFids(data, "arrivals");
          
          // Mettre en cache les deux directions ensemble
          await setNormalizedFlightsCache(normalizedCacheKeyBoth, { departures, arrivals }, NORMALIZED_CACHE_TTL_SECONDS);
          
          // Mettre aussi en cache individuellement pour compatibilité
          await setNormalizedFlightsCache(`airport:normalized:${code.toUpperCase()}:departures:${hoursBefore}:${hoursAfter}`, departures, NORMALIZED_CACHE_TTL_SECONDS);
          await setNormalizedFlightsCache(`airport:normalized:${code.toUpperCase()}:arrivals:${hoursBefore}:${hoursAfter}`, arrivals, NORMALIZED_CACHE_TTL_SECONDS);
          
          // Utiliser la direction demandée
          allFlights = dir === "departures" ? departures : arrivals;
          console.log(`[AirportAPI] Fetched and cached both directions for ${code}: ${departures.length} departures, ${arrivals.length} arrivals`);
        }
      } else {
        console.log(`[AirportAPI] Using cached normalized flights for ${code} ${dir} (${allFlights.length} flights)`);
      }

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
                      "public, s-maxage=3600, stale-while-revalidate=7200, max-age=3600", // 1 heure
            Vary: "Accept-Encoding",
            "X-Cache": "MISS",
          },
        }
      );
    } catch (e: any) {
      // Fallback: tenter un cache récent pour éviter 504
      // Vérifier d'abord le cache des vols normalisés
      let allFlights = await getNormalizedFlightsCache(normalizedCacheKey);
      
      if (!allFlights) {
        // Vérifier si on a déjà récupéré les deux directions en cache
        const cachedBoth = await getNormalizedFlightsCache(normalizedCacheKeyBoth);
        if (cachedBoth && cachedBoth.departures && cachedBoth.arrivals) {
          allFlights = dir === "departures" ? cachedBoth.departures : cachedBoth.arrivals;
        } else {
          // Si pas dans le cache normalisé, essayer le cache brut
          const cached = await getFlightsRelativeCachedOnly(code, dir, hoursBefore, hoursAfter);
          if (cached) {
            allFlights = normalizeFids(cached, dir);
            // Mettre en cache les vols normalisés pour les requêtes suivantes
            await setNormalizedFlightsCache(normalizedCacheKey, allFlights, NORMALIZED_CACHE_TTL_SECONDS);
          }
        }
      }
      
      if (allFlights) {
        // Appliquer la pagination même pour le cache stale
        const paginatedFlights = allFlights.slice(offset, offset + limit);
        const hasMore = offset + limit < allFlights.length;
        return NextResponse.json(
          { flights: paginatedFlights, pagination: { total: allFlights.length, limit, offset, hasMore }, stale: true },
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
    const { data } = await getAirport(code, { timeoutMs: 2500, retry: 1, cacheTtlSeconds: 3600 }); // 1 heure (augmenté de 5min à 1h car le coût de stockage est faible)
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
