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
async function getNormalizedFlightsCache(key: string): Promise<any[] | { departures: any[]; arrivals: any[] } | null> {
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

async function setNormalizedFlightsCache(key: string, flights: any[] | { departures: any[]; arrivals: any[] }, ttlSeconds: number): Promise<void> {
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

    // Vérifier si c'est une recherche (pour ne pas facturer de crédits si cache uniquement)
    const searchQuery = url.searchParams.get("search");
    const isSearchRequest = searchQuery && searchQuery.trim();
    
    try {
      // Vérifier d'abord le cache des vols normalisés pour la direction demandée
      let allFlights: any[] | null = null;
      let usedCacheOnly = false; // Flag pour indiquer si on utilise uniquement le cache
      const cached = await getNormalizedFlightsCache(normalizedCacheKey);
      
      // Si le cache contient un tableau, l'utiliser directement
      if (cached && Array.isArray(cached)) {
        allFlights = cached;
        usedCacheOnly = true; // On utilise uniquement le cache
      }
      
      if (!allFlights) {
        // Vérifier si on a déjà récupéré les deux directions en cache
        const cachedBoth = await getNormalizedFlightsCache(normalizedCacheKeyBoth);
        
        if (cachedBoth && !Array.isArray(cachedBoth) && cachedBoth.departures && cachedBoth.arrivals) {
          // Utiliser les données déjà en cache pour les deux directions
          allFlights = dir === "departures" ? cachedBoth.departures : cachedBoth.arrivals;
          usedCacheOnly = true; // On utilise uniquement le cache
          console.log(`[AirportAPI] Using cached normalized flights for ${code} ${dir} from both cache (${allFlights.length} flights)`);
        } else {
          // Pas dans le cache, récupérer les DEUX (departures et arrivals) en un seul appel API
          console.log(`[AirportAPI] Fetching both departures and arrivals for ${code} in one API call`);
          usedCacheOnly = false; // On fait un appel API externe
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
      } else if (allFlights && Array.isArray(allFlights)) {
        console.log(`[AirportAPI] Using cached normalized flights for ${code} ${dir} (${allFlights.length} flights)`);
      }

      // Si un paramètre de recherche est fourni, filtrer toutes les données au lieu de paginer
      if (isSearchRequest) {
        // Normaliser la requête de recherche : supprimer les espaces et mettre en minuscules
        const normalizeSearch = (str: string | null | undefined) => {
          if (!str || typeof str !== "string") return "";
          return str.replace(/\s+/g, "").toLowerCase().trim();
        };
        const searchNormalized = normalizeSearch(searchQuery.trim());
        console.log(`[AirportAPI] Search query: "${searchQuery}" → normalized: "${searchNormalized}"`);
        
        // Log quelques exemples de vols pour déboguer
        console.log(`[AirportAPI] Sample flights (first 5):`, allFlights.slice(0, 5).map((f: any) => ({
          number: f.number,
          airline: f.airline,
          to: f.to,
        })));
        
        const filteredFlights = allFlights.filter((flight: any) => {
          // Normaliser tous les champs de recherche en supprimant les espaces
          const originalNumber = flight.number || "";
          const number = normalizeSearch(flight.number);
          const airline = normalizeSearch(flight.airline);
          const to = normalizeSearch(flight.to);
          const from = normalizeSearch(flight.from);
          const reg = normalizeSearch(flight.reg);
          const airportName = normalizeSearch(flight.airportName);
          
          // Extraire le code compagnie du numéro de vol (ex: "kl672" → "kl", "672")
          // Le numéro de vol peut être "KL 672" → normalisé en "kl672"
          // On essaie d'extraire le code compagnie (2-3 lettres) et le numéro (chiffres)
          const numberMatch = number.match(/^([a-z]{2,3})(\d+)$/);
          const airlineCode = numberMatch ? numberMatch[1] : "";
          const flightNumberOnly = numberMatch ? numberMatch[2] : number;
          
          // Créer différentes combinaisons pour la recherche
          // Exemple: "KL 672" → number="kl672", airlineCode="kl", flightNumberOnly="672"
          const combinedFlightCode = airlineCode && flightNumberOnly ? (airlineCode + flightNumberOnly) : number;
          const airlinePlusNumber = airline && flightNumberOnly ? (airline + flightNumberOnly) : "";
          
          // Recherche dans tous les champs normalisés (sans espaces)
          const matches = 
            number.includes(searchNormalized) ||
            airline.includes(searchNormalized) ||
            airlineCode.includes(searchNormalized) ||
            flightNumberOnly.includes(searchNormalized) ||
            combinedFlightCode.includes(searchNormalized) ||
            (airlinePlusNumber && airlinePlusNumber.includes(searchNormalized)) ||
            to.includes(searchNormalized) ||
            from.includes(searchNormalized) ||
            reg.includes(searchNormalized) ||
            airportName.includes(searchNormalized);
          
          // Log de débogage pour les vols qui contiennent "kl" ou "672" dans leur numéro
          if (number.includes("kl") || number.includes("672") || originalNumber.toLowerCase().includes("kl")) {
            console.log(`[AirportAPI] Flight "${originalNumber}" → normalized: "${number}", airlineCode: "${airlineCode}", flightNumberOnly: "${flightNumberOnly}", searchNormalized: "${searchNormalized}", matches: ${matches}`);
          }
          
          return matches;
        });
        
        console.log(`[AirportAPI] Search "${searchQuery}" (normalized: "${searchNormalized}") found ${filteredFlights.length} flights out of ${allFlights.length}`);

        // Pour la recherche, retourner tous les résultats filtrés (pas de pagination)
        // Si on utilise uniquement le cache, ne pas facturer de crédits (header spécial)
        const headers: Record<string, string> = {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=7200, max-age=3600", // 1 heure
          Vary: "Accept-Encoding",
          "X-Cache": "SEARCH",
        };
        
        // Si recherche avec cache uniquement, indiquer qu'aucun crédit ne doit être débité
        if (usedCacheOnly) {
          headers["X-Skip-Credit-Charge"] = "true";
          console.log(`[AirportAPI] Search request using cache only - skipping credit charge`);
        }

        return NextResponse.json(
          {
            flights: filteredFlights,
            pagination: {
              total: filteredFlights.length,
              limit: filteredFlights.length,
              offset: 0,
              hasMore: false,
            },
            searchApplied: true,
          },
          { headers }
        );
      }

      // Appliquer la pagination côté serveur (comportement normal)
      const paginatedFlights = allFlights.slice(offset, offset + limit);
      const hasMore = offset + limit < allFlights.length;

      const headers: Record<string, string> = {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=7200, max-age=3600", // 1 heure
        Vary: "Accept-Encoding",
        "X-Cache": usedCacheOnly ? "HIT" : "MISS",
      };
      
      // Si on utilise uniquement le cache (même pour la pagination normale), ne pas facturer de crédits
      if (usedCacheOnly) {
        headers["X-Skip-Credit-Charge"] = "true";
        console.log(`[AirportAPI] Pagination request using cache only - skipping credit charge`);
      }

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
        { headers }
      );
    } catch (e: any) {
      // Fallback: tenter un cache récent pour éviter 504
      // Vérifier d'abord le cache des vols normalisés
      let allFlights: any[] | null = null;
      const cached = await getNormalizedFlightsCache(normalizedCacheKey);
      
      // Si le cache contient un tableau, l'utiliser directement
      if (cached && Array.isArray(cached)) {
        allFlights = cached;
      }
      
      if (!allFlights) {
        // Vérifier si on a déjà récupéré les deux directions en cache
        const cachedBoth = await getNormalizedFlightsCache(normalizedCacheKeyBoth);
        if (cachedBoth && !Array.isArray(cachedBoth) && cachedBoth.departures && cachedBoth.arrivals) {
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
