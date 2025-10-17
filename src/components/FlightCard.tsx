"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

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
      latitude?: number;
      longitude?: number;
    };
    terminal?: string;
    gate?: string;
    scheduledTimeLocal: string;
    actualTimeLocal?: string;
    estimatedTimeLocal?: string;
    runwayTime?: string;
  };
  arrival: {
    airport: {
      iata: string;
      name: string;
      city: string;
      latitude?: number;
      longitude?: number;
    };
    terminal?: string;
    gate?: string;
    scheduledTimeLocal: string;
    actualTimeLocal?: string;
    estimatedTimeLocal?: string;
    runwayTime?: string;
  };
  status: string;
  distance?: number;
  codeshares?: string[];
  lastUpdated: string;
}

interface FlightCardProps {
  flightData: FlightData;
}

export default function FlightCard({ flightData }: FlightCardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [realTimeProgress, setRealTimeProgress] = useState(0);

  // Mettre à jour l'heure actuelle chaque seconde
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculer le pourcentage de progression en temps réel
  const calculateRealTimeProgress = () => {
    try {
      const now = currentTime.getTime();

      // Heure de départ (actual ou scheduled)
      const departureTime = flightData.departure.actualTimeLocal
        ? new Date(flightData.departure.actualTimeLocal).getTime()
        : new Date(flightData.departure.scheduledTimeLocal).getTime();

      // Heure d'arrivée (estimated ou scheduled)
      const arrivalTime = flightData.arrival.estimatedTimeLocal
        ? new Date(flightData.arrival.estimatedTimeLocal).getTime()
        : new Date(flightData.arrival.scheduledTimeLocal).getTime();

      // Si le vol n'a pas encore décollé
      if (now < departureTime) {
        return 0;
      }

      // Si le vol est arrivé
      if (now >= arrivalTime) {
        return 100;
      }

      // Calculer le pourcentage de progression
      const totalDuration = arrivalTime - departureTime;
      const elapsed = now - departureTime;
      const percentage = Math.min(
        Math.max((elapsed / totalDuration) * 100, 0),
        100
      );

      return Math.round(percentage);
    } catch (error) {
      console.log("Error calculating real-time progress:", error);
      // Fallback sur le statut si le calcul échoue
      return getProgressPercentage();
    }
  };

  // Calculer le pourcentage de progression basé sur le statut (fallback)
  const getProgressPercentage = () => {
    switch (flightData.status.toLowerCase()) {
      case "scheduled":
        return 0;
      case "boarding":
        return 15;
      case "departed":
        return 30;
      case "in flight":
        return 60;
      case "approaching":
        return 85;
      case "arrived":
      case "landed":
        return 100;
      case "delayed":
        return 5;
      case "cancelled":
        return 0;
      default:
        return 25;
    }
  };

  // Mettre à jour le progrès en temps réel
  useEffect(() => {
    const progress = calculateRealTimeProgress();
    setRealTimeProgress(progress);
  }, [currentTime, flightData]);

  // Calculer le temps restant estimé
  const getEstimatedTimeRemaining = () => {
    try {
      const now = currentTime.getTime();
      const arrivalTime = flightData.arrival.estimatedTimeLocal
        ? new Date(flightData.arrival.estimatedTimeLocal).getTime()
        : new Date(flightData.arrival.scheduledTimeLocal).getTime();

      const timeRemaining = arrivalTime - now;

      if (timeRemaining <= 0) {
        return "Arrived";
      }

      const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
      const minutes = Math.floor(
        (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
      );

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    } catch (error) {
      return "N/A";
    }
  };

  // Formater les heures
  const formatTime = (timeString: string) => {
    if (!timeString) return "N/A";
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });
    } catch {
      return timeString;
    }
  };

  // Obtenir la couleur du statut
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
      case "approaching":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Utiliser le progrès en temps réel ou fallback sur le statut
  const progressPercentage =
    realTimeProgress > 0 ? realTimeProgress : getProgressPercentage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
    >
      {/* En-tête du vol */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                <span className="block md:inline">
                  {flightData.airline.name}
                </span>
                <span className="block md:inline md:ml-2 text-blue-600">
                  {flightData.number}
                </span>
              </h1>
              <p className="text-sm text-gray-600">
                {flightData.aircraft.model} •
                <a
                  href={`/aircraft/${flightData.aircraft.registration}`}
                  className="text-blue-600 hover:text-blue-700 transition cursor-pointer ml-1"
                >
                  {flightData.aircraft.registration}
                </a>
              </p>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                flightData.status
              )}`}
            >
              {flightData.status}
            </span>
            <p className="text-xs text-gray-500 mt-1 hidden md:block">
              Last updated {formatTime(flightData.lastUpdated)}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline du vol */}
      <div className="p-4 md:p-6">
        {/* Route avec progress bar - Mobile First */}
        <div className="mb-8">
          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2 mx-auto">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 text-center">
                {flightData.departure.airport.iata}
              </h3>
              <p className="text-sm text-gray-600 text-center">
                {flightData.departure.airport.name}
              </p>
              <p className="text-xs text-gray-500 text-center">
                {flightData.departure.airport.city}
              </p>
            </div>

            {/* Progress bar */}
            <div className="flex-1 mx-8">
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-blue-500 via-blue-400 to-green-500 h-3 rounded-full relative"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  >
                    {/* Effet de brillance animé */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                        delay: 0.5,
                      }}
                    />
                  </motion.div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>Departure</span>
                  <div className="text-center">
                    <span className="font-medium text-blue-600">
                      {progressPercentage}%
                    </span>
                    {progressPercentage > 0 && progressPercentage < 100 && (
                      <div className="text-xs text-gray-400 mt-1">
                        ETA: {getEstimatedTimeRemaining()}
                      </div>
                    )}
                  </div>
                  <span>Arrival</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2 mx-auto">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 text-center">
                {flightData.arrival.airport.iata}
              </h3>
              <p className="text-sm text-gray-600 text-center">
                {flightData.arrival.airport.name}
              </p>
              <p className="text-xs text-gray-500 text-center">
                {flightData.arrival.airport.city}
              </p>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden">
            {/* Route mobile */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-center flex-1">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2 mx-auto">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm text-center">
                  {flightData.departure.airport.iata}
                </h3>
                <p className="text-xs text-gray-600 truncate text-center">
                  {flightData.departure.airport.city}
                </p>
                <p className="text-xs text-gray-500 truncate text-center mt-1">
                  {flightData.departure.airport.name}
                </p>
              </div>

              <div className="flex-1 mx-4">
                <div className="w-full bg-gray-200 rounded-full h-2 relative overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-blue-500 via-blue-400 to-green-500 h-2 rounded-full relative"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                        delay: 0.5,
                      }}
                    />
                  </motion.div>
                </div>
                <div className="text-center mt-1">
                  <span className="text-xs font-medium text-blue-600">
                    {progressPercentage}%
                  </span>
                  {progressPercentage > 0 && progressPercentage < 100 && (
                    <div className="text-xs text-gray-400">
                      {getEstimatedTimeRemaining()}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center flex-1">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2 mx-auto">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm text-center">
                  {flightData.arrival.airport.iata}
                </h3>
                <p className="text-xs text-gray-600 truncate text-center">
                  {flightData.arrival.airport.city}
                </p>
                <p className="text-xs text-gray-500 truncate text-center mt-1">
                  {flightData.arrival.airport.name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Informations détaillées */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-6">
          {/* Menu de gauche - Informations générales */}
          <div className="space-y-6">
            {/* Aircraft */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Aircraft
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                {flightData.aircraft.model}
              </p>
            </div>

            {/* Registration (cliquable) */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Registration
              </h3>
              <a
                href={`/aircraft/${flightData.aircraft.registration}`}
                className="text-lg font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
              >
                {flightData.aircraft.registration}
              </a>
            </div>

            {/* Distance */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Distance
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                {flightData.distance && flightData.distance > 0
                  ? `${flightData.distance.toLocaleString()} km`
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Menu de droite - Aéroports */}
          <div className="space-y-6">
            {/* From (cliquable) */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">From</h3>
              <a
                href={`/airport/${flightData.departure.airport.iata}`}
                className="text-lg font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
              >
                {flightData.departure.airport.iata} —{" "}
                {flightData.departure.airport.name}
              </a>
            </div>

            {/* To (cliquable) */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">To</h3>
              <a
                href={`/airport/${flightData.arrival.airport.iata}`}
                className="text-lg font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
              >
                {flightData.arrival.airport.iata} —{" "}
                {flightData.arrival.airport.name}
              </a>
            </div>
          </div>
        </div>

        {/* Bulles de résultat avec les heures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Départ */}
          <div className="bg-gray-50 rounded-xl p-4 md:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </div>
              Departure
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Scheduled:</span>
                <span className="text-sm font-medium">
                  {formatTime(flightData.departure.scheduledTimeLocal)}
                </span>
              </div>
              {flightData.departure.estimatedTimeLocal && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Estimated:</span>
                  <span className="text-sm font-medium text-blue-600">
                    {formatTime(flightData.departure.estimatedTimeLocal)}
                  </span>
                </div>
              )}
              {flightData.departure.actualTimeLocal && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Actual:</span>
                  <span className="text-sm font-medium text-green-600">
                    {formatTime(flightData.departure.actualTimeLocal)}
                  </span>
                </div>
              )}
              {flightData.departure.gate && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Gate:</span>
                  <span className="text-sm font-medium">
                    {flightData.departure.gate}
                  </span>
                </div>
              )}
              {flightData.departure.terminal && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Terminal:</span>
                  <span className="text-sm font-medium">
                    {flightData.departure.terminal}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Arrivée */}
          <div className="bg-gray-50 rounded-xl p-4 md:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              Arrival
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Scheduled:</span>
                <span className="text-sm font-medium">
                  {formatTime(flightData.arrival.scheduledTimeLocal)}
                </span>
              </div>
              {flightData.arrival.estimatedTimeLocal && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Estimated:</span>
                  <span className="text-sm font-medium text-blue-600">
                    {formatTime(flightData.arrival.estimatedTimeLocal)}
                  </span>
                </div>
              )}
              {flightData.arrival.actualTimeLocal && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Actual:</span>
                  <span className="text-sm font-medium text-green-600">
                    {formatTime(flightData.arrival.actualTimeLocal)}
                  </span>
                </div>
              )}
              {flightData.arrival.gate && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Gate:</span>
                  <span className="text-sm font-medium">
                    {flightData.arrival.gate}
                  </span>
                </div>
              )}
              {flightData.arrival.terminal && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Terminal:</span>
                  <span className="text-sm font-medium">
                    {flightData.arrival.terminal}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
