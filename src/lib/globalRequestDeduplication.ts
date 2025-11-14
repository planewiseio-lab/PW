/**
 * Système de déduplication global pour toutes les requêtes API
 * Évite les appels multiples simultanés identiques
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  abortController?: AbortController;
}

const pendingRequests = new Map<string, PendingRequest>();
const responseCache = new Map<
  string,
  { data: any; timestamp: number; ttl: number }
>();

// Configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes par défaut
const REQUEST_TIMEOUT = 30 * 60 * 1000; // 30 minutes pour nettoyer les requêtes orphelines
const API_TIMEOUT = 15 * 1000; // 15 secondes timeout par requête

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
  for (const [key, cached] of responseCache.entries()) {
    if (now - cached.timestamp > cached.ttl) {
      responseCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Nettoyer toutes les 5 minutes

/**
 * Fonction de déduplication globale pour toutes les requêtes
 */
export async function deduplicatedFetch(
  url: string,
  options: RequestInit = {},
  cacheTtl: number = CACHE_DURATION
): Promise<Response> {
  const cacheKey = `fetch:${url}:${JSON.stringify(options)}`;

  // Vérifier le cache d'abord
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    // Retourner une réponse simulée depuis le cache
    return new Response(JSON.stringify(cached.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Vérifier si une requête identique est déjà en cours
  if (pendingRequests.has(cacheKey)) {
    const pending = pendingRequests.get(cacheKey)!;
    return pending.promise;
  }

  // Créer une nouvelle requête avec timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), API_TIMEOUT);

  const requestPromise = (async (): Promise<Response> => {
    try {
      const response = await fetch(url, {
        ...options,
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Mettre en cache la réponse
      responseCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl: cacheTtl,
      });

      // Retourner une nouvelle réponse avec les données cachées
      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    } finally {
      // Nettoyer la requête en cours
      pendingRequests.delete(cacheKey);
    }
  })();

  // Enregistrer la requête en cours
  pendingRequests.set(cacheKey, {
    promise: requestPromise,
    timestamp: Date.now(),
    abortController,
  });

  return requestPromise;
}

/**
 * Version spécialisée pour les APIs d'avions
 */
export async function fetchAircraftData(registration: string): Promise<any> {
  const url = `/api/aircraft/${encodeURIComponent(registration)}`;
  const response = await deduplicatedFetch(
    url,
    {
      cache: "no-store",
    },
    24 * 60 * 60 * 1000
  ); // 24h cache pour les données d'avion

  return response.json();
}

/**
 * Version spécialisée pour les images
 */
export async function fetchImagesData(
  query: string,
  refresh = false
): Promise<any> {
  const url = `/api/images?q=${encodeURIComponent(query)}${
    refresh ? "&cache=refresh" : ""
  }`;
  const response = await deduplicatedFetch(
    url,
    {
      cache: "no-store",
    },
    2 * 60 * 60 * 1000
  ); // 2h cache pour les images

  return response.json();
}

/**
 * Version spécialisée pour les vols
 */
export async function fetchFlightData(
  flight: string,
  date: string
): Promise<any> {
  const url = `/api/flights/${flight}?dateLocal=${date}`;
  const response = await deduplicatedFetch(
    url,
    {
      cache: "no-store",
    },
    5 * 60 * 1000
  ); // 5min cache pour les vols

  return response.json();
}

/**
 * Nettoyer le cache (utile pour les tests ou reset)
 */
export function clearGlobalCache(pattern?: string) {
  if (pattern) {
    for (const [key] of responseCache) {
      if (key.includes(pattern)) {
        responseCache.delete(key);
      }
    }
    for (const [key] of pendingRequests) {
      if (key.includes(pattern)) {
        pendingRequests.get(key)?.abortController?.abort();
        pendingRequests.delete(key);
      }
    }
  } else {
    responseCache.clear();
    for (const [key, request] of pendingRequests) {
      request.abortController?.abort();
    }
    pendingRequests.clear();
  }
}

/**
 * Obtenir les statistiques du cache
 */
export function getCacheStats() {
  return {
    pendingRequests: pendingRequests.size,
    cachedResponses: responseCache.size,
    cacheKeys: Array.from(responseCache.keys()),
  };
}
