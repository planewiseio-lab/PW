"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
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

  const loadFlightData = useCallback(async (flight: string, date: string) => {
    console.log("[FlightPage] loadFlightData called", { flight, date });
    try {
      setLoading(true);
      setError(null);
      setFlightData(null); // Reset data

      // Cancel previous request if it exists and not already aborted
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        try {
          abortControllerRef.current.abort();
        } catch (e) {
          // Ignore errors if already aborted
        }
      }

      // Create a new AbortController
      abortControllerRef.current = new AbortController();

      console.log("[FlightPage] Calling fetchFlightData...");
      const data = await fetchFlightData(
        flight,
        date,
        abortControllerRef.current.signal
      );
      console.log("[FlightPage] fetchFlightData returned", { 
        hasData: !!data,
        dataType: typeof data,
        isArray: Array.isArray(data),
      });

      // Si l'API retourne directement un tableau (format brut), utiliser le premier élément
      let processedData = data;
      if (Array.isArray(data) && data.length > 0) {
        console.log("[FlightPage] API returned raw array, using first element", {
          arrayLength: data.length,
          firstElement: data[0],
        });
        const rawFlight = data[0];
        
        // Normaliser les données brutes pour qu'elles correspondent au format attendu
        processedData = {
          number: rawFlight.number || rawFlight.callSign || "",
          airline: {
            name: rawFlight.airline?.name || "Unknown Airline",
            iata: rawFlight.airline?.iata || "",
            icao: rawFlight.airline?.icao || "",
          },
          aircraft: {
            model: rawFlight.aircraft?.model || "Unknown Aircraft",
            registration: rawFlight.aircraft?.reg || rawFlight.aircraft?.registration || "Not available",
          },
          departure: {
            airport: {
              iata: rawFlight.departure?.airport?.iata || rawFlight.departure?.airport?.icao || "",
              name: rawFlight.departure?.airport?.name || rawFlight.departure?.airport?.municipalityName || "",
              city: rawFlight.departure?.airport?.city || rawFlight.departure?.airport?.municipalityName || "",
            },
            scheduledTimeLocal: rawFlight.departure?.scheduledTime?.local || "",
            actualTimeLocal: rawFlight.departure?.revisedTime?.local || rawFlight.departure?.actualTime?.local || "",
            estimatedTimeLocal: rawFlight.departure?.estimatedTime?.local || "",
          },
          arrival: {
            airport: {
              iata: rawFlight.arrival?.airport?.iata || rawFlight.arrival?.airport?.icao || "",
              name: rawFlight.arrival?.airport?.name || rawFlight.arrival?.airport?.municipalityName || "",
              city: rawFlight.arrival?.airport?.city || rawFlight.arrival?.airport?.municipalityName || "",
            },
            scheduledTimeLocal: rawFlight.arrival?.scheduledTime?.local || "",
            actualTimeLocal: rawFlight.arrival?.revisedTime?.local || rawFlight.arrival?.actualTime?.local || "",
            estimatedTimeLocal: rawFlight.arrival?.predictedTime?.local || rawFlight.arrival?.estimatedTime?.local || "",
          },
          status: rawFlight.status || "Unknown",
          distance: rawFlight.greatCircleDistance?.km || null,
          lastUpdated: rawFlight.lastUpdatedUtc || new Date().toISOString(),
        };
        console.log("[FlightPage] Normalized raw flight data", processedData);
      }

      console.log("[FlightPage] Received data:", {
        hasData: !!processedData,
        hasError: !!processedData?.error,
        hasFlights: !!processedData?.flights,
        flightsLength: Array.isArray(processedData?.flights) ? processedData.flights.length : 0,
        hasNumber: !!processedData?.number,
        hasAirline: !!processedData?.airline,
        hasAircraft: !!processedData?.aircraft,
        hasDeparture: !!processedData?.departure,
        dataKeys: processedData ? Object.keys(processedData) : [],
      });

      // Vérifier si les données sont valides
      if (processedData && !processedData.error) {
        // Vérifier si on a un tableau de vols
        if (processedData.flights && Array.isArray(processedData.flights) && processedData.flights.length > 0) {
          // Si on a un tableau de vols, utiliser le premier vol
          console.log("[FlightPage] Using flight from flights array");
          setFlightData(processedData.flights[0]);
        } else if (
          // Vérifier si c'est un objet de vol unique (format actuel de l'API)
          // L'API retourne directement un objet vol avec number, airline, aircraft, departure, arrival
          // Vérifier que les propriétés essentielles existent
          processedData.number ||
          (processedData.airline && typeof processedData.airline === 'object') ||
          (processedData.aircraft && typeof processedData.aircraft === 'object') ||
          (processedData.departure && typeof processedData.departure === 'object') ||
          (processedData.arrival && typeof processedData.arrival === 'object')
        ) {
          console.log("[FlightPage] Using direct flight object", {
            hasNumber: !!processedData.number,
            hasAirline: !!processedData.airline,
            hasAircraft: !!processedData.aircraft,
            hasDeparture: !!processedData.departure,
            hasArrival: !!processedData.arrival,
            departureAirport: processedData.departure?.airport,
            arrivalAirport: processedData.arrival?.airport,
          });
          setFlightData(processedData);
        } else {
          // Pas de vol trouvé, mais ce n'est pas une erreur - afficher le message approprié
          console.log("[FlightPage] No flight data found in response", {
            data: processedData,
            hasNumber: !!processedData?.number,
            hasAirline: !!processedData?.airline,
            airlineType: typeof processedData?.airline,
            airlineKeys: processedData?.airline ? Object.keys(processedData.airline) : [],
            hasDeparture: !!processedData?.departure,
            departureType: typeof processedData?.departure,
            departureKeys: processedData?.departure ? Object.keys(processedData.departure) : [],
          });
          setFlightData(null);
          setError(null); // Pas d'erreur, juste pas de données
        }
      } else {
        // Il y a une vraie erreur dans la réponse
        console.log("[FlightPage] Error in response:", processedData?.error);
        setError(processedData?.error || "No flight data found for the selected date");
        setFlightData(null);
      }
    } catch (err: any) {
      console.error("[FlightPage] Error in loadFlightData:", err);
      if (err.name === "AbortError") {
        // Request cancelled, do not show error
        console.log("[FlightPage] Request was aborted");
        return;
      } else if (err.name === "AbortError" && err.message.includes("timeout")) {
        console.log("[FlightPage] Request timeout");
        setError("Request timeout - please try again");
      } else if (
        err.message?.includes("GUEST_QUOTA_EXCEEDED") ||
        err.message?.includes("Guest quota exceeded")
      ) {
        // Ne pas afficher l'erreur sur la page pour les erreurs de quota invité
        // Le modal s'affichera automatiquement via triggerGuestQuotaExceeded
        console.log("[FlightPage] Guest quota exceeded");
        setError(null);
        return;
      } else {
        console.error("[FlightPage] Unexpected error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    } finally {
      console.log("[FlightPage] loadFlightData finished, setting loading to false");
      setLoading(false);
    }
  }, []); // Pas de dépendances - la fonction est stable

  // Handle URL parameter changes and load flight data
  useEffect(() => {
    let isMounted = true;
    
    const dateFromUrl = searchParams.get("date");
    const today = new Date().toISOString().split("T")[0];
    const finalDate = dateFromUrl || today;

    // Mettre à jour searchDate seulement si différent
    if (dateFromUrl && dateFromUrl !== searchDate) {
      setSearchDate(dateFromUrl);
    } else if (!dateFromUrl && searchDate !== today) {
      setSearchDate(today);
    }

    if (flightNumber) {
      console.log("[FlightPage] useEffect triggering loadFlightData", { flightNumber, finalDate });
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
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        try {
          abortControllerRef.current.abort();
        } catch (e) {
          // Ignore errors if already aborted
        }
      }
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      isMounted = false;
      window.removeEventListener("pagehide", handlePageHide);
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        try {
          abortControllerRef.current.abort();
        } catch (e) {
          // Ignore errors if already aborted - signal might be already aborted
        }
      }
    };
  }, [flightNumber, searchParams, loadFlightData]); // Retirer searchDate des dépendances pour éviter les boucles

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
