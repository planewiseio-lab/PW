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

export function ProCancelledUsersSection() {
  const [users, setUsers] = useState<UserWithCredits[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/admin/users/pro-cancelled", {
          credentials: "include",
          cache: "no-store",
        });

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
      } catch (err) {
        console.error("Error fetching PRO/CANCELED users:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load users"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const getStatusBadgeColor = (status: string, plan: string) => {
    if (status === "CANCELED") {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
    if (plan === "PRO" || plan === "BUSINESS") {
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
    return "bg-gray-100 text-gray-800 border-gray-200";
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
      // Optionnel: afficher un message de confirmation
      console.log(`User ID ${userId} copied to clipboard`);
    } catch (err) {
      console.error("Failed to copy user ID:", err);
    }
  };

  // Vérifier si au moins un email existe
  const hasAnyEmail = users.some((user) => user.email);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          PRO & CANCELED Users
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Users with PRO/BUSINESS plans or CANCELED subscriptions
        </p>
      </div>

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
          <p className="text-gray-600">No PRO or CANCELED users found.</p>
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
                      {user.plan}
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
    </div>
  );
}

