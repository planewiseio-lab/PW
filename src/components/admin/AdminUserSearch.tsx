"use client";

import { useState } from "react";

interface AdminUserSearchProps {
  onUserSelect?: (userId: string) => void;
}

export function AdminUserSearch({ onUserSelect }: AdminUserSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/users/search?q=${encodeURIComponent(searchTerm)}`
      );
      const data = await response.json();
      setSearchResults(data.users || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="space-y-6">
        <div>
          <label
            htmlFor="search"
            className="block text-base font-medium text-gray-700"
          >
            Search by email or user ID
          </label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base px-4 py-3"
            placeholder="user@example.com or user-id"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-5 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
      </form>

      {searchResults.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Search Results ({searchResults.length})
          </h3>
          <div className="space-y-3">
            {searchResults.map((user) => (
              <div key={user.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {user.email}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      <div>ID: {user.id}</div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Credits: {user.credits || 0}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.plan === "free"
                              ? "bg-gray-100 text-gray-800"
                              : user.plan === "pro"
                              ? "bg-green-100 text-green-800"
                              : user.plan === "basic"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          Plan: {user.plan || "unknown"}
                        </span>
                      </div>
                      {user.last_sign_in_at && (
                        <div className="text-xs text-gray-400 mt-1">
                          Last sign in:{" "}
                          {new Date(user.last_sign_in_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onUserSelect?.(user.id)}
                    className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    Manage Credits
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
