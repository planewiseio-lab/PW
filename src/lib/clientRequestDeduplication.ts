/**
 * Système de déduplication côté client pour éviter les requêtes multiples
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  abortController?: AbortController;
}

const pendingRequests = new Map<string, PendingRequest>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT = 45 * 1000; // 45 secondes

// Nettoyer les requêtes orphelines
setInterval(() => {
  const now = Date.now();
  for (const [key, request] of pendingRequests.entries()) {
    if (now - request.timestamp > REQUEST_TIMEOUT) {
      request.abortController?.abort();
      pendingRequests.delete(key);
    }
  }
}, 2 * 60 * 1000); // Nettoyer toutes les 2 minutes

/**
 * Fonction de déduplication pour les requêtes fetch qui retourne des données JSON
 */
export async function deduplicatedFetch(
  url: string,
  options: RequestInit = {},
  timeout: number = 10000
): Promise<any> {
  const cacheKey = `client:${url}:${JSON.stringify(options)}`;

  // Vérifier si une requête identique est déjà en cours
  if (pendingRequests.has(cacheKey)) {
    console.log(`[CLIENT-DEDUP] Deduplicating request: ${url}`);
    const pending = pendingRequests.get(cacheKey)!;
    return pending.promise;
  }

  // Créer une nouvelle requête avec timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeout);

  const requestPromise = (async (): Promise<any> => {
    try {
      const response = await fetch(url, {
        ...options,
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Retourner directement les données JSON
      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error(`Request timeout after ${timeout}ms for ${url}`);
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
 * Version spécialisée pour les APIs d'images
 */
export async function fetchImagesData(
  query: string,
  refresh = false
): Promise<any> {
  const url = `/api/images?q=${encodeURIComponent(query)}${
    refresh ? "&cache=refresh" : ""
  }`;

  try {
    return await deduplicatedFetch(
      url,
      {
        cache: "no-store",
        credentials: "include",
      },
      20000
    ); // 20s timeout pour les images
  } catch (error: any) {
    // Si c'est un timeout et qu'on n'est pas en mode refresh, essayer avec un timeout plus court
    if (error.message.includes('timeout') && !refresh) {
      console.warn(`[IMAGES] First attempt timeout for ${query}, retrying with shorter timeout`);
      try {
        return await deduplicatedFetch(
          url,
          {
            cache: "no-store",
            credentials: "include",
          },
          10000
        ); // 10s timeout pour le retry
      } catch (retryError: any) {
        console.warn(`[IMAGES] Retry also failed for ${query}, returning empty images`);
        return { images: [] };
      }
    }
    throw error;
  }
}

/**
 * Version spécialisée pour les APIs d'avions
 */
export async function fetchAircraftData(registration: string): Promise<any> {
  const url = `/api/aircraft/${encodeURIComponent(registration)}`;

  return deduplicatedFetch(
    url,
    {
      cache: "no-store",
      credentials: "include",
    },
    30000
  ); // 30s timeout pour les avions
}
