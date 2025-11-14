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

// Fonction pour vérifier si une réponse est valide
function isValidFlightResponse(data: any): boolean {
  if (!data) {
    console.log("[FlightRequestDeduplication] isValidFlightResponse: data is null/undefined");
    return false;
  }
  
  // Si c'est une erreur, ce n'est pas valide
  if (data.error) {
    console.log("[FlightRequestDeduplication] isValidFlightResponse: data has error", data.error);
    return false;
  }
  
  const hasFlightsArray = Array.isArray(data.flights);
  const isEmptyFlightsArray = hasFlightsArray && data.flights.length === 0;
  
  // Vérifier si on a des données de vol valides (format direct de l'API)
  const hasValidFlightData = 
    data.number ||
    (data.airline && typeof data.airline === 'object') ||
    (data.aircraft && typeof data.aircraft === 'object') ||
    (data.departure && typeof data.departure === 'object') ||
    (data.arrival && typeof data.arrival === 'object') ||
    (hasFlightsArray && data.flights.length > 0);
  
  const isValid = hasValidFlightData && !isEmptyFlightsArray;
  
  if (!isValid) {
    console.log("[FlightRequestDeduplication] isValidFlightResponse: invalid", {
      hasNumber: !!data.number,
      hasAirline: !!data.airline,
      hasAircraft: !!data.aircraft,
      hasDeparture: !!data.departure,
      hasArrival: !!data.arrival,
      hasFlightsArray,
      isEmptyFlightsArray,
    });
  }
  
  return isValid;
}

// Nettoyer les requêtes orphelines et les caches vides
setInterval(() => {
  const now = Date.now();
  // Nettoyer les requêtes orphelines
  for (const [key, request] of pendingRequests.entries()) {
    if (now - request.timestamp > REQUEST_TIMEOUT) {
      pendingRequests.delete(key);
    }
  }
  // Nettoyer les caches vides ou expirés
  for (const [key, cached] of responseCache.entries()) {
    if (now - cached.timestamp > CACHE_DURATION || !isValidFlightResponse(cached.data)) {
      responseCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Nettoyer toutes les 5 minutes

export async function fetchFlightData(
  flight: string,
  date: string,
  signal?: AbortSignal
): Promise<any> {
  console.log(`[FlightRequestDeduplication] fetchFlightData called with:`, {
    flight,
    date,
    flightType: typeof flight,
    flightLength: flight?.length,
  });
  
  // Normaliser le numéro de vol pour le cache (enlever les espaces)
  const normalizedFlight = flight?.replace(/\s+/g, '').toUpperCase() || '';
  const cacheKey = `flight:${normalizedFlight}:${date}`;
  
  console.log(`[FlightRequestDeduplication] Normalized flight:`, {
    original: flight,
    normalized: normalizedFlight,
    cacheKey,
  });

  // Vérifier le cache d'abord
  const cached = responseCache.get(cacheKey);
  if (cached) {
    const isExpired = Date.now() - cached.timestamp >= CACHE_DURATION;
    const isValid = isValidFlightResponse(cached.data);
    
    // Si le cache est expiré ou invalide, le supprimer
    if (isExpired || !isValid) {
      console.log(`[FlightRequestDeduplication] Cache ${isExpired ? 'expired' : 'invalid'} for ${cacheKey}, removing and calling API`);
      responseCache.delete(cacheKey);
    } else {
      // Cache valide et non expiré, l'utiliser
      console.log(`[FlightRequestDeduplication] Using cached response for ${cacheKey}`);
      return cached.data;
    }
  }

  // Vérifier si une requête est déjà en cours
  if (pendingRequests.has(cacheKey)) {
    const pending = pendingRequests.get(cacheKey)!;
    return pending.promise;
  }

  // Créer une nouvelle requête
  const requestPromise = (async () => {
    try {
      // Vérifier si le signal est déjà aborted avant de faire la requête
      if (signal?.aborted) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }

      // Utiliser le numéro de vol normalisé dans l'URL de l'API
      const apiUrl = `/api/flights/${encodeURIComponent(normalizedFlight)}?dateLocal=${date}`;
      console.log(`[FlightRequestDeduplication] Fetching ${apiUrl}`);
      console.log(`[FlightRequestDeduplication] Original flight: "${flight}", Normalized: "${normalizedFlight}"`);
      const response = await fetch(apiUrl, {
        signal,
        credentials: "include",
        headers: {
          "Cache-Control": "max-age=300",
        },
      });
      
      console.log(`[FlightRequestDeduplication] Response status: ${response.status} for ${cacheKey}`);

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
      console.log(`[FlightRequestDeduplication] Received response for ${cacheKey}`, {
        hasData: !!data,
        hasError: !!data?.error,
        hasNumber: !!data?.number,
        hasAirline: !!data?.airline,
        hasDeparture: !!data?.departure,
        hasArrival: !!data?.arrival,
        hasFlights: !!data?.flights,
        flightsLength: Array.isArray(data?.flights) ? data.flights.length : 0,
        dataKeys: data ? Object.keys(data) : [],
      });
      
      // Vérifier si l'API a retourné une erreur dans le payload même avec status 200
      if (data.error) {
        console.log(`[FlightRequestDeduplication] API returned error in payload:`, data.error);
        throw new Error(data.error);
      }

      // Mettre en cache seulement si c'est un payload valide (pas une réponse vide)
      const isValid = isValidFlightResponse(data);
      console.log(`[FlightRequestDeduplication] Response validity check:`, isValid);
      
      if (isValid) {
        responseCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
        console.log(`[FlightRequestDeduplication] Cached valid response for ${cacheKey}`);
      } else {
        console.log(`[FlightRequestDeduplication] Not caching empty/invalid response for ${cacheKey}`);
      }

      return data;
    } catch (err: any) {
      // Si c'est une AbortError, ne pas la propager comme une erreur normale
      if (err?.name === "AbortError" || err instanceof DOMException) {
        console.log(`[FlightRequestDeduplication] Request aborted for ${cacheKey}`);
        // Nettoyer la requête en cours avant de relancer l'erreur
        pendingRequests.delete(cacheKey);
        throw err;
      }
      // Pour les autres erreurs, nettoyer et propager
      pendingRequests.delete(cacheKey);
      throw err;
    } finally {
      // Nettoyer la requête en cours seulement si elle n'a pas déjà été nettoyée
      if (pendingRequests.has(cacheKey)) {
        pendingRequests.delete(cacheKey);
      }
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
