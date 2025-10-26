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
const REQUEST_TIMEOUT = 30 * 1000; // 30 secondes

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
 * Version spécialisée pour les APIs d'images
 */
export async function fetchImagesData(
  query: string,
  refresh = false
): Promise<any> {
  const url = `/api/images?q=${encodeURIComponent(query)}${
    refresh ? "&cache=refresh" : ""
  }`;

  return deduplicatedFetch(
    url,
    {
      cache: "no-store",
      credentials: "include",
    },
    10000
  ); // 10s timeout pour les images
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
    15000
  ); // 15s timeout pour les avions
}
