import { NextResponse } from "next/server";
import { getAircraftData } from "@/lib/globalApiCache";
import { env } from "@/config/env";

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
   AeroDataBox Configuration
========================= */
const AERODATABOX_HOST = "aerodatabox.p.rapidapi.com";
const AERODATABOX_API_KEY = env.aerodatabox.apiKey;

/* =========================
   Helpers
========================= */
function getBaseUrl(req: Request) {
  const h = new Headers(req.headers);
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

type AeroDataBoxImage = {
  url: string;
  width: number;
  height: number;
  source?: string;
  author?: string;
  license?: string;
  title?: string;
};

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

/* =========================
   AeroDataBox Image Fetch
========================= */
async function fetchAeroDataBoxImages(registration: string): Promise<Img[]> {
  if (!AERODATABOX_API_KEY) {
    console.log("[IMAGES-API] No AeroDataBox API key available");
    return [];
  }

  const url = `https://${AERODATABOX_HOST}/aircrafts/reg/${encodeURIComponent(registration)}/image/beta`;
  
  try {
    const response = await fetch(url, {
      headers: {
        "X-RapidAPI-Host": AERODATABOX_HOST,
        "X-RapidAPI-Key": AERODATABOX_API_KEY,
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.log(`[IMAGES-API] AeroDataBox API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`[IMAGES-API] AeroDataBox error response:`, errorText);
      return [];
    }

    let data;
    try {
      const responseText = await response.text();
      if (!responseText.trim()) {
        console.log(`[IMAGES-API] Empty response from AeroDataBox for ${registration}`);
        return [];
      }
      data = JSON.parse(responseText);
      console.log(`[IMAGES-API] AeroDataBox response for ${registration}:`, data);
    } catch (parseError) {
      console.error(`[IMAGES-API] JSON parse error for ${registration}:`, parseError);
      return [];
    }
    
    // Log if no images found
    if (!data || (!data.url && (!data.images || data.images.length === 0))) {
      console.log(`[IMAGES-API] No images available for ${registration} in AeroDataBox`);
    }

    // Convertir la réponse AeroDataBox en format standard
    const images: Img[] = [];
    
    if (data && typeof data === 'object') {
      // Si c'est un objet avec des propriétés d'image
      if (data.url) {
        images.push({
          url: data.url,
          original: data.url,
          source: data.source || "AeroDataBox",
          width: data.width || 0,
          height: data.height || 0,
          author: data.author || "AeroDataBox",
          license: data.license || "AeroDataBox",
          title: data.title || `${registration} Aircraft Image`,
        });
      }
      
      // Si c'est un tableau d'images
      if (Array.isArray(data.images)) {
        data.images.forEach((img: AeroDataBoxImage) => {
          if (img.url) {
            images.push({
              url: img.url,
              original: img.url,
              source: img.source || "AeroDataBox",
              width: img.width || 0,
              height: img.height || 0,
              author: img.author || "AeroDataBox",
              license: img.license || "AeroDataBox",
              title: img.title || `${registration} Aircraft Image`,
            });
          }
        });
      }
    }

    console.log(`[IMAGES-API] Found ${images.length} images from AeroDataBox`);
    return images;

  } catch (error) {
    console.error(`[IMAGES-API] Error fetching AeroDataBox images for ${registration}:`, error);
    return [];
  }
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

  // Mode A: registration fournie directement
  const reg = (searchParams.get("q") || searchParams.get("reg") || "").trim();
  
  // Mode B: airline+model fournis (fallback)
  let airline = (searchParams.get("airline") || "").trim();
  let model = (searchParams.get("model") || "").trim();

  // Si on a une registration, on l'utilise directement
  if (reg) {
    const keyBase = `images:${reg.toUpperCase()}`;
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

      // === Requête AeroDataBox avec la registration ===
      console.log(`[IMAGES-API] Fetching AeroDataBox images for registration: ${reg}`);
      let images = await fetchAeroDataBoxImages(reg);
      console.log(`[IMAGES-API] Found ${images.length} images from AeroDataBox`);

      // Si pas d'images trouvées, essayer de récupérer les infos avion pour fallback
      if (images.length === 0) {
        console.log(`[IMAGES-API] No images found for ${reg}, trying aircraft data fallback`);
        const baseUrl = getBaseUrl(req);
        const acKey = `aircraft:${reg.toUpperCase()}`;

        try {
          const resp = await fetch(`${baseUrl}/api/aircraft/${reg}`, {
            cache: "no-store",
            headers: {
              Cookie: req.headers.get("cookie") || "",
              "User-Agent": req.headers.get("user-agent") || "PlaneWise-Images-API",
            },
          });
          
          if (resp.ok) {
            const ac = await resp.json();
            airline = ac?.airlineName || ac?.operator || "";
            model = ac?.model || ac?.typeName || ac?.aircraftModel || "";
            
            console.log(`[IMAGES-API] Aircraft data for fallback:`, {
              airline,
              model,
              rawData: ac,
            });
          }
        } catch (error) {
          console.log(`[IMAGES-API] Error fetching aircraft data for fallback:`, error);
        }
      }

      // Nettoyage et limitation
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

  // Fallback: si pas de registration, retourner vide
  console.log(`[IMAGES-API] No registration provided, returning empty images`);
  return NextResponse.json({ images: [] });
}
