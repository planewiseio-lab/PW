"use client";

import { motion } from "@/components/LazyMotion";
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
  // Vérifier que flightData est valide
  if (!flightData || (!flightData.departure && !flightData.arrival)) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
        <p className="text-gray-600">Flight data is incomplete or unavailable.</p>
      </div>
    );
  }

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

      // Vérifier que departure et arrival existent
      if (!flightData?.departure || !flightData?.arrival) {
        return getProgressPercentage();
      }

      // Heure de départ (actual ou scheduled)
      const departureTime = flightData.departure.actualTimeLocal
        ? new Date(flightData.departure.actualTimeLocal).getTime()
        : flightData.departure.scheduledTimeLocal
        ? new Date(flightData.departure.scheduledTimeLocal).getTime()
        : null;

      // Heure d'arrivée (actual, estimated, ou scheduled)
      const arrivalTime = flightData.arrival.actualTimeLocal
        ? new Date(flightData.arrival.actualTimeLocal).getTime()
        : flightData.arrival.estimatedTimeLocal
        ? new Date(flightData.arrival.estimatedTimeLocal).getTime()
        : flightData.arrival.scheduledTimeLocal
        ? new Date(flightData.arrival.scheduledTimeLocal).getTime()
        : null;

      // Si on n'a pas de temps de départ ou d'arrivée, utiliser le fallback
      if (!departureTime || !arrivalTime) {
        return getProgressPercentage();
      }

      // Vérifier le statut du vol
      const status = (flightData?.status || "").toLowerCase();
      const isArrived = 
        status === "arrived" || 
        status === "landed" || 
        status === "arrived*";

      // Si le vol n'a pas encore décollé (futur), retourner 0%
      if (departureTime && now < departureTime) {
        return 0;
      }

      // Si le vol est officiellement arrivé selon le statut, retourner 100%
      if (isArrived) {
        return 100;
      }

      // Si l'heure d'arrivée réelle est passée (pas juste estimée), considérer comme arrivé
      if (flightData.arrival?.actualTimeLocal && now >= new Date(flightData.arrival.actualTimeLocal).getTime()) {
        return 100;
      }

      // Si l'heure estimée est passée mais le statut est encore "EnRoute", 
      // limiter à 95% pour montrer que le vol est presque arrivé mais pas encore officiellement
      if (arrivalTime && now >= arrivalTime && (status === "enroute" || status === "in flight")) {
        return 95;
      }

      // Calculer le pourcentage de progression normal
      if (departureTime && arrivalTime) {
        const totalDuration = arrivalTime - departureTime;
        const elapsed = now - departureTime;
        const percentage = Math.min(
          Math.max((elapsed / totalDuration) * 100, 0),
          100
        );
        return Math.round(percentage);
      }

      return getProgressPercentage();
    } catch (error) {
      console.log("Error calculating real-time progress:", error);
      // Fallback sur le statut si le calcul échoue
      return getProgressPercentage();
    }
  };

  // Calculer le pourcentage de progression basé sur le statut (fallback)
  const getProgressPercentage = () => {
    const status = (flightData?.status || "").toLowerCase();
    
    // Vérifier d'abord si le vol est dans le futur
    const now = new Date().getTime();
    const departureTime = flightData.departure?.scheduledTimeLocal
      ? new Date(flightData.departure.scheduledTimeLocal).getTime()
      : flightData.departure?.actualTimeLocal
      ? new Date(flightData.departure.actualTimeLocal).getTime()
      : null;
    
    // Si le vol n'a pas encore décollé (futur), retourner 0%
    if (departureTime && now < departureTime) {
      return 0;
    }
    
    switch (status) {
      case "scheduled":
      case "expected":
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
        // Par défaut, vérifier si le vol est dans le futur
        if (departureTime && now < departureTime) {
          return 0;
        }
        // Si on ne peut pas déterminer, retourner 0 au lieu de 25
        return 0;
    }
  };

  // Mettre à jour le progrès en temps réel
  useEffect(() => {
    const progress = calculateRealTimeProgress();
    setRealTimeProgress(progress);
  }, [currentTime, flightData]);

  // Calculer le temps restant estimé ou la durée du vol
  const getEstimatedTimeRemaining = () => {
    try {
      const now = currentTime.getTime();
      
      // Vérifier que arrival et departure existent
      if (!flightData?.arrival || !flightData?.departure) {
        return "N/A";
      }
      
      // Vérifier d'abord le statut réel du vol
      const status = (flightData?.status || "").toLowerCase();
      const isArrived = 
        status === "arrived" || 
        status === "landed" || 
        status === "arrived*";

      // Si le vol est officiellement arrivé selon le statut
      if (isArrived) {
        return "Arrived";
      }

      // Si l'heure d'arrivée réelle est passée, considérer comme arrivé
      if (flightData.arrival.actualTimeLocal) {
        const actualArrivalTime = new Date(flightData.arrival.actualTimeLocal).getTime();
        if (now >= actualArrivalTime) {
          return "Arrived";
        }
      }

      // Calculer l'heure de départ (actual ou scheduled)
      const departureTime = flightData.departure.actualTimeLocal
        ? new Date(flightData.departure.actualTimeLocal).getTime()
        : flightData.departure.scheduledTimeLocal
        ? new Date(flightData.departure.scheduledTimeLocal).getTime()
        : null;

      // Utiliser l'heure d'arrivée (actual, estimated, ou scheduled)
      const arrivalTime = flightData.arrival.actualTimeLocal
        ? new Date(flightData.arrival.actualTimeLocal).getTime()
        : flightData.arrival.estimatedTimeLocal
        ? new Date(flightData.arrival.estimatedTimeLocal).getTime()
        : flightData.arrival.scheduledTimeLocal
        ? new Date(flightData.arrival.scheduledTimeLocal).getTime()
        : null;

      if (!arrivalTime) {
        return "N/A";
      }

      // Si le vol est dans le futur (n'a pas encore décollé), afficher la durée prévue
      if (departureTime && now < departureTime) {
        const flightDuration = arrivalTime - departureTime;
        
        // Vérifier que la durée est positive (les dates sont dans le bon ordre)
        if (flightDuration <= 0) {
          // Si la durée est négative ou nulle, essayer avec les heures scheduled uniquement
          const scheduledDeparture = flightData.departure.scheduledTimeLocal
            ? new Date(flightData.departure.scheduledTimeLocal).getTime()
            : null;
          const scheduledArrival = flightData.arrival.scheduledTimeLocal
            ? new Date(flightData.arrival.scheduledTimeLocal).getTime()
            : null;
          
          if (scheduledDeparture && scheduledArrival && scheduledArrival > scheduledDeparture) {
            const scheduledDuration = scheduledArrival - scheduledDeparture;
            const hours = Math.floor(scheduledDuration / (1000 * 60 * 60));
            const minutes = Math.floor(
              (scheduledDuration % (1000 * 60 * 60)) / (1000 * 60)
            );
            
            if (hours > 0) {
              return `${hours}h ${minutes}m`;
            } else {
              return `${minutes}m`;
            }
          }
          
          return "N/A";
        }
        
        const hours = Math.floor(flightDuration / (1000 * 60 * 60));
        const minutes = Math.floor(
          (flightDuration % (1000 * 60 * 60)) / (1000 * 60)
        );
        
        if (hours > 0) {
          return `${hours}h ${minutes}m`;
        } else {
          return `${minutes}m`;
        }
      }

      // Pour les vols en cours, calculer le temps restant
      const timeRemaining = arrivalTime - now;

      // Ne dire "Arrived" que si vraiment arrivé (statut ou heure réelle passée)
      // Sinon, afficher le temps restant même si négatif (vol en retard)
      if (timeRemaining <= 0 && !isArrived && !flightData.arrival.actualTimeLocal) {
        // Heure estimée passée mais vol pas encore arrivé officiellement
        // Calculer le retard en minutes
        const delayMinutes = Math.floor(Math.abs(timeRemaining) / (1000 * 60));
        if (delayMinutes < 60) {
          return `+${delayMinutes}m`;
        } else {
          const delayHours = Math.floor(delayMinutes / 60);
          const remainingMinutes = delayMinutes % 60;
          return `+${delayHours}h ${remainingMinutes}m`;
        }
      }

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
    switch ((status || "").toLowerCase()) {
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
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
    >
      {/* En-tête du vol */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between">
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
                  {flightData?.airline?.name || "Unknown Airline"}
                </span>
                <span className="block md:inline md:ml-2 text-blue-600">
                  {flightData.number}
                </span>
              </h1>
              <p className="text-sm text-gray-600">
                {(flightData?.aircraft?.model || "Unknown Aircraft")} •
                <a
                  href={`/aircraft/${flightData?.aircraft?.registration || ""}`}
                  className="text-blue-600 hover:text-blue-700 transition cursor-pointer ml-1"
                >
                  {flightData?.aircraft?.registration || "N/A"}
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

        {/* Mobile Layout - Réorganisé */}
        <div className="md:hidden text-center space-y-2">
          <h1 className="text-xl font-bold text-gray-900">
            {flightData?.airline?.name || "Unknown Airline"}
          </h1>
          <h2 className="text-lg font-semibold text-blue-600">
            {flightData.number}
          </h2>
          <p className="text-sm text-gray-600">
            {(flightData?.aircraft?.model || "Unknown Aircraft")} • {flightData?.aircraft?.registration || "N/A"}
          </p>
          <div>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                flightData.status
              )}`}
            >
              {flightData.status}
            </span>
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
              <h2 className="font-semibold text-gray-900 text-center text-lg">
                {flightData?.departure?.airport?.iata || "---"}
              </h2>
              <p className="text-sm text-gray-600 text-center">
                {flightData?.departure?.airport?.name || "Unknown"}
              </p>
              <p className="text-xs text-gray-500 text-center">
                {flightData?.departure?.airport?.city || ""}
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
              <h2 className="font-semibold text-gray-900 text-center text-lg">
                {flightData?.arrival?.airport?.iata || "---"}
              </h2>
              <p className="text-sm text-gray-600 text-center">
                {flightData?.arrival?.airport?.name || "Unknown"}
              </p>
              <p className="text-xs text-gray-500 text-center">
                {flightData?.arrival?.airport?.city || ""}
              </p>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden">
            {/* Aéroports avec SVG et flèche */}
            <div className="flex items-center justify-center gap-3 mb-4">
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
                <h2 className="font-semibold text-gray-900 text-base">
                  {flightData?.departure?.airport?.iata || "---"}
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  {flightData?.departure?.airport?.name || ""}
                </p>
              </div>
              
              {/* Flèche de gauche à droite */}
              <svg
                className="w-6 h-6 text-gray-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>

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
                <h2 className="font-semibold text-gray-900 text-base">
                  {flightData?.arrival?.airport?.iata || "---"}
                </h2>
                {flightData?.arrival?.airport?.name && (
                  <p className="text-xs text-gray-600 mt-1">
                    {flightData.arrival.airport.name}
                  </p>
                )}
              </div>
            </div>

            {/* Progress bar sous les aéroports */}
            <div className="mb-4">
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
          </div>
        </div>

        {/* Informations détaillées */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-6">
          {/* Menu de gauche - Informations générales */}
          <div className="space-y-6">
            {/* Aircraft */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">
                Aircraft
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {flightData?.aircraft?.model || "Unknown Aircraft"}
              </p>
            </div>

            {/* Registration (cliquable) */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">
                Registration
              </p>
              <a
                href={`/aircraft/${flightData?.aircraft?.registration || ""}`}
                className="text-lg font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
              >
                {flightData?.aircraft?.registration || "N/A"}
              </a>
            </div>

            {/* Distance */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">
                Distance
              </p>
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
              <p className="text-sm font-medium text-gray-500 mb-2">From</p>
              <a
                href={`/airport/${flightData?.departure?.airport?.iata || ""}`}
                className="text-lg font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
              >
                {flightData?.departure?.airport?.iata || "---"} —{" "}
                {flightData?.departure?.airport?.name || "Unknown"}
              </a>
            </div>

            {/* To (cliquable) */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">To</p>
              <a
                href={`/airport/${flightData?.arrival?.airport?.iata || ""}`}
                className="text-lg font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
              >
                {flightData?.arrival?.airport?.iata || "---"} —{" "}
                {flightData?.arrival?.airport?.name || "Unknown"}
              </a>
            </div>
          </div>
        </div>

        {/* Bulles de résultat avec les heures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Départ */}
          <div className="bg-gray-50 rounded-xl p-4 md:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
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
              </h2>
            <div className="space-y-3">
              {flightData?.departure?.scheduledTimeLocal && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700 font-medium">Scheduled:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatTime(flightData.departure.scheduledTimeLocal)}
                  </span>
                </div>
              )}
              {flightData?.departure?.estimatedTimeLocal && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700 font-medium">Estimated:</span>
                  <span className="text-sm font-semibold text-blue-700">
                    {formatTime(flightData.departure.estimatedTimeLocal)}
                  </span>
                </div>
              )}
              {flightData?.departure?.actualTimeLocal && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700 font-medium">Actual:</span>
                  <span className="text-sm font-semibold text-green-700">
                    {formatTime(flightData.departure.actualTimeLocal)}
                  </span>
                </div>
              )}
              {flightData?.departure?.gate && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Gate:</span>
                  <span className="text-sm font-medium">
                    {flightData.departure.gate}
                  </span>
                </div>
              )}
              {flightData?.departure?.terminal && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Terminal:</span>
                  <span className="text-sm font-medium">
                    {flightData.departure.terminal}
                  </span>
                </div>
              )}
              {!flightData?.departure?.scheduledTimeLocal && 
               !flightData?.departure?.estimatedTimeLocal && 
               !flightData?.departure?.actualTimeLocal && (
                <div className="text-sm text-gray-500 text-center">
                  No departure information available
                </div>
              )}
            </div>
          </div>

          {/* Arrivée */}
          <div className="bg-gray-50 rounded-xl p-4 md:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
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
            </h2>
            <div className="space-y-3">
              {flightData?.arrival?.scheduledTimeLocal && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700 font-medium">Scheduled:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatTime(flightData.arrival.scheduledTimeLocal)}
                  </span>
                </div>
              )}
              {flightData?.arrival?.estimatedTimeLocal && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700 font-medium">Estimated:</span>
                  <span className="text-sm font-semibold text-blue-700">
                    {formatTime(flightData.arrival.estimatedTimeLocal)}
                  </span>
                </div>
              )}
              {flightData?.arrival?.actualTimeLocal && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700 font-medium">Actual:</span>
                  <span className="text-sm font-semibold text-green-700">
                    {formatTime(flightData.arrival.actualTimeLocal)}
                  </span>
                </div>
              )}
              {flightData?.arrival?.gate && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Gate:</span>
                  <span className="text-sm font-medium">
                    {flightData.arrival.gate}
                  </span>
                </div>
              )}
              {flightData?.arrival?.terminal && (
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
