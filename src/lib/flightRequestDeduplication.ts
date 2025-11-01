/**
 * Système de déduplication des requêtes de vol
 * Évite les appels API multiples simultanés pour le même vol
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

const pendingRequests = new Map<string, PendingRequest>();
const CACHE_DURATION = 30 * 1000; // 30 secondes
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
        credentials: "include",
        headers: {
          "Cache-Control": "max-age=300",
        },
      });

      if (!response.ok) {
        // Pour les erreurs, essayer de récupérer le body JSON pour plus de détails
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch {
          // Si le body n'est pas du JSON, utiliser le status text
        }

        // Gérer les erreurs de quota invité (429)
        if (response.status === 429 || errorData?.code === "GUEST_QUOTA_EXCEEDED") {
          // Déclencher l'événement pour afficher le modal
          const { triggerGuestQuotaExceeded } = await import("@/hooks/useGuestQuotaExceeded");
          triggerGuestQuotaExceeded({
            message: errorData?.message || "Guest quota exceeded",
            guestRemaining: errorData?.guestRemaining ?? errorData?.remaining ?? 0,
            guestUsed: errorData?.guestUsed ?? errorData?.used ?? 4,
            guestLimit: errorData?.guestLimit ?? errorData?.limit ?? 4,
            guestTtl: errorData?.guestTtl ?? errorData?.ttl ?? 0, // TTL en secondes
            status: 429,
            code: "GUEST_QUOTA_EXCEEDED",
          });
          // Lancer une erreur avec le code GUEST_QUOTA_EXCEEDED pour que la page puisse le détecter
          throw new Error("GUEST_QUOTA_EXCEEDED");
        }

        // Si c'est une erreur serveur, essayer de récupérer le message d'erreur
        let errorMessage = `HTTP ${response.status}: Failed to fetch flight data`;
        if (errorData?.error) {
          errorMessage = errorData.error;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Vérifier si l'API a retourné une erreur dans le payload même avec status 200
      if (data.error) {
        throw new Error(data.error);
      }

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
