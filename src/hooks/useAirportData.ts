import { useState, useEffect, useCallback } from "react";

type Direction = "departures" | "arrivals";

type FlightRow = {
  id: string;
  time: string;
  number: string;
  airline: string;
  from?: string;
  to?: string;
  reg?: string;
  status?: string;
  gate?: string;
};

// Cache simple en mémoire
const cache = new Map<string, { data: FlightRow[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useAirportData(code: string, dir: Direction) {
  const [flights, setFlights] = useState<FlightRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false); // Nouveau état pour indiquer si les données ont été chargées au moins une fois

  const cacheKey = `${code}-${dir}`;

  const loadFlights = useCallback(async () => {
    // Vérifier le cache d'abord
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setFlights(cached.data);
      setLoaded(true); // Défini loaded à true si les données viennent du cache
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = new URL(`/api/airport/${code}`, window.location.origin);
      url.searchParams.set("dir", dir);
      url.searchParams.set("before", "2");
      url.searchParams.set("after", "2");
      url.searchParams.set("t", Date.now().toString()); // Cache-busting

      const response = await fetch(url.toString(), {
        cache: "no-store", // Désactiver le cache pour éviter les problèmes
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || "Failed to fetch flights");
      }

      const data = await response.json();
      const flightsData = data.flights || [];
      cache.set(cacheKey, {
        data: flightsData,
        timestamp: Date.now(),
      });

      setFlights(flightsData);
      setLoaded(true); // Défini loaded à true après un chargement réussi
    } catch (err: any) {
      setError(err.message || "Failed to load flights");
      setFlights([]);
    } finally {
      setLoading(false);
    }
  }, [code, dir, cacheKey]);

  useEffect(() => {
    if (!code) return;
    loadFlights();
  }, [code, dir, loadFlights]);

  return {
    flights,
    loading,
    error,
    loaded,
    refetch: loadFlights,
  };
}

