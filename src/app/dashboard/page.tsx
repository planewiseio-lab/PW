"use client";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { validateUser } from "@/lib/auth-utils";
import Link from "next/link";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteAircraft, setFavoriteAircraft] = useState<any[]>([]);

  // Vérifier si Supabase est configuré
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isSupabaseConfigured =
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "https://your-project.supabase.co" &&
    supabaseAnonKey !== "your-anon-key-here";

  useEffect(() => {
    const getUser = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      try {
        const user = await validateUser();

        if (!user) {
          redirect("/");
          return;
        }

        setUser(user);
        setLoading(false);

        // Charger les favoris après avoir défini l'utilisateur
        setTimeout(() => loadFavoriteAircraft(), 100);
      } catch (err) {
        console.error("Error getting user:", err);
        redirect("/");
      }
    };

    getUser();
  }, [isSupabaseConfigured]);

  // Recharger les favoris quand l'utilisateur change
  useEffect(() => {
    if (user) {
      console.log("User changed, loading favorites for:", user.id);
      loadFavoriteAircraft();
    }
  }, [user]);

  const loadFavoriteAircraft = async () => {
    console.log("loadFavoriteAircraft called, user:", user);

    if (!user) {
      console.log("No user found, skipping favorites load");
      return;
    }

    console.log("Loading favorites for user:", user.id);

    // Réinitialiser la liste avant de charger
    setFavoriteAircraft([]);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("user_favorites")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      console.log("Favorites query result:", { data, error });

      if (error) {
        console.error("Error loading favorites:", error);
        return;
      }

      // Transformer les données Supabase en format attendu
      const formattedFavorites =
        data?.map((item) => ({
          id: item.id,
          registration: item.aircraft_registration,
          type: item.aircraft_type || "Unknown",
          airline: item.aircraft_airline || "Unknown",
          manufacturer: item.aircraft_manufacturer || "Unknown",
          model: item.aircraft_model || "Unknown",
          seats: item.aircraft_seats,
          age: item.aircraft_age,
          engines: item.aircraft_engines,
          hex: item.aircraft_hex,
          addedDate: new Date(item.created_at).toISOString().split("T")[0],
        })) || [];

      // Limiter à 30 avions maximum
      const limitedFavorites = formattedFavorites.slice(0, 30);

      console.log("Formatted favorites:", limitedFavorites);
      setFavoriteAircraft(limitedFavorites);
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
  };

  const removeFavoriteAircraft = async (
    id: string,
    aircraftRegistration: string
  ) => {
    if (!user) return;

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to remove aircraft ${aircraftRegistration} from your favorites?`
    );

    if (!confirmed) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error removing favorite:", error);
        return;
      }

      // Recharger la liste des favoris
      await loadFavoriteAircraft();
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              Authentication Not Configured
            </h2>
            <p className="text-yellow-700 mb-4">
              Supabase authentication is not configured. Please set up your
              environment variables.
            </p>
            <div className="text-sm text-yellow-600">
              <p>Required environment variables:</p>
              <ul className="list-disc list-inside mt-2">
                <li>NEXT_PUBLIC_SUPABASE_URL</li>
                <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              My Aircraft Favorites
            </h1>
            <p className="text-gray-600">Quick access to your saved aircraft</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500 hidden sm:block">
              {favoriteAircraft.length} aircraft saved
            </div>
            <button
              onClick={() => {
                console.log("Manual refresh clicked");
                loadFavoriteAircraft();
              }}
              className="flex items-center justify-center w-8 h-8 bg-[#178cf2] text-white rounded-md hover:brightness-110 transition-colors"
              title="Refresh"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Aircraft List - Table Style */}
      {favoriteAircraft.length > 30 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-yellow-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">Limit reached:</span> You have{" "}
              {favoriteAircraft.length} aircraft saved. Maximum allowed is 30.
              Please remove some aircraft to add new ones.
            </p>
          </div>
        </div>
      )}

      {favoriteAircraft.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Registration
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Manufacturer
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Airline
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Seats
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Age
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Added
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {favoriteAircraft.map((aircraft) => (
                  <tr key={aircraft.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/aircraft/${aircraft.registration}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {aircraft.registration}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {aircraft.type}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {aircraft.manufacturer}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {aircraft.airline}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {aircraft.seats ? `${aircraft.seats}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {aircraft.age ? `${aircraft.age}y` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {aircraft.addedDate}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/aircraft/${aircraft.registration}`}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="View aircraft details"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </Link>
                        <button
                          onClick={() =>
                            removeFavoriteAircraft(
                              aircraft.id,
                              aircraft.registration
                            )
                          }
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Remove from favorites"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Aircraft Saved
          </h3>
          <p className="text-gray-600 mb-4">
            Add your first aircraft to get started. Search for an aircraft and
            click the heart icon to save it to your favorites.
          </p>
        </div>
      )}
    </main>
  );
}
