"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface ApiMarketUsageData {
  apiName: string;
  store: string;
  apiProduct: string;
  quota: number;
  apiCallsLeft: number;
  apiCallsMade: number;
  startDate: string;
  renewDate: string;
  endDate: string | null;
}

interface ApiMarketUsageResponse {
  usageData: ApiMarketUsageData[];
}

export default function ApiUsageDashboard() {
  const [usageData, setUsageData] = useState<ApiMarketUsageData[]>([]);
  const [loading, setLoading] = useState(false); // Loading pour les données
  const [authLoading, setAuthLoading] = useState(true); // Loading pour l'auth
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Vérifier l'authentification et le rôle admin
  useEffect(() => {
    let mounted = true;
    async function checkAuth() {
      try {
        const supabase = createClient();
        
        // Essayer d'abord avec getSession (plus rapide)
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError || !session?.user) {
          // Si pas de session, essayer getUser
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (!mounted) return;

          if (userError || !user) {
            setIsAuthenticated(false);
            setIsAdmin(false);
            setAuthLoading(false);
            return;
          }

          // User trouvé via getUser
          setIsAuthenticated(true);
          const adminCheck =
            user.user_metadata?.role === "admin" ||
            user.app_metadata?.role === "admin";
          setIsAdmin(adminCheck);
          setAuthLoading(false);
          return;
        }

        // Session trouvée
        if (session?.user) {
          setIsAuthenticated(true);
          const adminCheck =
            session.user.user_metadata?.role === "admin" ||
            session.user.app_metadata?.role === "admin";
          setIsAdmin(adminCheck);
          setAuthLoading(false);
          return;
        }
      } catch (e) {
        console.error("[Admin Usage] Auth check error:", e);
        if (!mounted) return;
        setIsAuthenticated(false);
        setIsAdmin(false);
        setAuthLoading(false);
      }
    }

    checkAuth();

    // Timeout de sécurité - plus long pour laisser le temps à l'auth
    const t = setTimeout(() => {
      if (mounted && (isAuthenticated === null || isAdmin === null)) {
        console.warn("[Admin Usage] Auth check timeout");
        // Ne pas forcer à false si on n'a pas encore de réponse
        // Juste arrêter le loading de l'auth
        setAuthLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, []);

  // Charger les données d'utilisation API.market
  useEffect(() => {
    if (!isAdmin) return;

    async function loadUsageData() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/api-market-usage", {
          credentials: "include",
        });

        if (response.status === 401) {
          setIsAuthenticated(false);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        if (response.status === 403) {
          setIsAuthenticated(true);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || "Failed to load usage data");
          setLoading(false);
          return;
        }

        const data: ApiMarketUsageResponse = await response.json();
        setUsageData(data.usageData || []);
      } catch (err) {
        console.error("[Admin Usage] Error loading data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    loadUsageData();
  }, [isAdmin]);

  // Conditions de rendu
  // Afficher le loading pendant la vérification de l'auth
  if (authLoading && (isAuthenticated === null || isAdmin === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Afficher le message de connexion si pas authentifié
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Please sign in</h1>
          <p className="text-gray-600 mt-2">
            You need to be signed in to access this page
          </p>
        </div>
      </div>
    );
  }

  // Afficher le message d'accès refusé si pas admin
  if (isAuthenticated === true && isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600 mt-2">Admin access required</p>
        </div>
      </div>
    );
  }

  // Si toujours null après le timeout, afficher un message d'erreur
  if ((isAuthenticated === null || isAdmin === null) && !authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Authentication Error
          </h1>
          <p className="text-gray-600 mt-2">
            Unable to verify your authentication status. Please refresh the page.
          </p>
        </div>
      </div>
    );
  }

  // Calculer les statistiques globales
  const totalQuota = usageData.reduce((sum, item) => sum + item.quota, 0);
  const totalCallsMade = usageData.reduce(
    (sum, item) => sum + item.apiCallsMade,
    0
  );
  const totalCallsLeft = usageData.reduce(
    (sum, item) => sum + item.apiCallsLeft,
    0
  );
  const totalUsage = totalQuota > 0 ? (totalCallsMade / totalQuota) * 100 : 0;

  // Calculer les requêtes restantes par tier
  const tier1RequestsLeft = Math.floor(totalCallsLeft / 1); // Tier 1 = 1 appel par requête
  const tier2RequestsLeft = Math.floor(totalCallsLeft / 2); // Tier 2 = 2 appels par requête
  const tier3RequestsLeft = Math.floor(totalCallsLeft / 6); // Tier 3 = 6 appels par requête

  // Calculer le temps restant jusqu'au renouvellement
  const getTimeUntilRenewal = () => {
    if (usageData.length === 0) return null;
    
    // Prendre la date de renouvellement la plus proche
    const renewDates = usageData
      .map(item => new Date(item.renewDate))
      .filter(date => !isNaN(date.getTime()));
    
    if (renewDates.length === 0) return null;
    
    const nextRenewal = new Date(Math.min(...renewDates.map(d => d.getTime())));
    const now = new Date();
    const diff = nextRenewal.getTime() - now.getTime();
    
    if (diff <= 0) return { text: "Renouvelé", days: 0, hours: 0, minutes: 0 };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    let text = "";
    if (days > 0) {
      text = `${days} jour${days > 1 ? 's' : ''} ${hours}h`;
    } else if (hours > 0) {
      text = `${hours}h ${minutes}min`;
    } else {
      text = `${minutes}min`;
    }
    
    return { text, days, hours, minutes };
  };

  const timeUntilRenewal = getTimeUntilRenewal();

  // Calculer la situation spécifique pour chaque tier
  const getTierSituation = (requestsLeft: number, costPerRequest: number) => {
    if (!timeUntilRenewal || timeUntilRenewal.days === 0) {
      return { status: "Renouvelé", color: "gray" };
    }
    
    // Calculer le nombre de jours restants
    const daysRemaining = timeUntilRenewal.days + (timeUntilRenewal.hours / 24);
    
    if (usageData.length === 0) return { status: "N/A", color: "gray" };
    
    // Calculer combien de requêtes de ce tier peuvent être faites par jour avec le reste
    const requestsPerDay = requestsLeft / daysRemaining;
    
    // Calculer le nombre total de requêtes possibles pour ce tier avec le quota total
    const totalTierRequestsPossible = Math.floor(totalQuota / costPerRequest);
    
    // Calculer le pourcentage de requêtes restantes pour ce tier
    // Si on a utilisé 157 appels sur 600, et qu'on a 443 restants
    // Pour Tier 1 : 443 requêtes restantes sur 600 possibles = 73.8%
    const percentageRemaining = (requestsLeft / totalTierRequestsPossible) * 100;
    
    // Calculer aussi le ratio requêtes/jour vs quota/jour pour ce tier
    const quotaPerDay = totalTierRequestsPossible / 30; // Sur 30 jours
    const ratio = requestsPerDay / quotaPerDay;
    
    // Situation basée sur plusieurs critères :
    // 1. Si on a plus de 80% de requêtes restantes pour ce tier = Confortable
    // 2. Si on a entre 50-80% = Normal
    // 3. Si on a moins de 50% = Attention
    // Aussi : si le ratio requêtes/jour est très élevé (> 1.5x le quota/jour) = Confortable
    
    if (percentageRemaining >= 80 || ratio >= 1.5) {
      return { status: "Confortable", color: "green" };
    } else if (percentageRemaining >= 50 || ratio >= 1.0) {
      return { status: "Normal", color: "orange" };
    } else if (percentageRemaining >= 20) {
      return { status: "Attention", color: "orange" };
    } else {
      return { status: "Critique", color: "red" };
    }
  };

  const tier1Situation = getTierSituation(tier1RequestsLeft, 1);
  const tier2Situation = getTierSituation(tier2RequestsLeft, 2);
  const tier3Situation = getTierSituation(tier3RequestsLeft, 6);

  // Calculer les statistiques supplémentaires
  const getAdditionalStats = () => {
    if (usageData.length === 0) return null;
    
    const startDate = new Date(usageData[0].startDate);
    const now = new Date();
    const daysElapsed = Math.max(1, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyUsageRate = totalCallsMade / daysElapsed;
    const projectedUsage = dailyUsageRate * 30; // Projection sur 30 jours
    const daysUntilRenewal = timeUntilRenewal?.days || 0;
    const hoursUntilRenewal = timeUntilRenewal?.hours || 0;
    const daysRemaining = daysUntilRenewal + (hoursUntilRenewal / 24);
    
    // Calculer le dépassement prévu
    let overage: { daysUntilOverage: number; quotaOverage: number } | null = null;
    if (projectedUsage > totalCallsLeft && dailyUsageRate > 0) {
      const daysUntilOverage = totalCallsLeft / dailyUsageRate;
      const quotaOverage = projectedUsage - totalCallsLeft;
      overage = {
        daysUntilOverage: Math.round(daysUntilOverage * 10) / 10,
        quotaOverage: Math.round(quotaOverage),
      };
    }
    
    return {
      dailyUsageRate: Math.round(dailyUsageRate * 10) / 10,
      projectedUsage: Math.round(projectedUsage),
      daysRemaining: Math.round(daysRemaining * 10) / 10,
      daysElapsed: Math.round(daysElapsed * 10) / 10,
      overage,
    };
  };

  const additionalStats = getAdditionalStats();

  // Formater la date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("fr-FR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <main className="min-h-screen bg-white py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-6">API.market Usage Dashboard</h1>
        <p className="text-gray-600 mb-6">
          Vue d'ensemble de vos quotas et utilisation API.market
        </p>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-blue-50 rounded-lg p-6 text-center">
            <h3 className="text-sm font-medium text-blue-600 mb-2">
              Quota Total
            </h3>
            <p className="text-3xl font-bold text-blue-900">
              {totalQuota.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">appels/mois</p>
          </div>
          <div className="bg-green-50 rounded-lg p-6 text-center">
            <h3 className="text-sm font-medium text-green-600 mb-2">
              Appels Restants
            </h3>
            <p className="text-3xl font-bold text-green-900">
              {totalCallsLeft.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">disponibles</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-6 text-center">
            <h3 className="text-sm font-medium text-orange-600 mb-2">
              Appels Utilisés
            </h3>
            <p className="text-3xl font-bold text-orange-900">
              {totalCallsMade.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {totalUsage.toFixed(1)}% du quota
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-6 text-center">
            <h3 className="text-sm font-medium text-purple-600 mb-2">
              Abonnements Actifs
            </h3>
            <p className="text-3xl font-bold text-purple-900">
              {usageData.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">produits</p>
          </div>
        </div>

        {/* Tableau des abonnements */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading usage data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 rounded-lg shadow p-8 text-center">
            <p className="text-red-600 font-semibold">Error</p>
            <p className="text-red-500 mt-2">{error}</p>
          </div>
        ) : usageData.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No usage data available</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full divide-y divide-gray-200" style={{ minWidth: '800px' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    API / Produit
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quota
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisés
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Restants
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisation
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Début
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Renouvellement
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usageData.map((item, index) => {
                  const usagePercent =
                    item.quota > 0 ? (item.apiCallsMade / item.quota) * 100 : 0;
                  const isLowQuota = item.apiCallsLeft < item.quota * 0.1; // < 10%

                  return (
                    <tr
                      key={`${item.apiName}-${index}`}
                      className={isLowQuota ? "bg-red-50" : ""}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {item.apiProduct || item.apiName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.store}/{item.apiProduct}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.quota.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {item.apiCallsMade.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`text-sm font-semibold ${
                            isLowQuota ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {item.apiCallsLeft.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-full max-w-[100px] bg-gray-200 rounded-full h-2.5 mr-2">
                            <div
                              className={`h-2.5 rounded-full ${
                                usagePercent > 90
                                  ? "bg-red-500"
                                  : usagePercent > 70
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">
                            {usagePercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {formatDate(item.startDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {formatDate(item.renewDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* Tableau récapitulatif par tier */}
        {usageData.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Récapitulatif par Tier</h2>
              <p className="text-sm text-gray-600 mt-1">
                Nombre de requêtes restantes selon le type d'endpoint
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tier
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coût par requête
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requêtes restantes
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Temps restant
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Situation
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          Tier 1
                        </span>
                        <span className="ml-3 text-sm text-gray-500">Endpoints simples</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      1 appel
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-lg font-bold text-green-600">
                        {tier1RequestsLeft.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">requêtes</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                      {timeUntilRenewal?.text || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        tier1Situation.color === "green" ? "bg-green-100 text-green-800" :
                        tier1Situation.color === "orange" ? "bg-orange-100 text-orange-800" :
                        tier1Situation.color === "red" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {tier1Situation.status}
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="px-2.5 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                          Tier 2
                        </span>
                        <span className="ml-3 text-sm text-gray-500">Endpoints moyens</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      2 appels
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-lg font-bold text-orange-600">
                        {tier2RequestsLeft.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">requêtes</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                      {timeUntilRenewal?.text || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        tier2Situation.color === "green" ? "bg-green-100 text-green-800" :
                        tier2Situation.color === "orange" ? "bg-orange-100 text-orange-800" :
                        tier2Situation.color === "red" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {tier2Situation.status}
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                          Tier 3
                        </span>
                        <span className="ml-3 text-sm text-gray-500">Endpoints complexes</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      6 appels
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-lg font-bold text-red-600">
                        {tier3RequestsLeft.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">requêtes</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                      {timeUntilRenewal?.text || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        tier3Situation.color === "green" ? "bg-green-100 text-green-800" :
                        tier3Situation.color === "orange" ? "bg-orange-100 text-orange-800" :
                        tier3Situation.color === "red" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {tier3Situation.status}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Statistiques supplémentaires */}
        {usageData.length > 0 && additionalStats && (
          <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Statistiques d'Utilisation</h2>
              <p className="text-sm text-gray-600 mt-1">
                Métriques détaillées sur la consommation et les projections
              </p>
            </div>
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <h3 className="text-sm font-medium text-blue-600 mb-1">
                    Taux d'utilisation quotidien
                  </h3>
                  <p className="text-2xl font-bold text-blue-900">
                    {additionalStats.dailyUsageRate.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">appels/jour</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <h3 className="text-sm font-medium text-purple-600 mb-1">
                    Projection sur 30 jours
                  </h3>
                  <p className="text-2xl font-bold text-purple-900">
                    {additionalStats.projectedUsage.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">appels estimés</p>
                </div>
                <div className="bg-teal-50 rounded-lg p-4 text-center">
                  <h3 className="text-sm font-medium text-teal-600 mb-1">
                    Jours écoulés
                  </h3>
                  <p className="text-2xl font-bold text-teal-900">
                    {additionalStats.daysElapsed.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">depuis le début du cycle</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <h3 className="text-sm font-medium text-indigo-600 mb-1">
                    Jours restants
                  </h3>
                  <p className="text-2xl font-bold text-indigo-900">
                    {additionalStats.daysRemaining.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">jusqu'au renouvellement</p>
                </div>
              </div>
              
              {/* Alerte de dépassement */}
              {additionalStats.overage && (
                <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-red-800">
                        Dépassement prévu
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>
                          La projection sur 30 jours ({additionalStats.projectedUsage.toLocaleString()} appels) dépasse les quotas restants ({totalCallsLeft.toLocaleString()} appels).
                        </p>
                        <p className="mt-1">
                          <strong>Dépassement prévu dans {additionalStats.overage.daysUntilOverage.toLocaleString()} jours</strong> avec un dépassement estimé de <strong>{additionalStats.overage.quotaOverage.toLocaleString()} quotas</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
