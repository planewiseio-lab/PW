import { getRedisLike } from "@/lib/redisClient";

const ABD_BASE = process.env.API_MARKET_BASE_URL || process.env.AIRREG_API_BASE || "https://prod.api.market/api/v1/aedbx/aerodatabox";
const ABD_KEY = process.env.API_MARKET_KEY || process.env.AIRREG_API_KEY || "";

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
	
	// api.market REST API - tester plusieurs URLs
	// Structure 1: URL REST api.market officielle (prod.api.market/api/v1/{workspace}/{product})
	const url1 = `https://prod.api.market/api/v1/aedbx/aerodatabox${path}?${params.toString()}`;
	
	// Structure 2: URL api.market sans prod (fallback)
	const url2 = `https://api.market/api/v1/aedbx/aerodatabox${path}?${params.toString()}`;
	
	// Structure 3: URL api.market alternative (sans /v1)
	const url3 = `https://api.market/api/aedbx/aerodatabox${path}?${params.toString()}`;
	
	// Structure 4: URL api.market directe (structure simplifiée)
	const url4 = `https://api.market/aedbx/aerodatabox${path}?${params.toString()}`;
	
	const urlsToTry = [url1, url2, url3, url4];
	
	let attempt = 0;
	let lastErr: any;
	const start = Date.now();
	
	// Essayer chaque URL jusqu'à trouver une qui fonctionne
	for (const url of urlsToTry) {
		attempt = 0;
		while (attempt <= retry) {
			try {
				const res = await fetchWithTimeout(url, {
					headers: {
						Accept: "application/json",
						"x-magicapi-key": String(ABD_KEY), // api.market REST API header (selon documentation)
						"x-api-market-key": String(ABD_KEY), // Compatibilité MCP
					},
					cache: "no-store",
				}, timeoutMs);
				const text = await res.text();
				
				// Si succès, retourner immédiatement
				if (res.ok) {
					try {
						return { data: JSON.parse(text), latencyMs: Date.now() - start };
					} catch {
						return { data: {}, latencyMs: Date.now() - start };
					}
				}
				
				// Si erreur 401/403, essayer la prochaine URL (pas de retry)
				if (res.status === 401 || res.status === 403) {
					console.log(`[ABD Client] Auth error (${res.status}) with ${url.substring(0, 80)}..., trying next...`);
					break; // Sortir de la boucle while, passer à la prochaine URL
				}
				
				// Pour les autres erreurs (429, 500, etc.), retry ou essayer la prochaine URL
				if (attempt < retry) {
					// Retry la même URL
					throw new Error(`ABD ${res.status}: ${text.slice(0, 200)}`);
				} else {
					// Dernière tentative pour cette URL, essayer la prochaine URL
					break;
				}
			} catch (e: any) {
				lastErr = e;
				if (attempt === retry) {
					// Si c'est la dernière tentative pour cette URL et la dernière URL, lancer l'erreur
					if (url === urlsToTry[urlsToTry.length - 1]) {
						break; // Sortir de la boucle while et for
					}
					// Essayer la prochaine URL
					break;
				}
				// Retry avec délai
				await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
				attempt++;
			}
		}
		// Si on a réussi, on ne devrait pas arriver ici (return dans le try)
		// Si on arrive ici, c'est qu'on doit essayer la prochaine URL
	}
	
	// Si toutes les URLs ont échoué
	if (lastErr) throw lastErr;
	throw new Error("All API endpoints failed");
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
	const ttl = opts.cacheTtlSeconds ?? 3600; // 1 heure par défaut (augmenté de 5min à 1h car le coût de stockage est faible)
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

// Fonction pour récupérer les deux (departures et arrivals) en un seul appel
export async function getFlightsRelativeBoth(code: string, beforeHours: number, afterHours: number, opts: AbdClientOptions = {}) {
	const ttl = opts.cacheTtlSeconds ?? 60 * 60; // 1 heure par défaut (3600 secondes)
	const codeType = code.trim().length === 4 ? "icao" : "iata";
	const cacheKey = `abd:fids:${codeType}:${code.toUpperCase()}:both:${beforeHours}:${afterHours}`;
	return cachedJson(cacheKey, async () => {
		const params = new URLSearchParams();
		// Ne pas spécifier direction pour obtenir les deux
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


