"use client";

import { useState, useEffect } from "react";

interface ApiUsageStats {
  total_requests: number;
  tier: string;
  unique_users: number;
  avg_response_time: number;
}

export default function ApiUsageDashboard() {
  const [stats, setStats] = useState<ApiUsageStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Utiliser une date de test pour octobre 2025
  const [selectedMonth, setSelectedMonth] = useState("2025-10");
  const [filterUser, setFilterUser] = useState("");

  useEffect(() => {
    loadStats();
  }, [selectedMonth, filterUser]);

  async function loadStats() {
    setLoading(true);
    try {
      // Utiliser l'endpoint API avec client admin
      const response = await fetch("/api/admin/usage-stats");
      const result = await response.json();

      if (result.error) {
        console.error("[Admin Usage] API error:", result.error);
        return;
      }

      console.log("[Admin Usage] Raw data from API:", result.count, "records");

      let data = result.data || [];

      // Filtrer par mois côté client
      const monthStart = new Date(`${selectedMonth}-01T00:00:00Z`);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      data = data.filter((req: any) => {
        const reqDate = new Date(req.created_at);
        return reqDate >= monthStart && reqDate < monthEnd;
      });

      // Filtrer par utilisateur si spécifié
      if (filterUser) {
        data = data.filter((req: any) => req.user_id === filterUser);
      }

      console.log("[Admin Usage] Filtered data:", data?.length || 0, "records");

      // Calculer les stats par tier
      const statsByTier = data?.reduce((acc: any, req: any) => {
        const tier = req.tier || "unknown";
        if (!acc[tier]) {
          acc[tier] = {
            tier,
            total_requests: 0,
            unique_users: new Set(),
            total_response_time: 0,
          };
        }
        acc[tier].total_requests++;
        acc[tier].unique_users.add(req.user_id);
        acc[tier].total_response_time += req.response_time_ms || 0;
        return acc;
      }, {});

      const formattedStats = Object.values(statsByTier || {}).map(
        (stat: any) => ({
          tier: stat.tier,
          total_requests: stat.total_requests,
          unique_users: stat.unique_users.size,
          avg_response_time: Math.round(
            stat.total_response_time / stat.total_requests
          ),
        })
      );

      setStats(formattedStats);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  }

  const totalRequests = stats.reduce((sum, s) => sum + s.total_requests, 0);

  const totalUsers = new Set(
    stats.flatMap((s) => Array(s.unique_users)).map(() => s.unique_users)
  ).size;

  return (
    <main className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">API Usage Dashboard</h1>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">User ID</label>
              <input
                type="text"
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                placeholder="Leave empty for all users"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-sm font-medium text-blue-600 mb-2">
              Total Requests
            </h3>
            <p className="text-3xl font-bold text-blue-900">
              {totalRequests.toLocaleString()}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-6">
            <h3 className="text-sm font-medium text-green-600 mb-2">
              Unique Users
            </h3>
            <p className="text-3xl font-bold text-green-900">{totalUsers}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-6">
            <h3 className="text-sm font-medium text-purple-600 mb-2">
              Avg Response Time
            </h3>
            <p className="text-3xl font-bold text-purple-900">
              {stats.length > 0
                ? Math.round(
                    stats.reduce(
                      (sum, s) =>
                        sum +
                        (s.avg_response_time * s.total_requests) /
                          totalRequests,
                      0
                    )
                  )
                : 0}
              ms
            </p>
          </div>
        </div>

        {/* Statistiques par tier */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading statistics...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unique Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Response Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.map((stat) => (
                  <tr key={stat.tier}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {stat.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.total_requests.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.unique_users}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.avg_response_time}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
