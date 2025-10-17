export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cachedRequest } from "@/lib/requestDeduplication";
// Authentication disabled - all features are public

// mêmes variables que l’ancienne version
const RAPID_KEY = process.env.RAPID_KEY || process.env.AIRREG_API_KEY;
const RAPID_HOST =
  process.env.RAPID_HOST ||
  process.env.AIRREG_API_HOST ||
  "aerodatabox.p.rapidapi.com";

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
  const url = `https://${RAPID_HOST}${pathPart}`;
  let attempt = 0,
    last: Up = { ok: false, status: 0, text: "", url };
  while (attempt < 3) {
    const r = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "X-RapidAPI-Host": RAPID_HOST,
        "X-RapidAPI-Key": String(RAPID_KEY),
      },
    });
    const text = await r.text();
    last = { ok: r.ok, status: r.status, text, url };
    if (r.ok) return last;
    if (r.status >= 500 || r.status === 429) {
      await new Promise((res) =>
        setTimeout(res, 300 * Math.pow(2, attempt) + Math.random() * 200)
      );
      attempt++;
      continue;
    }
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

// --- handler Next.js
export async function GET(
  req: Request,
  ctx: { params: Promise<{ reg: string }> }
) {
  if (!RAPID_KEY) {
    return NextResponse.json({ error: "Missing RAPID_KEY" }, { status: 500 });
  }

  // All features are now public - no authentication required

  const { reg } = await ctx.params;
  if (reg === "ping") return NextResponse.json({ ok: true, reg });

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

  // 4️⃣ Erreur amont
  return new NextResponse(
    last?.text || JSON.stringify({ error: "Upstream error" }),
    {
      status: last?.status || 502,
      headers: { "Content-Type": "application/json", "X-Cache": "MISS" },
    }
  );
}
