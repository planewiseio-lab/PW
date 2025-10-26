/**
 * Cache global unifié pour toutes les APIs
 * Évite les appels multiples et synchronise tous les caches
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  abortController?: AbortController;
}

// Cache global unifié
const globalCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, PendingRequest>();

// Configuration
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const API_TIMEOUT = 15 * 1000; // 15 secondes

// Nettoyage automatique
setInterval(() => {
  const now = Date.now();

  // Nettoyer les requêtes orphelines
  for (const [key, request] of pendingRequests.entries()) {
    if (now - request.timestamp > REQUEST_TIMEOUT) {
      request.abortController?.abort();
      pendingRequests.delete(key);
    }
  }

  // Nettoyer le cache expiré
  for (const [key, entry] of globalCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      globalCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Nettoyer toutes les 5 minutes

/**
 * Fonction de cache unifiée pour toutes les APIs
 */
export async function cachedApiCall<T>(
  key: string,
  apiCall: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  // Vérifier le cache d'abord
  const cached = globalCache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    console.log(`[GLOBAL-CACHE] hit ${key}`);
    return cached.data;
  }

  // Vérifier si une requête identique est déjà en cours
  if (pendingRequests.has(key)) {
    console.log(`[GLOBAL-CACHE] deduplicating ${key}`);
    return pendingRequests.get(key)!.promise;
  }

  // Créer une nouvelle requête avec timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), API_TIMEOUT);

  const requestPromise = (async (): Promise<T> => {
    try {
      console.log(`[GLOBAL-CACHE] fetching ${key}`);
      const data = await apiCall();

      // Mettre en cache la réponse
      globalCache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
      });

      console.log(
        `[GLOBAL-CACHE] stored ${key} for ${Math.floor(ttl / (1000 * 60))}min`
      );
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    } finally {
      // Nettoyer la requête en cours
      pendingRequests.delete(key);
    }
  })();

  // Enregistrer la requête en cours
  pendingRequests.set(key, {
    promise: requestPromise,
    timestamp: Date.now(),
    abortController,
  });

  return requestPromise;
}

/**
 * API spécialisée pour les avions
 */
export async function getAircraftData(registration: string): Promise<any> {
  const key = `aircraft:${registration.toUpperCase()}`;
  return cachedApiCall(
    key,
    async () => {
      const response = await fetch(
        `/api/aircraft/${encodeURIComponent(registration)}`,
        {
          cache: "no-store",
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    24 * 60 * 60 * 1000
  ); // 24h cache
}

/**
 * API spécialisée pour les images
 */
// Cache des requêtes d'images en cours pour éviter les doublons
const pendingImageRequests = new Map<string, Promise<any>>();

export async function getImagesData(
  query: string,
  refresh = false
): Promise<any> {
  const key = `images:${query}${refresh ? ":refresh" : ""}`;

  // Vérifier si une requête identique est déjà en cours
  if (pendingImageRequests.has(key)) {
    console.log(`[IMAGES-CACHE] Deduplicating request for: ${query}`);
    return pendingImageRequests.get(key);
  }

  const requestPromise = cachedApiCall(
    key,
    async () => {
      const url = `/api/images?q=${encodeURIComponent(query)}${
        refresh ? "&cache=refresh" : ""
      }`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout pour les images

      const response = await fetch(url, {
        cache: "no-store",
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    2 * 60 * 60 * 1000
  ); // 2h cache

  // Enregistrer la requête en cours
  pendingImageRequests.set(key, requestPromise);

  // Nettoyer après completion
  requestPromise.finally(() => {
    pendingImageRequests.delete(key);
  });

  return requestPromise;
}

/**
 * API spécialisée pour les vols
 */
export async function getFlightData(
  flight: string,
  date: string
): Promise<any> {
  const key = `flight:${flight}:${date}`;
  return cachedApiCall(
    key,
    async () => {
      const response = await fetch(`/api/flights/${flight}?dateLocal=${date}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    5 * 60 * 1000
  ); // 5min cache
}

/**
 * Nettoyer le cache global
 */
export function clearGlobalApiCache(pattern?: string) {
  if (pattern) {
    for (const [key] of globalCache) {
      if (key.includes(pattern)) {
        globalCache.delete(key);
      }
    }
    for (const [key] of pendingRequests) {
      if (key.includes(pattern)) {
        pendingRequests.get(key)?.abortController?.abort();
        pendingRequests.delete(key);
      }
    }
  } else {
    globalCache.clear();
    for (const [key, request] of pendingRequests) {
      request.abortController?.abort();
    }
    pendingRequests.clear();
  }
}

/**
 * Obtenir les statistiques du cache
 */
export function getGlobalCacheStats() {
  return {
    cacheEntries: globalCache.size,
    pendingRequests: pendingRequests.size,
    cacheKeys: Array.from(globalCache.keys()),
  };
}
