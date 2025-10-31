import { getRedisLike } from "@/lib/redisClient";

const ABD_BASE = process.env.AIRREG_API_BASE || "https://aerodatabox.p.rapidapi.com";
const ABD_HOST = "aerodatabox.p.rapidapi.com";
const ABD_KEY = process.env.AIRREG_API_KEY || process.env.RAPID_KEY || "";

export interface AbdClientOptions {
    timeoutMs?: number; // default 3000
    retry?: number; // default 1
    cacheTtlSeconds?: number; // default 60
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
	const controller = new AbortController();
	const id = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(url, { ...init, signal: controller.signal });
		return res;
	} finally {
		clearTimeout(id);
	}
}

async function getJsonWithRetry(path: string, params: URLSearchParams, opts: AbdClientOptions) {
    const timeoutMs = opts.timeoutMs ?? 3000;
	const retry = Math.max(0, opts.retry ?? 1);
	const url = `${ABD_BASE}${path}?${params.toString()}`;
	let attempt = 0;
	let lastErr: any;
	const start = Date.now();
	while (attempt <= retry) {
		try {
			const res = await fetchWithTimeout(url, {
				headers: {
					Accept: "application/json",
					"X-RapidAPI-Key": String(ABD_KEY),
					"X-RapidAPI-Host": ABD_HOST,
				},
				cache: "no-store",
			}, timeoutMs);
			const text = await res.text();
			if (!res.ok) throw new Error(`ABD ${res.status}: ${text.slice(0, 200)}`);
			try {
				return { data: JSON.parse(text), latencyMs: Date.now() - start };
			} catch {
				return { data: {}, latencyMs: Date.now() - start };
			}
		} catch (e) {
			lastErr = e;
			if (attempt === retry) break;
			await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
			attempt++;
		}
	}
	throw lastErr;
}

async function cachedJson(key: string, fn: () => Promise<any>, ttlSeconds: number) {
    const redis = getRedisLike();
    const cached = await redis.get(key);
    if (cached) {
        try { return { data: JSON.parse(cached), fromCache: true }; } catch { /* ignore */ }
    }
    try {
        const res = await fn();
        try { await redis.set(key, JSON.stringify(res), undefined, ttlSeconds); } catch { /* ignore */ }
        return { data: res, fromCache: false };
    } catch (e) {
        // Fallback: if no fresh data and no cache, propagate error to caller
        throw e;
    }
}

export async function getAirport(code: string, opts: AbdClientOptions = {}) {
	const ttl = opts.cacheTtlSeconds ?? 300;
	const codeType = code.trim().length === 4 ? "icao" : "iata";
	const cacheKey = `abd:airport:${codeType}:${code.toUpperCase()}`;
	return cachedJson(cacheKey, async () => {
		const params = new URLSearchParams();
		const path = `/airports/${codeType}/${encodeURIComponent(code)}`;
		const { data, latencyMs } = await getJsonWithRetry(path, params, opts);
		return { data, metrics: { latencyMs } };
	}, ttl);
}

export async function getAirportCachedOnly(code: string) {
    const codeType = code.trim().length === 4 ? "icao" : "iata";
    const cacheKey = `abd:airport:${codeType}:${code.toUpperCase()}`;
    const redis = getRedisLike();
    const cached = await redis.get(cacheKey);
    if (!cached) return null;
    try { return JSON.parse(cached); } catch { return null; }
}

export async function getFlightsRelative(code: string, direction: "departures"|"arrivals", beforeHours: number, afterHours: number, opts: AbdClientOptions = {}) {
	const ttl = opts.cacheTtlSeconds ?? 60;
	const codeType = code.trim().length === 4 ? "icao" : "iata";
	const cacheKey = `abd:fids:${codeType}:${code.toUpperCase()}:${direction}:${beforeHours}:${afterHours}`;
	return cachedJson(cacheKey, async () => {
		const params = new URLSearchParams();
		params.set("direction", direction === "departures" ? "Departure" : "Arrival");
		params.set("withCancelled", "true");
		params.set("withCodeshared", "true");
		params.set("withLocation", "true");
		params.set("withCargoOnly", "false");
		params.set("withPrivateOnly", "false");
		params.set("withLeg", "false");
		params.set("withAircraftImage", "false");
		params.set("withVirtual", "false");
		params.set("withTimeSummaries", "false");
		params.set("hoursBeforeNow", String(beforeHours));
		params.set("hoursAfterNow", String(afterHours));
		const path = `/flights/airports/${codeType}/${encodeURIComponent(code)}`;
		const { data, latencyMs } = await getJsonWithRetry(path, params, opts);
		return { data, metrics: { latencyMs } };
	}, ttl);
}

export async function getFlightsRelativeCachedOnly(code: string, direction: "departures"|"arrivals", beforeHours: number, afterHours: number) {
    const codeType = code.trim().length === 4 ? "icao" : "iata";
    const cacheKey = `abd:fids:${codeType}:${code.toUpperCase()}:${direction}:${beforeHours}:${afterHours}`;
    const redis = getRedisLike();
    const cached = await redis.get(cacheKey);
    if (!cached) return null;
    try { return JSON.parse(cached); } catch { return null; }
}

export async function getHistory(reg: string, fromDate: string, toDate: string, opts: AbdClientOptions = {}) {
	const ttl = opts.cacheTtlSeconds ?? 60;
	const cacheKey = `abd:history:${reg.toUpperCase()}:${fromDate}:${toDate}`;
	return cachedJson(cacheKey, async () => {
		const params = new URLSearchParams();
		params.set("withLocation", "true");
		params.set("withCodeshared", "true");
		params.set("withCancelled", "true");
		params.set("limit", "200");
		const path = `/flights/Reg/${encodeURIComponent(reg)}/${encodeURIComponent(fromDate)}/${encodeURIComponent(toDate)}`;
		const { data, latencyMs } = await getJsonWithRetry(path, params, opts);
		return { data, metrics: { latencyMs } };
	}, ttl);
}

export async function getHistoryCachedOnly(reg: string, fromDate: string, toDate: string) {
    const cacheKey = `abd:history:${reg.toUpperCase()}:${fromDate}:${toDate}`;
    const redis = getRedisLike();
    const cached = await redis.get(cacheKey);
    if (!cached) return null;
    try { return JSON.parse(cached); } catch { return null; }
}


