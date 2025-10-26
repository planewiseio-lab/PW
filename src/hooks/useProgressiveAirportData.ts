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
    async (offset = 0, limit = 20) => {
      // Vérifier le cache d'abord
      const cached = cache.get(cacheKey);
      if (
        cached &&
        Date.now() - cached.timestamp < CACHE_DURATION &&
        offset === 0
      ) {
        setFlights(cached.data.slice(0, limit));
        setPagination(cached.pagination);
        setLoaded(true);
        return;
      }

      const isLoadingMore = offset > 0;
      if (isLoadingMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const requestKey = `airport:${cacheKey}:${offset}:${limit}`;

        const data = await cachedRequest(
          requestKey,
          async () => {
            const url = new URL(`/api/airport/${code}`, window.location.origin);
            url.searchParams.set("dir", dir);
            url.searchParams.set("before", "1");
            url.searchParams.set("after", "1");
            url.searchParams.set("limit", limit.toString());
            url.searchParams.set("offset", offset.toString());

            const response = await fetch(url.toString(), {
              cache: "no-store",
              credentials: "include",
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData?.error || "Failed to fetch flights");
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
          // Mettre en cache seulement la première requête
          cache.set(cacheKey, {
            data: flightsData,
            pagination: paginationData,
            timestamp: Date.now(),
          });
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

  useEffect(() => {
    if (!code) return;
    loadFlights(0, 20); // Charger les 20 premiers vols
  }, [code, dir, loadFlights]);

  return {
    flights,
    loading,
    loadingMore,
    error,
    loaded,
    pagination,
    refetch: () => loadFlights(0, 20),
    loadMore,
  };
}
