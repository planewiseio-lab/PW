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
      </div>
    </main>
  );
}
