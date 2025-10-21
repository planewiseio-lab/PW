/**
 * Système de déduplication des requêtes de vol
 * Évite les appels API multiples simultanés pour le même vol
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

const pendingRequests = new Map<string, PendingRequest>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT = 10 * 60 * 1000; // 10 minutes pour nettoyer les requêtes orphelines

// Cache des réponses
const responseCache = new Map<string, { data: any; timestamp: number }>();

// Nettoyer les requêtes orphelines
setInterval(() => {
  const now = Date.now();
  for (const [key, request] of pendingRequests.entries()) {
    if (now - request.timestamp > REQUEST_TIMEOUT) {
      pendingRequests.delete(key);
    }
  }
}, 5 * 60 * 1000); // Nettoyer toutes les 5 minutes

export async function fetchFlightData(
  flight: string,
  date: string,
  signal?: AbortSignal
): Promise<any> {
  const cacheKey = `flight:${flight}:${date}`;

  // Vérifier le cache d'abord
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // Vérifier si une requête est déjà en cours
  if (pendingRequests.has(cacheKey)) {
    const pending = pendingRequests.get(cacheKey)!;
    return pending.promise;
  }

  // Créer une nouvelle requête
  const requestPromise = (async () => {
    try {
      const response = await fetch(`/api/flights/${flight}?dateLocal=${date}`, {
        signal,
        headers: {
          "Cache-Control": "max-age=300",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch flight data`);
      }

      const data = await response.json();

      // Mettre en cache la réponse
      responseCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return data;
    } finally {
      // Nettoyer la requête en cours
      pendingRequests.delete(cacheKey);
    }
  })();

  // Enregistrer la requête en cours
  pendingRequests.set(cacheKey, {
    promise: requestPromise,
    timestamp: Date.now(),
  });

  return requestPromise;
}

/**
 * Nettoyer le cache (utile pour les tests ou reset)
 */
export function clearFlightCache(pattern?: string) {
  if (pattern) {
    for (const [key] of responseCache) {
      if (key.includes(pattern)) {
        responseCache.delete(key);
      }
    }
    for (const [key] of pendingRequests) {
      if (key.includes(pattern)) {
        pendingRequests.delete(key);
      }
    }
  } else {
    responseCache.clear();
    pendingRequests.clear();
  }
}
