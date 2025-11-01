"use client";

import { useEffect, useState } from "react";

interface CreditBalanceCardProps {
  balance: number;
  isFreeUser?: boolean;
  quotas?: {
    general: {
      used: number;
      remaining: number;
      limit: number;
      ttl: number;
    };
    aircraftLookup: {
      used: number;
      remaining: number;
      limit: number;
      ttl: number;
    };
  };
}

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "0s";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export function CreditBalanceCard({ balance, isFreeUser, quotas }: CreditBalanceCardProps) {
  const [generalTimeRemaining, setGeneralTimeRemaining] = useState(quotas?.general.ttl || 0);
  const [aircraftTimeRemaining, setAircraftTimeRemaining] = useState(quotas?.aircraftLookup.ttl || 0);

  // Mettre à jour les countdowns pour les quotas Free
  useEffect(() => {
    if (!isFreeUser || !quotas) return;

    // Réinitialiser avec les TTL depuis les quotas quand ils changent
    if (quotas.general.ttl > 0) {
      setGeneralTimeRemaining(quotas.general.ttl);
    }
    if (quotas.aircraftLookup.ttl > 0) {
      setAircraftTimeRemaining(quotas.aircraftLookup.ttl);
    }

    // Countdown pour requêtes générales
    const generalInterval = setInterval(() => {
      setGeneralTimeRemaining((prev) => {
        const current = prev > 0 ? prev : (quotas.general.ttl > 0 ? quotas.general.ttl : 0);
        if (current <= 0) return 0;
        return current - 1;
      });
    }, 1000);

    // Countdown pour lookups d'avions
    const aircraftInterval = setInterval(() => {
      setAircraftTimeRemaining((prev) => {
        const current = prev > 0 ? prev : (quotas.aircraftLookup.ttl > 0 ? quotas.aircraftLookup.ttl : 0);
        if (current <= 0) return 0;
        return current - 1;
      });
    }, 1000);

    return () => {
      clearInterval(generalInterval);
      clearInterval(aircraftInterval);
    };
  }, [isFreeUser, quotas?.general.ttl, quotas?.aircraftLookup.ttl]);

  // Si utilisateur Free avec quotas, afficher les quotas
  if (isFreeUser && quotas) {
    // Utiliser le TTL le plus long pour le countdown principal
    const mainTtl = Math.max(quotas.general.ttl, quotas.aircraftLookup.ttl);
    const mainTimeRemaining = Math.max(generalTimeRemaining, aircraftTimeRemaining);

    return (
      <div className="bg-white rounded-lg shadow p-6 h-full w-full flex flex-col">
        <div className="text-center mb-4">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            Daily Quotas
          </div>
          <div className="text-sm text-gray-500 mb-4">
            Free plan limits
          </div>
        </div>

        {/* Détails des quotas */}
        <div className="space-y-3 mt-auto">
          <div className="border-t border-gray-200 pt-3">
            <div className="text-xs text-gray-500 mb-1">General Requests</div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  {quotas.general.used} / {quotas.general.limit}
                </span>
                <span className="text-xs text-gray-400 ml-2">(used / limit)</span>
              </div>
              <span className="text-xs text-gray-500">
                {quotas.general.ttl > 0 || generalTimeRemaining > 0
                  ? formatTimeRemaining(generalTimeRemaining > 0 ? generalTimeRemaining : quotas.general.ttl)
                  : "Reset"}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3">
            <div className="text-xs text-gray-500 mb-1">Aircraft Lookups</div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  {quotas.aircraftLookup.used} / {quotas.aircraftLookup.limit}
                </span>
                <span className="text-xs text-gray-400 ml-2">(used / limit)</span>
              </div>
              <span className="text-xs text-gray-500">
                {quotas.aircraftLookup.ttl > 0 || aircraftTimeRemaining > 0
                  ? formatTimeRemaining(aircraftTimeRemaining > 0 ? aircraftTimeRemaining : quotas.aircraftLookup.ttl)
                  : "Reset"}
              </span>
            </div>
          </div>

          {/* Countdown principal */}
          {(mainTtl > 0 || mainTimeRemaining > 0) && (
            <div className="border-t border-gray-200 pt-3">
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-600">
                <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Quota resets in: {formatTimeRemaining(mainTimeRemaining > 0 ? mainTimeRemaining : mainTtl)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Pour les utilisateurs payants, afficher le balance normal
  return (
    <div className="bg-white rounded-lg shadow p-6 h-full w-full flex flex-col justify-center">
      <div className="text-center">
        <div className="text-4xl font-bold text-blue-600 mb-2">
          {balance.toLocaleString()}
        </div>
        <div className="text-lg text-gray-600 mb-4">Current Credits</div>
        <div className="text-sm text-gray-500">Each action costs 1 credit</div>
      </div>
    </div>
  );
}
