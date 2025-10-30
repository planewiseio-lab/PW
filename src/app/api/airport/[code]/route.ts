import { NextResponse } from "next/server";
import { correctFlightStatus } from "@/lib/flightStatusRules";
import { withAirportBrowseAccess } from "@/lib/withActionAccess";

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

    const codeType = detectCodeType(code);
    const base =
      process.env.AIRREG_API_BASE || "https://aerodatabox.p.rapidapi.com";
    const upstream = new URL(
      `${base}/flights/airports/${codeType}/${encodeURIComponent(code)}`
    );
    upstream.searchParams.set(
      "direction",
      dir === "departures" ? "Departure" : "Arrival"
    );
    upstream.searchParams.set("withCancelled", String(withCancelled));
    upstream.searchParams.set("withCodeshared", String(withCodeshared));
    upstream.searchParams.set("withLocation", String(withLocation));
    upstream.searchParams.set("withCargoOnly", "false");
    upstream.searchParams.set("withPrivateOnly", "false");
    upstream.searchParams.set("withLeg", "false"); // Désactiver pour accélérer
    upstream.searchParams.set("withAircraftImage", "false");
    upstream.searchParams.set("withVirtual", "false"); // Désactiver pour accélérer
    upstream.searchParams.set("withTimeSummaries", "false");
    upstream.searchParams.set("hoursBeforeNow", String(hoursBefore));
    upstream.searchParams.set("hoursAfterNow", String(hoursAfter));

    // Short-lived in-memory cache to reduce upstream latency for repeated queries
    const cacheKey = upstream.toString();
    const now = Date.now();
    const __cache: Map<string, { text: string; ts: number; ttl: number }> =
      (global as any).__airportFidsCache || new Map();
    (global as any).__airportFidsCache = __cache;

    const cached = __cache.get(cacheKey);
    if (cached && now - cached.ts < cached.ttl) {
      let data: any;
      try {
        data = JSON.parse(cached.text);
      } catch {
        data = {};
      }

      const allFlights = normalizeFids(data, dir);
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
            "X-Cache": "HIT",
          },
        }
      );
    }

    try {
      // Add timeout to upstream fetch to avoid long waits
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const r = await fetch(upstream.toString(), {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "X-RapidAPI-Key": String(apiKey),
          "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const text = await r.text();
      if (!r.ok) {
        return NextResponse.json(
          {
            error: "upstream_error",
            status: r.status,
            detail: text,
            url: upstream.toString(),
          },
          { status: 502 }
        );
      }
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        data = {};
      }

      // Cache for 90 seconds to absorb repeated queries
      __cache.set(cacheKey, { text, ts: now, ttl: 90 * 1000 });

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
      const status = e?.name === "AbortError" ? 504 : 500;
      return NextResponse.json(
        { error: e?.message || "fetch_failed", code: status === 504 ? "UPSTREAM_TIMEOUT" : "INTERNAL_ERROR" },
        { status }
      );
    }
  }
);

// TIER 1: Airport information endpoint
async function getAirportInfo(code: string, apiKey: string) {
  const codeType = detectCodeType(code);
  const base =
    process.env.AIRREG_API_BASE || "https://aerodatabox.p.rapidapi.com";
  const upstream = new URL(
    `${base}/airports/${codeType}/${encodeURIComponent(code)}`
  );

  try {
    const r = await fetch(upstream.toString(), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "X-RapidAPI-Key": String(apiKey),
        "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
      },
    });
    const text = await r.text();
    if (!r.ok) {
      return NextResponse.json(
        {
          error: "upstream_error",
          status: r.status,
          detail: text,
          url: upstream.toString(),
        },
        { status: 502 }
      );
    }
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }

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

function normalizeAirportInfo(u: any) {
  // Handle nested objects for name, city, country
  const getName = (obj: any) => {
    if (typeof obj === "string") return obj;
    if (obj && typeof obj === "object") {
      return obj.name || obj.fullName || obj.text || "";
    }
    return "";
  };

  const getCity = (obj: any) => {
    if (typeof obj === "string") return obj;
    if (obj && typeof obj === "object") {
      return obj.name || obj.city || obj.municipality || "";
    }
    return "";
  };

  const getCountry = (obj: any) => {
    if (typeof obj === "string") return obj;
    if (obj && typeof obj === "object") {
      return obj.name || obj.country || obj.countryName || "";
    }
    return "";
  };

  // Handle elevation object with multiple units
  const getElevation = (obj: any) => {
    if (typeof obj === "number") return obj;
    if (obj && typeof obj === "object") {
      // Prefer feet, then meters, then any other unit
      return obj.feet || obj.meter || obj.km || obj.mile || obj.nm || null;
    }
    return null;
  };

  return {
    name: getName(u?.name) || getName(u?.fullName) || "",
    iata: u?.iata || u?.iataCode || "",
    icao: u?.icao || u?.icaoCode || "",
    city: getCity(u?.city) || getCity(u?.municipality) || "",
    country: getCountry(u?.country) || getCountry(u?.countryName) || "",
    countryCode: u?.countryCode || u?.countryIso || "",
    timezone: u?.timezone || u?.timeZone || "",
    latitude: u?.latitude || u?.lat || null,
    longitude: u?.longitude || u?.lng || u?.lon || null,
    elevation:
      getElevation(u?.elevation) || getElevation(u?.elevationFeet) || null,
    website: u?.website || u?.url || "",
    description: u?.description || u?.summary || "",
  };
}

function normalizeFids(u: any, direction: Direction = "departures") {
  const list = Array.isArray(u)
    ? u
    : u?.departures || u?.arrivals || u?.items || u?.data || [];

  return (list as any[]).map((x) => {
    // Status extraction
    const status = x?.status || x?.movement?.status || {};
    const statusText =
      status?.text || status?.generic?.statusText || status || "Unknown";

    // Flight info
    const flight = x?.flight || {};
    const number = flight?.number || x?.number || x?.callsign || "";
    const icao = flight?.icao || x?.icao || "";
    const iata = flight?.iata || x?.iata || "";

    // Airline
    const airline = x?.airline || x?.airlineName || x?.operator || {};
    const airlineName = airline?.name || airline || "";

    // Time extraction - use the correct API structure
    let time = "";
    let timeObj = null;

    // Les données sont dans movement.scheduledTime
    timeObj = x?.movement?.scheduledTime;

    if (typeof timeObj === "string") {
      time = timeObj;
    } else if (timeObj && typeof timeObj === "object") {
      time = timeObj.local || timeObj.utc || timeObj.scheduled || "";
    }

    // Airport codes - use the correct API structure
    let airport: any = {};

    // Les données d'aéroport sont dans movement.airport
    airport = x?.movement?.airport || {};

    const airportCode = airport?.iata || airport?.icao || airport?.code || "";
    const airportName =
      airport?.name || airport?.shortName || airport?.city || "";

    // Aircraft registration
    const aircraft = x?.aircraft || {};
    const reg =
      aircraft?.reg || aircraft?.registration || x?.registration || "";

    // Gate/Terminal
    const gate = x?.departure?.gate || x?.arrival?.gate || x?.gate || "";
    const terminal =
      x?.departure?.terminal || x?.arrival?.terminal || x?.terminal || "";
    const gateInfo = gate || terminal || "";

    // Appliquer les règles de correction de statut
    const flightData = {
      status: statusText,
      departure: {
        scheduledTime: direction === "departures" ? time : undefined,
        actualTime: direction === "departures" ? time : undefined,
      },
      arrival: {
        scheduledTime: direction === "arrivals" ? time : undefined,
        estimatedTime: direction === "arrivals" ? time : undefined,
        actualTime: direction === "arrivals" ? time : undefined,
      },
    };

    const correctedFlight = correctFlightStatus(flightData);
    const finalStatus = correctedFlight.status;

    return {
      id: String(x?.id || `${number}-${time}-${Math.random()}`),
      number: number || iata || icao,
      airline: airlineName,
      to: direction === "departures" ? airportCode : "",
      from: direction === "arrivals" ? airportCode : "",
      airportName: airportName,
      reg,
      status: finalStatus,
      time,
      gate: gateInfo,
    };
  });
}
