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
const REQUEST_TIMEOUT = 10 * 1000; // 10 secondes

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
  // Clé de cache pour déduplication (sans timestamp pour éviter les appels multiples simultanés)
  // La déduplication empêche les appels multiples causés par React Strict Mode ou re-renders
  const cacheKey = `client:${url}:${JSON.stringify(options)}`;

  // Vérifier si une requête identique est déjà en cours (déduplication pour éviter les appels multiples)
  // Cela empêche les appels multiples causés par React Strict Mode, mais chaque recherche manuelle
  // unique (par l'utilisateur) aura toujours un appel API avec débit de crédit
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
        // Pour les erreurs, essayer de récupérer le body JSON pour plus de détails
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch {
          // Si le body n'est pas du JSON, utiliser le status text
        }

        // Gérer les erreurs de quota invité (429) - seulement pour les utilisateurs non authentifiés
        if (errorData?.code === "GUEST_QUOTA_EXCEEDED" || (response.status === 429 && errorData?.guestLimit !== undefined)) {
          // Vérifier si l'utilisateur est authentifié avant d'afficher le modal
          try {
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            
            // Ne pas afficher le modal pour les utilisateurs authentifiés
            if (session?.user) {
              console.log("[ClientRequestDeduplication] User is authenticated, ignoring GUEST_QUOTA_EXCEEDED error");
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Déclencher l'événement pour afficher le modal (seulement pour les invités)
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
            // Lancer une erreur avec le code GUEST_QUOTA_EXCEEDED pour que useAircraftData puisse le détecter
            throw new Error("GUEST_QUOTA_EXCEEDED");
          } catch (checkError: any) {
            // Si la vérification échoue, vérifier si c'est déjà une erreur non-GUEST_QUOTA
            if (checkError.message !== "GUEST_QUOTA_EXCEEDED" && !checkError.message.includes("HTTP")) {
              console.error("[ClientRequestDeduplication] Error checking auth:", checkError);
            }
            throw checkError;
          }
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Vérifier les headers de crédits et dispatcher l'événement de mise à jour
      const creditsRemaining = response.headers.get("X-Credits-Remaining");
      if (creditsRemaining !== null) {
        console.log(
          `[Client] Credits updated, dispatching credits:updated event (remaining: ${creditsRemaining})`
        );
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("credits:updated"));
        }
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
      5000
    ); // 5s timeout pour les images
  } catch (error: any) {
    // Si c'est un timeout et qu'on n'est pas en mode refresh, essayer avec un timeout plus court
    if (error.message.includes("timeout") && !refresh) {
      console.warn(
        `[IMAGES] First attempt timeout for ${query}, retrying with shorter timeout`
      );
      try {
        return await deduplicatedFetch(
          url,
          {
            cache: "no-store",
            credentials: "include",
          },
          3000
        ); // 3s timeout pour le retry
      } catch (retryError: any) {
        console.warn(
          `[IMAGES] Retry also failed for ${query}, returning empty images`
        );
        return { images: [] };
      }
    }
    throw error;
  }
}

/**
 * Version spécialisée pour les APIs d'avions
 * Utilise la déduplication mais émet aussi l'événement credits:updated
 */
export async function fetchAircraftData(registration: string): Promise<any> {
  const url = `/api/aircraft/${encodeURIComponent(registration)}`;
  const cacheKey = `client:${url}:${JSON.stringify({ cache: "no-store", credentials: "include" })}`;

  // Vérifier si une requête identique est déjà en cours (déduplication)
  if (pendingRequests.has(cacheKey)) {
    console.log(`[CLIENT-DEDUP] Deduplicating aircraft request: ${url}`);
    const pending = pendingRequests.get(cacheKey)!;
    return pending.promise;
  }

  // Créer une nouvelle requête avec timeout (augmenté à 15s pour les requêtes aircraft qui peuvent être plus longues)
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 15000);

  const requestPromise = (async (): Promise<any> => {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        credentials: "include",
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Pour les erreurs, essayer de récupérer le body JSON pour plus de détails
        let errorData: any = null;
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const responseText = await response.clone().text();
          errorData = JSON.parse(responseText);
          
          // Utiliser le message d'erreur de l'API si disponible
          if (errorData?.error || errorData?.message) {
            errorMessage = errorData.error || errorData.message || errorMessage;
          }
        } catch {
          // Si le body n'est pas du JSON, utiliser le status text
        }

        // Gérer les erreurs de quota invité (429) - seulement pour les utilisateurs non authentifiés
        if (errorData?.code === "GUEST_QUOTA_EXCEEDED" || (response.status === 429 && errorData?.guestLimit !== undefined)) {
          // Vérifier si l'utilisateur est authentifié avant d'afficher le modal
          try {
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            
            // Ne pas afficher le modal pour les utilisateurs authentifiés
            if (session?.user) {
              console.log("[ClientRequestDeduplication] User is authenticated, ignoring GUEST_QUOTA_EXCEEDED error");
              throw new Error(errorMessage);
            }
            
            // Déclencher l'événement pour afficher le modal (seulement pour les invités)
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
            // Lancer une erreur avec le code GUEST_QUOTA_EXCEEDED pour que useAircraftData puisse le détecter
            throw new Error("GUEST_QUOTA_EXCEEDED");
          } catch (checkError: any) {
            // Si la vérification échoue, vérifier si c'est déjà une erreur non-GUEST_QUOTA
            if (checkError.message !== "GUEST_QUOTA_EXCEEDED" && !checkError.message.includes("HTTP")) {
              console.error("[ClientRequestDeduplication] Error checking auth:", checkError);
            }
            throw checkError;
          }
        }

        // Propager l'erreur avec le message détaillé de l'API
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Vérifier si un crédit a été débité (présence du header X-Credits-Charged)
      const creditsCharged = response.headers.get("X-Credits-Charged");
      const creditsRemaining = response.headers.get("X-Credits-Remaining");

      if (creditsCharged === "1" || creditsRemaining) {
        // Émettre l'événement pour mettre à jour la page des crédits
        console.log(
          `[Aircraft] 💳 Credit charged, dispatching credits:updated event (remaining: ${creditsRemaining || "unknown"})`
        );
        window.dispatchEvent(new CustomEvent("credits:updated"));
      }

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error(`Request timeout after 15000ms for ${url}`);
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
