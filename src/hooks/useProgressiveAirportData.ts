"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cachedRequest } from "@/lib/requestDeduplication";

type Direction = "departures" | "arrivals";

type FlightRow = {
  id: string;
  time: string | { local?: string; utc?: string; scheduled?: string };
  number: string;
  airline: string;
  from?: string;
  to?: string;
  airportName?: string;
  reg?: string;
  status?: string;
  gate?: string;
};

type PaginationInfo = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

// Cache simple en mémoire
const cache = new Map<
  string,
  { data: FlightRow[]; pagination: PaginationInfo; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useProgressiveAirportData(code: string, dir: Direction) {
  const [flights, setFlights] = useState<FlightRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  const cacheKey = useMemo(() => `${code}-${dir}`, [code, dir]);

  const loadFlights = useCallback(
    async (offset = 0, limit = 20, searchQuery?: string) => {
      // Vérifier le cache d'abord seulement si on n'est pas en train de charger plus et qu'il n'y a pas de recherche
      if (offset === 0 && !searchQuery) {
        const cached = cache.get(cacheKey);
        if (
          cached &&
          Date.now() - cached.timestamp < CACHE_DURATION
        ) {
          setFlights(cached.data.slice(0, limit));
          setPagination(cached.pagination);
          setLoaded(true);
          setLoading(false);
          return;
        }
      }

      const isLoadingMore = offset > 0 && !searchQuery;
      if (isLoadingMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const requestKey = searchQuery 
          ? `airport:${cacheKey}:search:${searchQuery}`
          : `airport:${cacheKey}:${offset}:${limit}`;

        const data = await cachedRequest(
          requestKey,
          async () => {
            const url = new URL(`/api/airport/${code}`, window.location.origin);
            url.searchParams.set("dir", dir);
            url.searchParams.set("before", "1");
            url.searchParams.set("after", "1");
            
            // Si une recherche est fournie, utiliser le paramètre search au lieu de pagination
            if (searchQuery && searchQuery.trim()) {
              url.searchParams.set("search", searchQuery.trim());
              console.log(`[useProgressiveAirportData] Making search request to: ${url.toString()}`);
            } else {
              url.searchParams.set("limit", limit.toString());
              url.searchParams.set("offset", offset.toString());
            }

            const response = await fetch(url.toString(), {
              cache: "no-store",
              credentials: "include",
            });
            
            console.log(`[useProgressiveAirportData] Response status: ${response.status}, URL: ${url.toString()}`);

            if (!response.ok) {
              let errorData: any = null;
              try {
                errorData = await response.json();
              } catch {
                // Si le body n'est pas du JSON, utiliser le status text
              }

              // Gérer les erreurs de quota invité (429)
              if (response.status === 429 || errorData?.code === "GUEST_QUOTA_EXCEEDED") {
                // Déclencher l'événement pour afficher le modal Guest
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
              }

              throw new Error(errorData?.error || errorData?.message || "Failed to fetch flights");
            }

            return response.json();
          },
          2 * 60 * 1000 // 2 minutes cache pour les requêtes API
        );

        const flightsData = data.flights || [];
        const paginationData = data.pagination || {
          total: 0,
          limit,
          offset,
          hasMore: false,
        };

        if (isLoadingMore) {
          // Ajouter les nouveaux vols aux existants
          setFlights((prev) => [...prev, ...flightsData]);
        } else {
          // Remplacer les vols existants
          setFlights(flightsData);
          // Mettre en cache seulement la première requête (pas pour les recherches)
          if (!searchQuery) {
            cache.set(cacheKey, {
              data: flightsData,
              pagination: paginationData,
              timestamp: Date.now(),
            });
          }
        }

        setPagination(paginationData);
        setLoaded(true);
      } catch (err: any) {
        setError(err.message || "Failed to load flights");
        if (!isLoadingMore) {
          setFlights([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [code, dir, cacheKey]
  );

  const loadMore = useCallback(() => {
    if (pagination?.hasMore && !loadingMore) {
      loadFlights(flights.length, 20);
    }
  }, [pagination, loadingMore, flights.length, loadFlights]);

  const searchFlights = useCallback((query: string) => {
    if (query.trim()) {
      loadFlights(0, 0, query.trim());
    } else {
      // Si la recherche est vide, recharger les données normales
      loadFlights(0, 20);
    }
  }, [loadFlights]);

  useEffect(() => {
    if (!code) return;
    // Réinitialiser les données quand on change de direction ou de code
    setFlights([]);
    setPagination(null);
    setLoaded(false);
    setError(null);
    setLoading(true);
    // Charger les nouveaux vols pour la nouvelle direction
    // Utiliser setTimeout pour s'assurer que le state est bien réinitialisé
    const timer = setTimeout(() => {
      loadFlights(0, 20); // Charger les 20 premiers vols
    }, 0);
    return () => clearTimeout(timer);
  }, [code, dir]); // Ne pas inclure loadFlights dans les dépendances pour éviter les re-renders

  return {
    flights,
    loading,
    loadingMore,
    error,
    loaded,
    pagination,
    refetch: () => loadFlights(0, 20),
    loadMore,
    searchFlights,
  };
}
