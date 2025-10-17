/**
 * Évite les appels API simultanés identiques
 * Améliore les performances en évitant les requêtes dupliquées
 */

const pendingRequests = new Map<string, Promise<any>>();

export function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  // Si une requête identique est déjà en cours, retourner la même promesse
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  // Créer une nouvelle requête
  const request = requestFn().finally(() => {
    // Nettoyer après completion
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, request);
  return request;
}

/**
 * Version avec cache pour éviter les requêtes répétées
 */
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function cachedRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  ttl = CACHE_TTL
): Promise<T> {
  // Vérifier le cache d'abord
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return Promise.resolve(cached.data);
  }

  // Utiliser la déduplication
  return deduplicateRequest(key, requestFn).then((data) => {
    // Mettre en cache
    cache.set(key, { data, timestamp: Date.now() });
    return data;
  });
}

/**
 * Nettoyer le cache (utile pour les tests ou reset)
 */
export function clearCache(pattern?: string) {
  if (pattern) {
    for (const [key] of cache) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
  pendingRequests.clear();
}

