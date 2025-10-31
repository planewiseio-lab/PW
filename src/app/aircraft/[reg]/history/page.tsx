"use client";

import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { correctFlightsStatus } from "@/lib/flightStatusRules";
import { useAircraftHistory } from "@/hooks/useAircraftHistory";
import { triggerGuestQuotaExceeded } from "@/hooks/useGuestQuotaExceeded";

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

  // Early return if no registration
  if (!registration) {
    console.error("[AircraftHistoryPage] No registration found");
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
  const [days, setDays] = useState(3);
  const autoTriedRef = useRef(false);
  const [isAutoExtending, setIsAutoExtending] = useState(false);
  const fallbackDays = [3, 7, 14, 30];
  const [stats, setStats] = useState<{
    totalFlights: number;
    totalDistance: number;
    countriesVisited: number;
    airportsVisited: number;
  } | null>(null);

  const {
    data: rawData,
    error: fetchError,
    isLoading,
  } = useAircraftHistory(registration, days);

  useEffect(() => {
    if (!rawData) return;
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
    setFlightHistory(data);
    // Auto-extend range on first load if empty
    if (!autoTriedRef.current && (!data.flights || data.flights.length === 0)) {
      const idx = fallbackDays.indexOf(days);
      if (idx > -1 && idx < fallbackDays.length - 1) {
        autoTriedRef.current = true; // avoid loops
        setIsAutoExtending(true);
        setDays(fallbackDays[idx + 1]);
      }
    }
    if (data.flights && data.flights.length > 0) {
      const totalFlights = data.flights.length;
      const totalDistance = data.flights.reduce(
        (sum: number, flight: FlightHistory) => sum + (flight.distance || 0),
        0
      );
      const airports = new Set<string>();
      data.flights.forEach((flight: FlightHistory) => {
        airports.add(flight.departure.airport.iata);
        airports.add(flight.arrival.airport.iata);
      });
      const countries = new Set<string>();
      data.flights.forEach((flight: FlightHistory) => {
        const depCountry = flight.departure.airport.iata.substring(0, 1);
        const arrCountry = flight.arrival.airport.iata.substring(0, 1);
        countries.add(depCountry);
        countries.add(arrCountry);
      });
      setStats({
        totalFlights,
        totalDistance: Math.round(totalDistance),
        countriesVisited: countries.size,
        airportsVisited: airports.size,
      });
    }
    // Stop auto-extending spinner once we have tried extension
    if (autoTriedRef.current) {
      setIsAutoExtending(false);
    }
  }, [rawData]);

  useEffect(() => {
    setError(fetchError);
  }, [fetchError]);

  const formatDateTime = (dateTime: string) => {
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
  };

  const formatDate = (dateTime: string) => {
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
  };

  const getStatusColor = (status: string) => {
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
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return "N/A";
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h ${minutes}m`;
  };

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
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6"
        >
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

          {/* Statistiques */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.countriesVisited}
                </div>
                <div className="text-sm text-orange-700">Countries</div>
              </div>
            </div>
          )}

          {/* Days selector */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Show last:</span>
            <div className="flex gap-2">
              {[3, 7].map((day) => (
                <button
                  key={day}
                  onClick={() => setDays(day)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    days === day
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {day} days
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Flight History */}
        {flightHistory?.flights &&
        Array.isArray(flightHistory.flights) &&
        flightHistory.flights.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {flightHistory.flights.map((flight, index) => (
              <motion.div
                key={`${flight.number}-${flight.date}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer group"
                whileHover={{
                  scale: 1.02,
                  y: -4,
                  boxShadow:
                    "0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)",
                }}
                onClick={() =>
                  router.push(`/flight/${flight.number}?date=${flight.date}`)
                }
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {flight.airline.name} {flight.number}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formatDate(flight.departure.scheduledTime)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
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
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/airport/${flight.departure.airport.iata}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-lg font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                        >
                          {flight.departure.airport.iata}
                        </Link>
                        <span className="text-sm text-gray-600">
                          {flight.departure.airport.name}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
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
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/airport/${flight.arrival.airport.iata}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-lg font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                        >
                          {flight.arrival.airport.iata}
                        </Link>
                        <span className="text-sm text-gray-600">
                          {flight.arrival.airport.name}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
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
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-4">
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
                        router.push(
                          `/flight/${flight.number}?date=${flight.date}`
                        );
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium group-hover:underline"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (isAutoExtending || isLoading) && !rawData ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center"
          >
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
              <div className="h-20 bg-gray-200 rounded mx-auto"></div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center"
          >
            <div className="text-gray-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Flight History Found
            </h2>
            <p className="text-gray-600 mb-4">
              No flights found for aircraft {registration} in the last {days}{" "}
              days.
            </p>
            <div className="flex gap-2 justify-center">
              {[7, 14, 30].map((day) => (
                <button
                  key={day}
                  onClick={() => setDays(day)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Try {day} days
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
