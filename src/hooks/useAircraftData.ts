/**
 * Hook centralisé pour les données d'avion
 * Évite les appels multiples simultanés
 */

import { useState, useEffect, useRef } from "react";
import { getAircraftData } from "@/lib/globalApiCache";
import { fetchAircraftData } from "@/lib/clientRequestDeduplication";
import { triggerInsufficientCredits } from "./useInsufficientCredits";
import { triggerGuestQuotaExceeded } from "./useGuestQuotaExceeded";
import { triggerFreeCreditsExceeded } from "./useFreeCreditsExceeded";

interface AircraftData {
  registration?: string;
  typeName?: string;
  model?: string;
  airlineName?: string;
  operator?: string;
  hexIcao?: string | null;
  [key: string]: any;
}

interface UseAircraftDataReturn {
  data: AircraftData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Cache global pour éviter les appels multiples
const globalCache = new Map<
  string,
  {
    data: AircraftData | null;
    loading: boolean;
    error: string | null;
    timestamp: number;
  }
>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useAircraftData(registration: string): UseAircraftDataReturn {
  const [data, setData] = useState<AircraftData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cacheKey = `aircraft:${registration}`;

  const fetchData = async () => {
    if (!registration) return;

    // Toujours faire l'appel API pour débiter les crédits, même si on a le cache
    // Le cache serveur gérera les performances, mais le crédit sera toujours débité

    // Annuler la requête précédente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Créer un nouveau AbortController
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // Utiliser la déduplication côté client pour éviter les requêtes multiples
      const result = await fetchAircraftData(registration);
      const raw = Array.isArray(result) ? result[0] : result?.data ?? result;

      if (!abortControllerRef.current.signal.aborted) {
        setData(raw);
        setError(null);

        // Mettre en cache
        globalCache.set(cacheKey, {
          data: raw,
          loading: false,
          error: null,
          timestamp: Date.now(),
        });
      }
    } catch (err: any) {
      if (!abortControllerRef.current.signal.aborted) {
        let errorMessage = err.message || "Failed to load aircraft data";

        // Gérer les erreurs de crédits et quota invité spécifiquement
        // Vérifier FREE_USER_QUOTA_EXCEEDED en premier car plus spécifique
        if (
          err.message?.includes("FREE_USER_QUOTA_EXCEEDED")
        ) {
          // Ne pas définir l'erreur dans le hook pour les erreurs de quota utilisateur Free
          // Le modal s'affichera automatiquement via triggerFreeCreditsExceeded
          triggerFreeCreditsExceeded(err);
          // Ne pas appeler setError pour éviter l'affichage sur la page
          return;
        } else if (
          err.message?.includes("GUEST_QUOTA_EXCEEDED") ||
          (err.message?.includes("HTTP 429") && !err.message?.includes("FREE_USER"))
        ) {
          // Ne pas définir l'erreur dans le hook pour les erreurs de quota invité
          // Le modal s'affichera automatiquement via triggerGuestQuotaExceeded
          triggerGuestQuotaExceeded(err);
          // Ne pas appeler setError pour éviter l'affichage sur la page
          return;
        } else if (
          err.message?.includes("HTTP 402") ||
          err.message?.includes("Insufficient credits")
        ) {
          errorMessage =
            "Insufficient credits. Please check your account balance.";
          // Déclencher la modal appropriée selon le type d'utilisateur
          // Pour l'instant, on utilise le nouveau modal pour les utilisateurs connectés
          triggerFreeCreditsExceeded(err);
        } else if (err.message?.includes("HTTP 401")) {
          errorMessage = "Authentication required. Please log in.";
        }

        setError(errorMessage);
        setData(null);

        // Mettre en cache l'erreur
        globalCache.set(cacheKey, {
          data: null,
          loading: false,
          error: errorMessage,
          timestamp: Date.now(),
        });
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const refetch = () => {
    // Nettoyer le cache pour forcer un nouveau fetch
    globalCache.delete(cacheKey);
    fetchData();
  };

  useEffect(() => {
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [registration]);

  return { data, loading, error, refetch };
}

/**
 * Nettoyer le cache global
 */
export function clearAircraftCache(pattern?: string) {
  if (pattern) {
    for (const [key] of globalCache) {
      if (key.includes(pattern)) {
        globalCache.delete(key);
      }
    }
  } else {
    globalCache.clear();
  }
}
