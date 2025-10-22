"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import FlightCard from "@/components/FlightCard";
import { motion, AnimatePresence } from "framer-motion";
import { fetchFlightData } from "@/lib/flightRequestDeduplication";

// Skeleton pour la page de détail d'un vol
function FlightDetailSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
      {/* Header avec numéro de vol et compagnie */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-gray-200 rounded"></div>
          <div className="h-5 w-24 bg-gray-200 rounded"></div>
        </div>
        <div className="h-8 w-20 bg-gray-200 rounded-full"></div>
      </div>

      {/* Informations avion */}
      <div className="mb-6">
        <div className="h-6 w-16 bg-gray-200 rounded mb-3"></div>
        <div className="flex items-center space-x-4">
          <div className="h-5 w-20 bg-gray-200 rounded"></div>
          <div className="h-5 w-16 bg-gray-200 rounded"></div>
        </div>
      </div>

      {/* Route et horaires */}
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

      {/* Informations supplémentaires */}
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
      setFlightData(null); // Réinitialiser les données

      // Annuler la requête précédente si elle existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Créer un nouveau AbortController
      abortControllerRef.current = new AbortController();

      const data = await fetchFlightData(
        flight,
        date,
        abortControllerRef.current.signal
      );

      if (data && !data.error) {
        setFlightData(data);
      } else {
        setError(data.error || "No flight data found for the selected date");
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        // Requête annulée, ne pas afficher d'erreur
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

  useEffect(() => {
    if (flightNumber) {
      // Petit délai pour éviter les requêtes trop rapides
      const timer = setTimeout(() => {
        loadFlightData(flightNumber, searchDate);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [flightNumber, searchDate]);

  // Nettoyer les requêtes en cours lors du démontage
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Écouter les changements de paramètres d'URL
  useEffect(() => {
    const dateFromUrl = searchParams.get("date");
    if (dateFromUrl && dateFromUrl !== searchDate) {
      setSearchDate(dateFromUrl);
    }
  }, [searchParams, searchDate]);

  const handleDateChange = (newDate: string) => {
    setSearchDate(newDate);
    if (flightNumber) {
      loadFlightData(flightNumber, newDate);
    }
  };

  // Vérifier si la date est dans le futur
  const isFutureDate = () => {
    const searchDateObj = new Date(searchDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return searchDateObj > today;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Avertissement pour les dates futures */}
      {isFutureDate() && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="text-sm text-yellow-800">
              <strong>⚠️ Attention:</strong> La date {searchDate} est dans le
              futur. L'API retourne probablement le vol le plus récent
              disponible au lieu du vol pour cette date spécifique.
            </div>
          </div>
        </div>
      )}

      {/* Contenu principal */}
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
                Chargement des données du vol {flightNumber}...
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

          {flightData && !loading && (
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
