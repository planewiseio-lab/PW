"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import FlightCard from "@/components/FlightCard";
import { motion, AnimatePresence } from "framer-motion";
import { fetchFlightData } from "@/lib/flightRequestDeduplication";

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

export default function FlightPage() {
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

      if (data && !data.error) {
        // Vérifier si on a des vols ou si c'est un payload vide
        if (data.flights && Array.isArray(data.flights) && data.flights.length > 0) {
          // Si on a des vols, utiliser le premier vol
          setFlightData(data.flights[0] || data);
        } else if (data.number && (data.airline || data.aircraft || data.departure)) {
          // Si c'est un objet de vol unique (ancien format)
          setFlightData(data);
        } else {
          // Pas de vol trouvé, mais ce n'est pas une erreur - afficher le message approprié
          setFlightData(null);
          setError(null); // Pas d'erreur, juste pas de données
        }
      } else {
        // Il y a une vraie erreur dans la réponse
        setError(data?.error || "No flight data found for the selected date");
        setFlightData(null);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        // Request cancelled, do not show error
        return;
      } else if (err.name === "AbortError" && err.message.includes("timeout")) {
        setError("Request timeout - please try again");
      } else {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle URL parameter changes and load flight data
  useEffect(() => {
    const dateFromUrl = searchParams.get("date");
    const finalDate =
      dateFromUrl && dateFromUrl !== searchDate ? dateFromUrl : searchDate;

    if (dateFromUrl && dateFromUrl !== searchDate) {
      setSearchDate(dateFromUrl);
    }

    if (flightNumber) {
      // Small delay to avoid requests that are too fast
      const timer = setTimeout(() => {
        loadFlightData(flightNumber, finalDate);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [flightNumber, searchParams, searchDate]);

  // Clean up ongoing requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              <FlightCard flightData={flightData} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
