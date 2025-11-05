"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import FlightCard from "@/components/FlightCard";
import { motion, AnimatePresence } from "framer-motion";
import { fetchFlightData } from "@/lib/flightRequestDeduplication";
import StructuredData from "@/components/StructuredData";

// Skeleton for flight detail page
function FlightDetailSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
      {/* Header with flight number and airline */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-gray-200 rounded"></div>
          <div className="h-5 w-24 bg-gray-200 rounded"></div>
        </div>
        <div className="h-8 w-20 bg-gray-200 rounded-full"></div>
      </div>

      {/* Aircraft information */}
      <div className="mb-6">
        <div className="h-6 w-16 bg-gray-200 rounded mb-3"></div>
        <div className="flex items-center space-x-4">
          <div className="h-5 w-20 bg-gray-200 rounded"></div>
          <div className="h-5 w-16 bg-gray-200 rounded"></div>
        </div>
      </div>

      {/* Route and schedules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-12 bg-gray-200 rounded"></div>
            <div className="h-6 w-16 bg-gray-200 rounded"></div>
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
          </div>
          <div className="flex-1 flex items-center justify-center mx-8">
            <div className="h-px bg-gray-200 flex-1"></div>
            <div className="mx-4 h-8 w-8 bg-gray-200 rounded-full"></div>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>
          <div className="space-y-2">
            <div className="h-5 w-12 bg-gray-200 rounded"></div>
            <div className="h-6 w-16 bg-gray-200 rounded"></div>
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>

      {/* Additional information */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-16 bg-gray-200 rounded"></div>
            <div className="h-5 w-20 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 bg-gray-200 rounded"></div>
            <div className="h-5 w-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FlightData {
  number: string;
  airline: {
    name: string;
    iata: string;
    icao: string;
  };
  aircraft: {
    model: string;
    registration: string;
  };
  departure: {
    airport: {
      iata: string;
      name: string;
      city: string;
    };
    scheduledTimeLocal: string;
    actualTimeLocal?: string;
    estimatedTimeLocal?: string;
  };
  arrival: {
    airport: {
      iata: string;
      name: string;
      city: string;
    };
    scheduledTimeLocal: string;
    actualTimeLocal?: string;
    estimatedTimeLocal?: string;
  };
  status: string;
  distance?: number;
  lastUpdated: string;
}

function FlightPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const flightNumber = params.flight as string;
  const abortControllerRef = useRef<AbortController | null>(null);

  const [flightData, setFlightData] = useState<FlightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchDate, setSearchDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const loadFlightData = async (flight: string, date: string) => {
    try {
      setLoading(true);
      setError(null);
      setFlightData(null); // Reset data

      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create a new AbortController
      abortControllerRef.current = new AbortController();

      const data = await fetchFlightData(
        flight,
        date,
        abortControllerRef.current.signal
      );

      console.log("[FlightPage] Received data:", {
        hasData: !!data,
        hasError: !!data?.error,
        hasFlights: !!data?.flights,
        flightsLength: Array.isArray(data?.flights) ? data.flights.length : 0,
        hasNumber: !!data?.number,
        hasAirline: !!data?.airline,
        hasAircraft: !!data?.aircraft,
        hasDeparture: !!data?.departure,
        dataKeys: data ? Object.keys(data) : [],
      });

      // Vérifier si les données sont valides
      if (data && !data.error) {
        // Vérifier si on a un tableau de vols
        if (data.flights && Array.isArray(data.flights) && data.flights.length > 0) {
          // Si on a un tableau de vols, utiliser le premier vol
          console.log("[FlightPage] Using flight from flights array");
          setFlightData(data.flights[0]);
        } else if (
          // Vérifier si c'est un objet de vol unique (format actuel de l'API)
          // L'API retourne directement un objet vol avec number, airline, aircraft, departure, arrival
          data.number ||
          (data.airline && typeof data.airline === 'object') ||
          (data.aircraft && typeof data.aircraft === 'object') ||
          (data.departure && typeof data.departure === 'object') ||
          (data.arrival && typeof data.arrival === 'object')
        ) {
          console.log("[FlightPage] Using direct flight object");
          setFlightData(data);
        } else {
          // Pas de vol trouvé, mais ce n'est pas une erreur - afficher le message approprié
          console.log("[FlightPage] No flight data found in response");
          setFlightData(null);
          setError(null); // Pas d'erreur, juste pas de données
        }
      } else {
        // Il y a une vraie erreur dans la réponse
        console.log("[FlightPage] Error in response:", data?.error);
        setError(data?.error || "No flight data found for the selected date");
        setFlightData(null);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        // Request cancelled, do not show error
        return;
      } else if (err.name === "AbortError" && err.message.includes("timeout")) {
        setError("Request timeout - please try again");
      } else if (
        err.message?.includes("GUEST_QUOTA_EXCEEDED") ||
        err.message?.includes("Guest quota exceeded")
      ) {
        // Ne pas afficher l'erreur sur la page pour les erreurs de quota invité
        // Le modal s'affichera automatiquement via triggerGuestQuotaExceeded
        setError(null);
        return;
      } else {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle URL parameter changes and load flight data
  useEffect(() => {
    let isMounted = true;
    
    const dateFromUrl = searchParams.get("date");
    const finalDate =
      dateFromUrl && dateFromUrl !== searchDate ? dateFromUrl : searchDate;

    if (dateFromUrl && dateFromUrl !== searchDate) {
      setSearchDate(dateFromUrl);
    }

    if (flightNumber) {
      // Charger immédiatement pour améliorer le LCP
      loadFlightData(flightNumber, finalDate).catch((err) => {
        if (!isMounted) return;
        if (err.name !== "AbortError") {
          console.error("[FlightPage] Error loading flight data:", err);
        }
      });
    }

    // Nettoyer les WebSockets lors du pagehide pour permettre le bfcache
    const handlePageHide = () => {
      // Nettoyer les requêtes en cours
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      isMounted = false;
      window.removeEventListener("pagehide", handlePageHide);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [flightNumber, searchParams, searchDate]);

  const handleDateChange = (newDate: string) => {
    setSearchDate(newDate);
    if (flightNumber) {
      loadFlightData(flightNumber, newDate);
    }
  };

  // Check if the date is in the future
  const isFutureDate = () => {
    const searchDateObj = new Date(searchDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return searchDateObj > today;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Warning for future dates */}
      {isFutureDate() && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="text-sm text-yellow-800">
              <strong>⚠️ Warning:</strong> The date {searchDate} is in the
              future. The API probably returns the most recent available flight
              instead of the flight for this specific date.
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center text-gray-500 mb-4">
                Loading flight data for {flightNumber}...
              </div>
              <FlightDetailSkeleton />
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"
            >
              <p className="text-red-600 font-medium">{error}</p>
            </motion.div>
          )}

          {!loading && !error && !flightData && (
            <motion.div
              key="no-data"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center"
            >
              <p className="text-yellow-800 font-medium">No flight data available for this date.</p>
            </motion.div>
          )}

          {flightData && !loading && !error && (
            <motion.div
              key="flight-data"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              <StructuredData
                type="flight"
                data={{
                  number: flightData.number,
                  departure: flightData.departure,
                  arrival: flightData.arrival,
                  aircraft: flightData.aircraft,
                  airline: flightData.airline,
                }}
              />
              {/* FlightCard - LCP element - Rendu immédiatement sans delay */}
              <FlightCard flightData={flightData} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function FlightPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    }>
      <FlightPageContent />
    </Suspense>
  );
}
