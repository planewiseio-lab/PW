/**
 * Hook centralisé pour les données d'avion
 * Évite les appels multiples simultanés
 */

import { useState, useEffect, useRef } from "react";
import { getAircraftData } from "@/lib/globalApiCache";

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

    // Vérifier le cache global d'abord
    const cached = globalCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setData(cached.data);
      setError(cached.error);
      setLoading(cached.loading);
      return;
    }

    // Annuler la requête précédente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Créer un nouveau AbortController
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await getAircraftData(registration);
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
        const errorMessage = err.message || "Failed to load aircraft data";
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
