"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useMemo, useCallback, memo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { correctFlightsStatus } from "@/lib/flightStatusRules";
import { useAircraftHistory } from "@/hooks/useAircraftHistory";

interface FlightHistory {
  number: string;
  airline: {
    name: string;
    iata: string;
    icao: string;
  };
  departure: {
    airport: {
      iata: string;
      name: string;
      city: string;
    };
    scheduledTime: string;
    actualTime?: string;
    terminal?: string;
    gate?: string;
  };
  arrival: {
    airport: {
      iata: string;
      name: string;
      city: string;
    };
    scheduledTime: string;
    actualTime?: string;
    terminal?: string;
    gate?: string;
  };
  status: string;
  distance?: number;
  duration?: number;
  date: string;
}

interface FlightHistoryData {
  flights: FlightHistory[];
  message?: string;
}

export default function AircraftHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const registration = params.reg as string;

  const [flightHistory, setFlightHistory] = useState<FlightHistoryData | null>(
    null
  );
  // Loading handled by useAircraftHistory hook (isLoading)
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState<null | {
    guestRemaining: number;
    guestLimit: number;
    requiresAuth?: boolean;
    upgradeUrl?: string;
  }>(null);
  const [days, setDays] = useState(7);
  const autoTriedRef = useRef(false);
  const [isAutoExtending, setIsAutoExtending] = useState(false);
  const fallbackDays = [3, 7, 14, 30];
  const [stats, setStats] = useState<{
    totalFlights: number;
    totalDistance: number;
    countriesVisited: number;
    airportsVisited: number;
  } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check authentication on mount - non-bloquant pour améliorer le LCP
  useEffect(() => {
    let isMounted = true;
    let supabaseClient: ReturnType<typeof createClient> | null = null;
    
    // Ne pas bloquer le rendu initial - afficher le contenu immédiatement
    setAuthLoading(false);
    
    const checkAuth = async () => {
      try {
        supabaseClient = createClient();
        const {
          data: { user },
          error,
        } = await supabaseClient.auth.getUser();

        if (!isMounted) return;

        if (error || !user) {
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("[AircraftHistoryPage] Auth check error:", err);
        setIsAuthenticated(false);
      }
    };

    // Vérifier l'authentification en arrière-plan sans bloquer le rendu
    checkAuth();
    
    // Nettoyer les WebSockets Supabase lors du pagehide pour permettre le bfcache
    const handlePageHide = () => {
      // Supabase nettoie automatiquement les WebSockets lors du pagehide
      // mais on peut forcer le nettoyage si nécessaire
      if (supabaseClient) {
        // Les WebSockets Supabase sont gérés automatiquement
        supabaseClient = null;
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    
    return () => {
      isMounted = false;
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  const {
    data: rawData,
    error: fetchError,
    isLoading,
  } = useAircraftHistory(registration, days);

  // Optimiser le traitement des données avec useMemo
  const processedData = useMemo(() => {
    if (!rawData) return null;
    const data: any = { ...rawData };
    if (data.flights) {
      const flightDataArray = data.flights.map((flight: FlightHistory) => ({
        status: flight.status,
        departure: {
          scheduledTime: flight.departure.scheduledTime,
          actualTime: flight.departure.actualTime,
        },
        arrival: {
          scheduledTime: flight.arrival.scheduledTime,
          actualTime: flight.arrival.actualTime,
        },
      }));
      const correctedFlightData = correctFlightsStatus(flightDataArray);
      data.flights = data.flights.map(
        (flight: FlightHistory, index: number) => ({
          ...flight,
          status: correctedFlightData[index].status,
        })
      );
    }
    return data;
  }, [rawData]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    if (!processedData) return;

    // Utiliser requestAnimationFrame pour éviter de bloquer le main thread
    const updateData = () => {
      if (!isMounted) return;
      setFlightHistory(processedData);
      
      // Auto-extend range on first load if empty
      if (!autoTriedRef.current && (!processedData.flights || processedData.flights.length === 0)) {
        const idx = fallbackDays.indexOf(days);
        if (idx > -1 && idx < fallbackDays.length - 1) {
          autoTriedRef.current = true; // avoid loops
          setIsAutoExtending(true);
          setDays(fallbackDays[idx + 1]);
        }
      }
      
      if (processedData.flights && processedData.flights.length > 0) {
        const totalFlights = processedData.flights.length;
        const totalDistance = processedData.flights.reduce(
          (sum: number, flight: FlightHistory) => sum + (flight.distance || 0),
          0
        );
        const airports = new Set<string>();
        const countries = new Set<string>();
        // Optimiser en faisant une seule boucle au lieu de deux
        processedData.flights.forEach((flight: FlightHistory) => {
          airports.add(flight.departure.airport.iata);
          airports.add(flight.arrival.airport.iata);
          const depCountry = flight.departure.airport.iata.substring(0, 1);
          const arrCountry = flight.arrival.airport.iata.substring(0, 1);
          countries.add(depCountry);
          countries.add(arrCountry);
        });
        
        if (isMounted) {
          setStats({
            totalFlights,
            totalDistance: Math.round(totalDistance),
            countriesVisited: countries.size,
            airportsVisited: airports.size,
          });
        }
      }
      
      // Stop auto-extending spinner once we have tried extension
      if (autoTriedRef.current && isMounted) {
        timeoutId = setTimeout(() => {
          if (isMounted) {
            setIsAutoExtending(false);
          }
        }, 100);
      }
    };

    // Utiliser requestIdleCallback si disponible pour éviter de bloquer le main thread
    let cleanup: (() => void) | null = null;
    
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleCallbackId = (window as any).requestIdleCallback(updateData, { timeout: 1000 });
      cleanup = () => {
        isMounted = false;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (idleCallbackId && (window as any).cancelIdleCallback) {
          (window as any).cancelIdleCallback(idleCallbackId);
        }
      };
    } else {
      // Fallback: utiliser requestAnimationFrame pour éviter de bloquer le main thread
      const rafId = requestAnimationFrame(updateData);
      cleanup = () => {
        isMounted = false;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        cancelAnimationFrame(rafId);
      };
    }
    
    return cleanup;
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [processedData, days]);

  useEffect(() => {
    let isMounted = true;
    
    // Ne pas afficher l'erreur si c'est GUEST_QUOTA_EXCEEDED
    // Le modal s'affichera automatiquement
    if (!isMounted) return;
    
    if (fetchError && fetchError.includes("GUEST_QUOTA_EXCEEDED")) {
      setError(null);
    } else {
      setError(fetchError);
    }
    
    return () => {
      isMounted = false;
    };
  }, [fetchError]);

  // Mémoriser les fonctions de formatage pour éviter les re-créations
  const formatDateTime = useCallback((dateTime: string) => {
    if (!dateTime) return "N/A";
    try {
      const date = new Date(dateTime);
      return date.toLocaleString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });
    } catch {
      return dateTime;
    }
  }, []);

  const formatDate = useCallback((dateTime: string) => {
    if (!dateTime) return "N/A";
    try {
      const date = new Date(dateTime);
      return date.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateTime;
    }
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case "arrived":
      case "landed":
        return "bg-green-100 text-green-800 border-green-200";
      case "departed":
      case "in flight":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "scheduled":
      case "on time":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "delayed":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }, []);

  const formatDuration = useCallback((duration?: number) => {
    if (!duration) return "N/A";
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h ${minutes}m`;
  }, []);

  // Constantes pour les sélecteurs de jours (pas de useMemo car tableaux statiques)
  const daysOptions = [7];
  const fallbackDaysOptions = [7, 14, 30];

  // Afficher le contenu principal immédiatement pour améliorer le LCP
  // La vérification d'authentification se fait en arrière-plan
  // Si l'utilisateur n'est pas authentifié, on affichera un message après
  const showAuthRequired = !authLoading && !isAuthenticated;

  // Show loading skeleton (uniquement si on charge vraiment)
  if (authLoading && isAuthenticated === null) {
    // Afficher le contenu principal avec un skeleton pendant le chargement
    // Cela améliore le LCP en rendant le contenu plus tôt
  }

  // Show auth required message for guests (après vérification)
  if (showAuthRequired) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            {/* Dimensions fixes pour éviter les layout shifts */}
            <div className="text-blue-500 mb-4 h-16 flex items-center justify-center">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600 mb-4">
              Flight history is only available to authenticated users.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Please log in to access the flight history for aircraft{" "}
              <span className="font-semibold text-blue-600">{registration}</span>.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href={`/login?redirect=${encodeURIComponent(`/aircraft/${registration}/history`)}`}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Log In
              </Link>
              <Link
                href={`/aircraft/${registration}`}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Back to Aircraft
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show skeleton if loading OR auto-extending (and no data/error yet)
  if (isLoading || isAutoExtending) {
    if (!rawData && !error) {
      return (
        <div className="min-h-screen bg-white py-8">
          <div className="max-w-6xl mx-auto px-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Quota invité dépassé: UI gérée par le modal global

  if (error) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-red-500 mb-4">
              <svg
                className="w-12 h-12 mx-auto"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Error Loading Flight History
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.reload();
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              aria-label="Reload page"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Early return if no registration - après tous les hooks pour respecter les règles React
  if (!registration) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invalid Registration
            </h2>
            <p className="text-gray-600 mb-4">
              No aircraft registration provided.
            </p>
            <Link
              href="/"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header - Rendu immédiatement sans animation pour améliorer le LCP */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Flight History
              </h1>
              <p className="text-gray-600">
                Aircraft Registration:{" "}
                <span className="font-semibold text-blue-600">
                  {registration}
                </span>
              </p>
            </div>
            <Link
              href={`/aircraft/${registration}`}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
            >
              ← Back to Aircraft
            </Link>
          </div>

          {/* Statistiques - Dimensions fixes pour éviter les layout shifts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 min-h-[100px]">
            {stats ? (
              <>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.totalFlights}
                  </div>
                  <div className="text-sm text-blue-700">Total Flights</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.totalDistance > 0
                      ? Math.round(stats.totalDistance).toLocaleString()
                      : "N/A"}
                  </div>
                  <div className="text-sm text-green-700">
                    km Flown ({days} days)
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.airportsVisited}
                  </div>
                  <div className="text-sm text-purple-700">Airports</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center min-h-[80px] flex flex-col justify-center">
                  <div className="text-2xl font-bold text-orange-600 min-h-[32px] flex items-center justify-center">
                    {stats.countriesVisited}
                  </div>
                  <div className="text-sm text-orange-700">Countries</div>
                </div>
              </>
            ) : (
              <>
                {/* Skeleton pour éviter les layout shifts */}
                <div className="bg-gray-50 rounded-lg p-4 text-center animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                </div>
              </>
            )}
          </div>

          {/* Days selector */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Show last:</span>
            <div className="flex gap-2">
              {daysOptions.map((day) => (
                <button
                  key={day}
                  onClick={() => setDays(day)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    days === day
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  aria-label={`Show last ${day} days`}
                  aria-pressed={days === day}
                >
                  {day} days
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Flight History - Dimensions fixes pour éviter les layout shifts */}
        <div className="min-h-[400px]">
          {flightHistory?.flights &&
          Array.isArray(flightHistory.flights) &&
          flightHistory.flights.length > 0 ? (
            <div className="space-y-4">
              {flightHistory.flights.map((flight, index) => (
                <FlightCard
                  key={`${flight.number}-${flight.date}-${index}`}
                  flight={flight}
                  formatDateTime={formatDateTime}
                  formatDate={formatDate}
                  formatDuration={formatDuration}
                  getStatusColor={getStatusColor}
                  onFlightClick={() => router.push(`/flight/${flight.number}?date=${flight.date}`)}
                />
              ))}
            </div>
          ) : (isAutoExtending || isLoading) && !rawData ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center min-h-[200px] flex items-center justify-center">
              <div className="animate-pulse w-full">
                <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
                <div className="h-20 bg-gray-200 rounded mx-auto"></div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
              {/* Message LCP - Rendu immédiatement pour améliorer le LCP */}
              <div className="text-gray-400 mb-4" aria-hidden="true">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No Flight History Found
              </h2>
              {/* Message LCP - Rendu immédiatement avec le texte statique */}
              <p className="text-gray-600 mb-4">
                No flights found for aircraft {registration} in the last {days} days.
              </p>
              <div className="flex gap-2 justify-center">
                {fallbackDaysOptions.map((day) => (
                  <button
                    key={day}
                    onClick={() => setDays(day)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    aria-label={`Try ${day} days`}
                  >
                    Try {day} days
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Composant mémorisé pour chaque vol pour réduire les re-renders et optimiser le DOM
const FlightCard = memo(({
  flight,
  formatDateTime,
  formatDate,
  formatDuration,
  getStatusColor,
  onFlightClick,
}: {
  flight: FlightHistory;
  formatDateTime: (dateTime: string) => string;
  formatDate: (dateTime: string) => string;
  formatDuration: (duration?: number) => string;
  getStatusColor: (status: string) => string;
  onFlightClick: () => void;
}) => {
  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer group hover:shadow-md transition-shadow min-h-[200px]"
      onClick={onFlightClick}
      style={{ contain: "layout style paint" }}
    >
      <div className="flex items-center justify-between mb-4 min-h-[60px]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate min-h-[24px]">
              {flight.airline.name} {flight.number}
            </h3>
            <p className="text-sm text-gray-600 min-h-[20px]">
              {formatDate(flight.departure.scheduledTime)}
            </p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium border flex-shrink-0 ${getStatusColor(
            flight.status
          )}`}
        >
          {flight.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Departure */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            Departure
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href={`/airport/${flight.departure.airport.iata}`}
                onClick={(e) => e.stopPropagation()}
                className="text-lg font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer flex-shrink-0"
              >
                {flight.departure.airport.iata}
              </Link>
              <span className="text-sm text-gray-600 truncate">
                {flight.departure.airport.name}
              </span>
            </div>
            <div className="text-sm text-gray-600 truncate">
              {flight.departure.airport.city}
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Scheduled:</span>{" "}
              <span className="font-medium">
                {formatDateTime(flight.departure.scheduledTime)}
              </span>
            </div>
            {flight.departure.actualTime && (
              <div className="text-sm">
                <span className="text-gray-500">Actual:</span>{" "}
                <span className="font-medium text-green-600">
                  {formatDateTime(flight.departure.actualTime)}
                </span>
              </div>
            )}
            {flight.departure.terminal && (
              <div className="text-sm">
                <span className="text-gray-500">Terminal:</span>{" "}
                <span className="font-medium">
                  {flight.departure.terminal}
                </span>
              </div>
            )}
            {flight.departure.gate && (
              <div className="text-sm">
                <span className="text-gray-500">Gate:</span>{" "}
                <span className="font-medium">
                  {flight.departure.gate}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Arrival */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            Arrival
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href={`/airport/${flight.arrival.airport.iata}`}
                onClick={(e) => e.stopPropagation()}
                className="text-lg font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer flex-shrink-0"
              >
                {flight.arrival.airport.iata}
              </Link>
              <span className="text-sm text-gray-600 truncate">
                {flight.arrival.airport.name}
              </span>
            </div>
            <div className="text-sm text-gray-600 truncate">
              {flight.arrival.airport.city}
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Scheduled:</span>{" "}
              <span className="font-medium">
                {formatDateTime(flight.arrival.scheduledTime)}
              </span>
            </div>
            {flight.arrival.actualTime && (
              <div className="text-sm">
                <span className="text-gray-500">Actual:</span>{" "}
                <span className="font-medium text-green-600">
                  {formatDateTime(flight.arrival.actualTime)}
                </span>
              </div>
            )}
            {flight.arrival.terminal && (
              <div className="text-sm">
                <span className="text-gray-500">Terminal:</span>{" "}
                <span className="font-medium">
                  {flight.arrival.terminal}
                </span>
              </div>
            )}
            {flight.arrival.gate && (
              <div className="text-sm">
                <span className="text-gray-500">Gate:</span>{" "}
                <span className="font-medium">
                  {flight.arrival.gate}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Flight Details */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600 flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            {flight.distance &&
            flight.distance > 0 &&
            Math.round(flight.distance) > 0 ? (
              <span>
                <span className="font-medium">Distance:</span>{" "}
                {Math.round(flight.distance).toLocaleString()} km
              </span>
            ) : null}
            {flight.duration && flight.duration > 0 ? (
              <span>
                <span className="font-medium">Duration:</span>{" "}
                {formatDuration(flight.duration)}
              </span>
            ) : null}
            {(!flight.distance || flight.distance <= 0) &&
            (!flight.duration || flight.duration <= 0) ? (
              <span className="text-gray-400">
                No additional details
              </span>
            ) : null}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFlightClick();
            }}
            className="text-blue-600 hover:text-blue-700 font-medium group-hover:underline"
            aria-label="View flight details"
          >
            View Details →
          </button>
        </div>
      </div>
    </div>
  );
});

FlightCard.displayName = "FlightCard";
