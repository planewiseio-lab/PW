import { NextResponse } from "next/server";
import { getAircraftData } from "@/lib/globalApiCache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================
   In-memory cache
========================= */
const IMAGES_TTL_MS = 1000 * 60 * 60 * 6; // 6h (images)
const AIRCRAFT_TTL_MS = 1000 * 60 * 60 * 24; // 24h (fiche avion)

const cache = new Map<string, { data: any; exp: number }>();
const getCache = <T = any>(k: string): T | null => {
  const v = cache.get(k);
  if (v && v.exp > Date.now()) return v.data as T;
  cache.delete(k);
  return null;
};
const setCache = (k: string, data: any, ttl: number) =>
  cache.set(k, { data, exp: Date.now() + ttl });

/* =========================
   In-flight (coalescing)
========================= */
const inflight = new Map<string, Promise<any>>();
function coalesce<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/* =========================
   Helpers
========================= */
function getBaseUrl(req: Request) {
  const h = new Headers(req.headers);
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

function commonsSearchURL(q: string) {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  u.searchParams.set("action", "query");
  u.searchParams.set("format", "json");
  u.searchParams.set("origin", "*");
  u.searchParams.set("generator", "search");
  u.searchParams.set("gsrsearch", q); // déjà propre: "Airline" "Model"
  u.searchParams.set("gsrnamespace", "6"); // File:
  u.searchParams.set("gsrlimit", "24");
  u.searchParams.set("prop", "imageinfo");
  u.searchParams.set("iiprop", "url|extmetadata|mime|size");
  u.searchParams.set("iiurlwidth", "1280"); // plus léger → plus rapide
  u.searchParams.set("iiurlheight", "1280");
  return u.toString();
}

type Img = {
  url: string;
  original: string;
  source?: string;
  width: number;
  height: number;
  author?: string;
  license?: string;
  title?: string;
};

const isWiki = (u: string) =>
  /^(https?:)?\/\/(upload|commons)\.wikimedia\.org\//i.test(u);

function dedupe(list: Img[]) {
  const seen = new Set<string>();
  return list.filter((x) => {
    const key = x.original || x.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function filterWide(list: Img[], minWidth = 900, minAspect = 1.2) {
  const wide = list.filter((im) => {
    const w = im.width ?? 0;
    const h = im.height ?? 1;
    return w >= minWidth && w / h >= minAspect;
  });
  return wide.length ? wide : list;
}

/* === Normalisation simple du modèle === */
function normalizeModel(raw: string) {
  if (!raw) return "";
  let m = raw.trim();
  if (/^A21N$/i.test(m)) m = "A321";
  if (/^A20N$/i.test(m)) m = "A320";
  if (/^A359$/i.test(m)) m = "A350-900";
  if (/^A339$/i.test(m)) m = "A330-900";
  if (/^B789$/i.test(m)) m = "787-9";
  if (/^B788$/i.test(m)) m = "787-8";
  if (/^B38M$/i.test(m)) m = "737-8";
  // Airbus A321-211 → A321
  if (/^A\d{3}-\d+/i.test(m)) m = m.replace(/-.+$/, "");
  return m;
}

/* =========================
   Wikimedia fetch (single)
========================= */
async function fetchCommonsSingle(q: string): Promise<Img[]> {
  const r = await fetch(commonsSearchURL(q), {
    headers: {
      "User-Agent": "PlaneWise/2.0 (contact@plane-wise.com)",
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!r.ok) return [];
  const j = await r.json();
  const pages = j?.query?.pages || {};
  const out: Img[] = [];
  for (const p of Object.values<any>(pages)) {
    const ii = p?.imageinfo?.[0];
    if (!ii) continue;
    const full = ii.url || ii.thumburl;
    const thumb = ii.thumburl || ii.url;
    if (!full || !thumb) continue;
    if (!isWiki(full) && !isWiki(thumb)) continue;

    out.push({
      url: thumb,
      original: full,
      source: ii.descriptionurl,
      width: ii.thumbwidth || ii.width,
      height: ii.thumbheight || ii.height,
      author: ii.extmetadata?.Artist?.value || "",
      license: ii.extmetadata?.LicenseShortName?.value || "",
      title: p.title,
    });
  }
  return out;
}

/* =========================
   MAIN HANDLER
========================= */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("cache") === "refresh";

  console.log(`[IMAGES-API] Request received:`, {
    url: req.url,
    searchParams: Object.fromEntries(searchParams.entries()),
    force,
  });

  // Mode A: airline+model fournis
  let airline = (searchParams.get("airline") || "").trim();
  let model = (searchParams.get("model") || "").trim();

  // Mode B: on reçoit une REG dans ?q= → on résout via /api/aircraft/:reg
  const reg = (searchParams.get("q") || "").trim();

  if (!airline && !model && reg) {
    const acKey = `aircraft:${reg.toUpperCase()}`;
    const baseUrl = getBaseUrl(req);

    const ac = await coalesce(acKey + (force ? ":refresh" : ""), async () => {
      const cached = !force ? getCache<any>(acKey) : null;
      if (cached) return cached;

      try {
        // Appel direct à l'API des avions au lieu du cache global
        const resp = await fetch(`${baseUrl}/api/aircraft/${reg}`, {
          cache: "no-store",
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        setCache(acKey, data, AIRCRAFT_TTL_MS);
        return data;
      } catch {
        return null;
      }
    });

    airline = ac?.airlineName || ac?.operator || "";
    model = ac?.model || ac?.typeName || ac?.aircraftModel || "";

    console.log(`[IMAGES-API] Aircraft data for ${reg}:`, {
      airline,
      model,
      rawData: ac,
    });
  }

  if (!airline && !model) {
    console.log(
      `[IMAGES-API] No airline/model found for ${reg}, returning empty images`
    );
    return NextResponse.json({ images: [] });
  }

  const family = normalizeModel(model);
  const keyBase = `images:${(airline + "|" + family).toLowerCase()}`;
  const key = keyBase + (force ? ":refresh" : "");

  const payload = await coalesce(key, async () => {
    if (!force) {
      const cached = getCache<{ images: Img[] }>(keyBase);
      if (cached) {
        console.log(`[CACHE] hit images ${keyBase}`);
        return cached;
      }
    }

    console.log(`[CACHE] fetching images for ${keyBase}`);

    // === 1 seule requête Wikimedia (Airline + Modèle normalisé) ===
    const query = `"${airline}" "${family || model}"`.trim();
    console.log(`[IMAGES-API] Searching Wikimedia with query: "${query}"`);
    let images = await fetchCommonsSingle(query);
    console.log(`[IMAGES-API] Found ${images.length} images from Wikimedia`);

    // Nettoyage
    images = filterWide(dedupe(images)).slice(0, 12);

    const out = { images };
    setCache(keyBase, out, IMAGES_TTL_MS);
    console.log(
      `[CACHE] stored images ${keyBase} for ${Math.floor(
        IMAGES_TTL_MS / (1000 * 60 * 60)
      )}h`
    );
    return out;
  });

  return NextResponse.json(payload);
}
