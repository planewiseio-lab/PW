"use client";

import { useState, useEffect } from "react";

interface UserWithCredits {
  userId: string;
  email: string | null;
  plan: string;
  status: string;
  credits: number;
  renewsAt: string;
  stripeCustomerId: string | null;
  stripeSubId: string | null;
  updatedAt: string;
}

export function AllUsersSection() {
  const [users, setUsers] = useState<UserWithCredits[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planFilter, setPlanFilter] = useState<string>("");
  const [minCredits, setMinCredits] = useState<string>("");
  const [maxCredits, setMaxCredits] = useState<string>("");
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Construire les paramètres de requête
      const params = new URLSearchParams();
      if (planFilter) {
        params.append("plan", planFilter);
      }
      if (minCredits) {
        params.append("minCredits", minCredits);
      }
      if (maxCredits) {
        params.append("maxCredits", maxCredits);
      }
      params.append("page", page.toString());

      const response = await fetch(
        `/api/admin/users/all?${params.toString()}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          setError("Access denied. Admin privileges required.");
        } else if (response.status === 401) {
          setError("Unauthorized. Please sign in.");
        } else {
          setError(`Failed to load users: ${response.statusText}`);
        }
        return;
      }

      const data = await response.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load users"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset to page 1 when filters change
    setPage(1);
  }, [planFilter, minCredits, maxCredits]);

  useEffect(() => {
    fetchUsers();
  }, [page, planFilter, minCredits, maxCredits]);

  const handlePlanFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPlanFilter(e.target.value);
  };

  const handleMinCreditsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMinCredits(e.target.value);
  };

  const handleMaxCreditsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxCredits(e.target.value);
  };

  const handleReset = () => {
    setPlanFilter("");
    setMinCredits("");
    setMaxCredits("");
    setPage(1);
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const getStatusBadgeColor = (status: string, plan: string) => {
    if (status === "CANCELED") {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
    if (status === "ACTIVE") {
      return "bg-green-100 text-green-800 border-green-200";
    }
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getPlanBadgeColor = (plan: string) => {
    if (plan === "PRO") {
      return "bg-blue-100 text-blue-800 border-blue-200";
    }
    if (plan === "BUSINESS") {
      return "bg-purple-100 text-purple-800 border-purple-200";
    }
    if (plan === "FREE") {
      return "bg-gray-100 text-gray-800 border-gray-200";
    }
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getPlanDisplayName = (plan: string) => {
    if (plan === "BUSINESS") {
      return "BASIC";
    }
    return plan;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fr-FR", {
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

  const copyUserId = async (userId: string) => {
    try {
      await navigator.clipboard.writeText(userId);
      console.log(`User ID ${userId} copied to clipboard`);
    } catch (err) {
      console.error("Failed to copy user ID:", err);
    }
  };

  // Vérifier si au moins un email existe
  const hasAnyEmail = users.some((user) => user.email);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          All Users
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Complete list of users with filters by plan and credits
        </p>
      </div>

      {/* Filtres */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label
            htmlFor="plan-filter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Plan
          </label>
          <select
            id="plan-filter"
            value={planFilter}
            onChange={handlePlanFilterChange}
            className="w-full px-3 py-2 h-[42px] border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Plans</option>
            <option value="FREE">Free</option>
            <option value="BASIC">Basic</option>
            <option value="PRO">Pro</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="min-credits"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Min Credits
          </label>
          <input
            type="number"
            id="min-credits"
            value={minCredits}
            onChange={handleMinCreditsChange}
            placeholder="0"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="max-credits"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Max Credits
          </label>
          <input
            type="number"
            id="max-credits"
            value={maxCredits}
            onChange={handleMaxCreditsChange}
            placeholder="∞"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {total > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {users.length} of {total} users
          </p>
          {totalPages > 1 && (
            <p className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </p>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading users...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No users found with the selected filters.</p>
        </div>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User ID
                </th>
                {hasAnyEmail && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credits
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Renews At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.userId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => copyUserId(user.userId)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-800 font-mono cursor-pointer transition-colors"
                      title="Click to copy full User ID"
                    >
                      {user.userId.substring(0, 8)}...
                    </button>
                  </td>
                  {hasAnyEmail && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {user.email || (
                          <span className="text-gray-400 italic">No email</span>
                        )}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPlanBadgeColor(
                        user.plan
                      )}`}
                    >
                      {getPlanDisplayName(user.plan)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                        user.status,
                        user.plan
                      )}`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`text-sm font-semibold ${
                        user.credits === 0
                          ? "text-red-600"
                          : user.credits < 10
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {user.credits}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {formatDate(user.renewsAt)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={page === 1}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                page === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  // Show first page, last page, current page, and pages around current
                  return (
                    p === 1 ||
                    p === totalPages ||
                    (p >= page - 1 && p <= page + 1)
                  );
                })
                .map((p, index, array) => {
                  // Add ellipsis if there's a gap
                  const showEllipsisBefore = index > 0 && p - array[index - 1] > 1;
                  return (
                    <div key={p} className="flex items-center gap-1">
                      {showEllipsisBefore && (
                        <span className="px-2 text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => handlePageChange(p)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          p === page
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    </div>
                  );
                })}
            </div>
            <button
              onClick={handleNextPage}
              disabled={page === totalPages}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                page === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

