export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cachedRequest } from "@/lib/requestDeduplication";
import { withAircraftLookupAccess as withAircraftAccess } from "@/lib/withActionAccess";
import { logApiRequest } from "@/lib/apiTracker";
import { createClient } from "@/lib/supabase/server";

// Configuration pour api.market (seul provider)
const API_MARKET_KEY = process.env.API_MARKET_KEY || process.env.AIRREG_API_KEY;
// Base URL pour fallback (si nécessaire)
const AERODATABOX_BASE_URL = process.env.API_MARKET_BASE_URL || "https://prod.api.market/api/v1/aedbx/aerodatabox";

// --- petit cache mémoire local (équivalent à getCache/setCache)
const cacheStore = new Map<string, { data: string; expires: number }>();
const AIRCRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function getCache(key: string) {
  const c = cacheStore.get(key);
  if (c && Date.now() < c.expires) return c.data;
  if (c) cacheStore.delete(key);
  return null;
}
function setCache(key: string, data: string, ttl = AIRCRAFT_TTL_MS) {
  cacheStore.set(key, { data, expires: Date.now() + ttl });
}

// --- helpers (copie de l’ancienne logique)
type Up = { ok: boolean; status: number; text: string; url: string };

async function callAero(pathPart: string): Promise<Up> {
  // api.market REST API - selon documentation: https://docs.api.market
  // Base URL: https://prod.api.market/api/v1
  // Authentication: x-magicapi-key header
  
  // Structure 1: URL REST api.market officielle (prod.api.market/api/v1/{workspace}/{product})
  const url1 = `https://prod.api.market/api/v1/aedbx/aerodatabox${pathPart}`;
  
  // Structure 2: URL api.market sans prod (fallback)
  const url2 = `https://api.market/api/v1/aedbx/aerodatabox${pathPart}`;
  
  // Structure 3: URL api.market alternative (sans /v1)
  const url3 = `https://api.market/api/aedbx/aerodatabox${pathPart}`;
  
  // Structure 4: URL api.market directe (structure simplifiée)
  const url4 = `https://api.market/aedbx/aerodatabox${pathPart}`;
  
  const urlsToTry = [url1, url2, url3, url4];
    
  let attempt = 0;
  let last: Up = { ok: false, status: 0, text: "", url: urlsToTry[0] };
  const startTime = Date.now();

  for (const url of urlsToTry) {
    attempt++;
    console.log(`[callAero] Attempt ${attempt}: Fetching URL: ${url}`);
    
    // api.market REST API utilise x-magicapi-key (selon documentation officielle)
    // Essayer aussi x-api-market-key pour compatibilité MCP
    const headers: HeadersInit = {
      Accept: "application/json",
      "x-magicapi-key": String(API_MARKET_KEY),
      // Ajouter aussi x-api-market-key pour compatibilité avec MCP
      "x-api-market-key": String(API_MARKET_KEY),
    };
    
    // Log des headers pour debug
    if (attempt === 1) {
      console.log(`[callAero] Using api.market REST with headers: x-magicapi-key and x-api-market-key`);
    }
    
    const r = await fetch(url, {
      cache: "no-store",
      headers,
    });
    const text = await r.text();
    last = { ok: r.ok, status: r.status, text, url };
    console.log(`[callAero] Response status: ${r.status}, URL: ${url}`);
    if (text.length > 0 && !text.startsWith("<!DOCTYPE")) {
      console.log(`[callAero] Response preview: ${text.substring(0, 200)}`);
    } else if (text.startsWith("<!DOCTYPE")) {
      console.log(`[callAero] Response is HTML (404 page)`);
    }
    
    // Si erreur 503 avec message Redis, c'est probablement une interception locale
    if (r.status === 503 && text.includes("Redis")) {
      console.log(`[callAero] WARNING: Got Redis error - URL might be intercepted locally or DNS issue`);
    }

    // Logger seulement la première tentative (éviter les dups)
    if (attempt === 1) {
      const responseTime = Date.now() - startTime;
      const { logApiRequest } = await import("@/lib/apiTracker");

      // Récupérer l'utilisateur pour le logging
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await logApiRequest(
        pathPart,
        "GET",
        r.status,
        responseTime,
        user?.id || null
      );
    }

    // Si succès, on retourne
    if (r.ok) {
      return last;
    }
    
    // Si erreur 401/403, essayer la prochaine URL si disponible
    if ((r.status === 401 || r.status === 403) && attempt < urlsToTry.length) {
      console.log(`[callAero] Auth error (${r.status}) with current URL, trying next URL...`);
      continue;
    }
    
    // Si erreur 500/429, retry la même URL après délai
    if (r.status >= 500 || r.status === 429) {
      if (attempt <= 3) {
        await new Promise((res) =>
          setTimeout(res, 300 * Math.pow(2, attempt) + Math.random() * 200)
        );
        // Retry la même URL
        attempt--;
        continue;
      }
    }
    
    // Si 404 et qu'on peut essayer une autre URL, continuer
    if (r.status === 404 && attempt < urlsToTry.length) {
      console.log(`[callAero] 404 with current URL, trying next URL...`);
      continue;
    }
    
    // Pour les autres erreurs, arrêter
    break;
  }
  
  return last;
}

function variants(reg: string) {
  const up = String(reg || "")
    .trim()
    .toUpperCase();
  const noDash = up.replace(/-/g, "");
  return [
    `/aircrafts/reg/${encodeURIComponent(up)}`,
    `/aircrafts/reg/${encodeURIComponent(noDash)}`,
    `/aircrafts/registration/${encodeURIComponent(up)}`,
    `/aircrafts/registration/${encodeURIComponent(noDash)}`,
  ];
}

// fallback “minimal” construit depuis l’historique de vols
async function buildAircraftFromFlights(reg: string) {
  const now = new Date();
  const from = new Date(Date.now() - 14 * 86400000);
  const fromDate = from.toISOString().slice(0, 10);
  const toDate = now.toISOString().slice(0, 10);

  const candidates = [
    `/flights/Reg/${encodeURIComponent(reg)}/${encodeURIComponent(
      fromDate
    )}/${encodeURIComponent(
      toDate
    )}?withLocation=true&withCodeshared=true&withCancelled=true&limit=200`,
    `/flights/Reg/${encodeURIComponent(reg)}/${encodeURIComponent(
      fromDate
    )}/${encodeURIComponent(toDate)}`,
  ];

  for (const p of candidates) {
    const resp = await callAero(p);
    if (!resp.ok || !resp.text) continue;

    let data: any = null;
    try {
      data = JSON.parse(resp.text);
    } catch {}
    const arr = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : [];
    if (!arr.length) continue;

    const f = arr[arr.length - 1] || arr[0];
    const ac = f?.aircraft || {};
    const al = f?.airline || {};
    const typ = ac.model || f?.model || "";

    return {
      id: 0,
      reg: String(reg).toUpperCase(),
      active: true,
      serial: null,
      hexIcao: ac.modeS || null,
      airlineName: al.name || null,
      model: typ || null,
      typeName: typ || null,
      isFreighter: !!f?.isCargo,
      productionLine: typ ? typ.split(" ")[0] : null,
      verified: false,
      numRegistrations: 1,
    };
  }
  return null;
}

// --- handler Next.js with combined access control (guest quota or credits)

export const GET = withAircraftAccess(
  async (req: Request, ctx: { params: Promise<{ reg: string }> }) => {
    if (!API_MARKET_KEY) {
      return NextResponse.json({ error: "Missing API_MARKET_KEY - api.market key required" }, { status: 500 });
    }

    const { reg } = await ctx.params;
    if (reg === "ping") return NextResponse.json({ ok: true, reg });

    // Log API request
    const startTime = Date.now();
    const endpoint = `/api/aircraft/${reg}`;

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Log the request (async, don't wait)
      logApiRequest(
        endpoint,
        "GET",
        200,
        Date.now() - startTime,
        user?.id || null
      );
    } catch (error) {
      console.error("Error logging API request:", error);
    }

    const cacheKey = `aircraft:${reg.toUpperCase()}`;
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("cache") === "refresh";

    // 1️⃣ Vérifie le cache
    if (!forceRefresh) {
      const cached = getCache(cacheKey);
      if (cached) {
        console.log(`[CACHE] hit aircraft ${reg}`);
        return new NextResponse(cached, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Cache": "HIT",
          },
        });
      }
    }

    let last: Up | null = null;

    // 2️⃣ Essayer les variantes /aircrafts/* avec déduplication
    for (const p of variants(reg)) {
      const resp = await cachedRequest(
        `aircraft-api:${p}`,
        () => callAero(p),
        10 * 60 * 1000 // 10 min cache pour les appels API
      );
      last = resp;
      if (resp.ok) {
        const body = resp.text && resp.text.trim() ? resp.text : "{}";
        setCache(cacheKey, body, AIRCRAFT_TTL_MS);
        console.log(`[CACHE] stored aircraft ${reg} for 24h`);
        return new NextResponse(body, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Cache": "MISS",
          },
        });
      }
    }

    // 3️⃣ fallback via /flights/Reg/* si 404
    if (last?.status === 404) {
      const minimal = await buildAircraftFromFlights(reg);
      if (minimal) {
        const body = JSON.stringify(minimal);
        setCache(cacheKey, body, 60 * 60 * 1000); // 1h
        console.log(`[FALLBACK] rebuilt and cached minimal aircraft ${reg}`);
        return new NextResponse(body, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Cache": "MISS-FALLBACK",
          },
        });
      }
    }

    // 4️⃣ Erreur amont - Gérer différents types d'erreurs de l'API externe
    let errorMessage = "Upstream error";
    let errorCode = "UPSTREAM_ERROR";
    
    if (last?.status === 401) {
      errorMessage = "API authentication failed. Please check your API subscription.";
      errorCode = "API_AUTH_ERROR";
    } else if (last?.status === 403) {
      errorMessage = "API access forbidden. Your subscription may have expired or reached its limit.";
      errorCode = "API_FORBIDDEN";
    } else if (last?.status === 429) {
      errorMessage = "API rate limit exceeded. Please try again later.";
      errorCode = "API_RATE_LIMIT";
    } else if (last?.status === 500 || last?.status === 502 || last?.status === 503) {
      errorMessage = "External API service unavailable. Please try again later.";
      errorCode = "API_SERVICE_UNAVAILABLE";
    } else if (last?.status === 404) {
      errorMessage = "Aircraft not found in the database.";
      errorCode = "AIRCRAFT_NOT_FOUND";
    } else if (last?.status) {
      errorMessage = `External API error (status: ${last.status})`;
      errorCode = "API_ERROR";
    }
    
    // Essayer de parser le texte d'erreur de l'API pour plus de détails
    let errorDetail = null;
    if (last?.text) {
      try {
        const parsed = JSON.parse(last.text);
        if (parsed.message || parsed.error) {
          errorDetail = parsed.message || parsed.error;
        }
      } catch {
        // Si le parsing échoue, utiliser le texte brut
        if (last.text.length < 200) {
          errorDetail = last.text;
        }
      }
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        code: errorCode,
        detail: errorDetail,
        status: last?.status || 502,
      },
      {
        status: last?.status || 502,
        headers: { "Content-Type": "application/json", "X-Cache": "MISS" },
      }
    );
  }
);
