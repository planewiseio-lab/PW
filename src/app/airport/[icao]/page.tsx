"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useProgressiveAirportData } from "@/hooks/useProgressiveAirportData";
import EnhancedFlightSkeleton from "@/components/EnhancedFlightSkeleton";
import PullToRefresh from "@/components/PullToRefresh";

type Direction = "departures" | "arrivals";

type FlightRow = {
  id: string;
  time: string | { local?: string; utc?: string; scheduled?: string };
  number: string;
  airline: string;
  from?: string;
  to?: string;
  reg?: string;
  status?: string;
  gate?: string;
};

export default function AirportBoardPage() {
  const { icao } = useParams<{ icao: string }>();
  const searchParams = useSearchParams();
  const code = (icao || "").toUpperCase();
  const [dir, setDir] = useState<Direction>("departures");
  const [q, setQ] = useState("");

  // Récupérer la date de recherche depuis l'URL ou utiliser aujourd'hui
  const searchDate =
    searchParams.get("date") || new Date().toISOString().split("T")[0];
  // Supprimer l'ancienne logique de pagination - maintenant gérée par le hook
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [airlineFilter, setAirlineFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("");

  // Utiliser le hook optimisé
  const {
    flights: allRows,
    loading,
    loadingMore,
    error,
    loaded,
    pagination,
    refetch,
    loadMore,
  } = useProgressiveAirportData(code, dir);

  const filtered = useMemo(() => {
    let result = allRows;

    // Filtre de recherche principal
    const v = q.trim().toLowerCase();
    if (v) {
      result = result.filter(
        (r: FlightRow) =>
          r.number.toLowerCase().includes(v) ||
          (r.airline || "").toLowerCase().includes(v) ||
          (r.to || r.from || "").toLowerCase().includes(v) ||
          (r.reg || "").toLowerCase().includes(v)
      );
    }

    // Filtre par compagnie
    if (airlineFilter) {
      result = result.filter((r: FlightRow) =>
        (r.airline || "").toLowerCase().includes(airlineFilter.toLowerCase())
      );
    }

    // Filtre par statut
    if (statusFilter) {
      result = result.filter((r: FlightRow) =>
        (r.status || "").toLowerCase().includes(statusFilter.toLowerCase())
      );
    }

    // Filtre par heure
    if (timeFilter) {
      const now = new Date();
      const filterTime = new Date();

      switch (timeFilter) {
        case "next2h":
          filterTime.setHours(now.getHours() + 2);
          break;
        case "next4h":
          filterTime.setHours(now.getHours() + 4);
          break;
        case "next8h":
          filterTime.setHours(now.getHours() + 8);
          break;
        default:
          return result;
      }

      result = result.filter((r: FlightRow) => {
        let timeStr = "";
        if (typeof r.time === "string") {
          timeStr = r.time;
        } else if (typeof r.time === "object" && r.time !== null) {
          timeStr = r.time.local || r.time.utc || r.time.scheduled || "";
        }
        if (!timeStr) return false;

        const flightTime = new Date(timeStr);
        return flightTime <= filterTime && flightTime >= now;
      });
    }

    return result;
  }, [q, allRows, airlineFilter, statusFilter, timeFilter]);

  // Utiliser directement les vols filtrés (la pagination est gérée par le hook)
  const displayedRows = filtered;

  // Calculer les statistiques
  const stats = useMemo(() => {
    const total = allRows.length;
    const onTime = allRows.filter(
      (r: FlightRow) =>
        (r.status || "").toLowerCase().includes("expected") ||
        (r.status || "").toLowerCase().includes("on time")
    ).length;
    const delayed = allRows.filter(
      (r: FlightRow) =>
        (r.status || "").toLowerCase().includes("delayed") ||
        (r.status || "").toLowerCase().includes("late")
    ).length;
    const cancelled = allRows.filter((r: FlightRow) =>
      (r.status || "").toLowerCase().includes("cancelled")
    ).length;

    return {
      total,
      onTime: total > 0 ? Math.round((onTime / total) * 100) : 0,
      delayed: total > 0 ? Math.round((delayed / total) * 100) : 0,
      cancelled: total > 0 ? Math.round((cancelled / total) * 100) : 0,
    };
  }, [allRows]);

  // Mettre à jour lastUpdate quand les données changent
  useEffect(() => {
    if (allRows.length > 0 && !loading) {
      setLastUpdate(new Date());
    }
  }, [allRows.length, loading]);

  // Fix hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // La fonction loadMore est maintenant fournie par le hook
  // La pagination est gérée automatiquement par le hook

  function getStatusClasses(status: string) {
    const normalizedStatus = (status || "").toLowerCase();

    if (normalizedStatus === "unknown") {
      return "bg-yellow-50 border-yellow-200 text-yellow-700";
    }

    // Badge rouge pour les retards
    if (
      normalizedStatus.includes("delayed") ||
      normalizedStatus.includes("late") ||
      normalizedStatus.includes("retard")
    ) {
      return "bg-red-50 border-red-200 text-red-700";
    }

    // Par défaut, utiliser les classes vertes
    return "bg-emerald-50 border-emerald-200 text-emerald-700";
  }

  function formatTime(
    time: string | { local?: string; utc?: string; scheduled?: string }
  ) {
    if (!time) return "—";

    try {
      let timeStr = "";
      if (typeof time === "string") {
        timeStr = time;
      } else if (typeof time === "object" && time !== null) {
        timeStr = time.local || time.utc || time.scheduled || "";
      }

      if (!timeStr) return "—";

      const date = new Date(timeStr);
      if (isNaN(+date)) return timeStr;

      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    } catch {
      return typeof time === "string" ? time : "—";
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Mobile: Flight Board Container */}
      <div className="block sm:hidden">
        <PullToRefresh onRefresh={refetch}>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            {/* Mobile Flight Board Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <svg
                    className="h-5 w-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
                    />
                  </svg>
                  <h1 className="text-xl font-bold text-gray-900">
                    Flight Board
                  </h1>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-gray-500">for</span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {code}
                  </span>
                </div>
                {/* Métriques en temps réel */}
                <div className="text-xs text-gray-500 mt-2">
                  {displayedRows.length} of{" "}
                  {pagination?.total || filtered.length} flights • Last updated{" "}
                  {isClient && lastUpdate
                    ? lastUpdate.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Loading..."}
                </div>

                <div className="inline-flex rounded-2xl border border-gray-200 bg-gray-50 p-1 mt-4">
                  {(["departures", "arrivals"] as Direction[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDir(d)}
                      className={[
                        "px-4 py-2 text-sm font-medium rounded-xl transition",
                        dir === d
                          ? "bg-white shadow border border-gray-200 text-gray-900"
                          : "text-gray-600 hover:text-gray-900",
                      ].join(" ")}
                      aria-pressed={dir === d}
                      type="button"
                    >
                      {d === "departures" ? "Departures" : "Arrivals"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search flights..."
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="btn-primary-sm"
                    type="button"
                  >
                    Filters
                  </button>
                </div>

                {/* Filtres avancés */}
                {showFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Airline
                      </label>
                      <input
                        value={airlineFilter}
                        onChange={(e) => setAirlineFilter(e.target.value)}
                        placeholder="e.g. Air Canada"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <option value="">All statuses</option>
                        <option value="expected">Expected</option>
                        <option value="delayed">Delayed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Time range
                      </label>
                      <select
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <option value="">All times</option>
                        <option value="next2h">Next 2 hours</option>
                        <option value="next4h">Next 4 hours</option>
                        <option value="next8h">Next 8 hours</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Results Section */}
            {/* Search Results Header */}
            {q && (
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <span className="text-sm text-gray-600">
                      Showing {displayedRows.length} of {filtered.length}{" "}
                      results for "{q}"
                      {(airlineFilter || statusFilter || timeFilter) && (
                        <span className="ml-2 text-blue-600">
                          • Filtered by:{" "}
                          {[
                            airlineFilter && "Airline",
                            statusFilter && "Status",
                            timeFilter && "Time",
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setQ("")}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                      type="button"
                    >
                      Clear search
                    </button>
                    {(airlineFilter || statusFilter || timeFilter) && (
                      <button
                        onClick={() => {
                          setAirlineFilter("");
                          setStatusFilter("");
                          setTimeFilter("");
                        }}
                        className="text-xs text-blue-500 hover:text-blue-700 underline"
                        type="button"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Flight Cards */}
            {loading && <EnhancedFlightSkeleton />}
            {!loading && displayedRows.length === 0 && (
              <div className="p-8 text-center">
                {q ? (
                  <div className="space-y-3">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        No flights found
                      </h3>
                      <p className="text-gray-500 text-sm">
                        No results match your search "{q}"
                      </p>
                      <button
                        onClick={() => setQ("")}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
                        type="button"
                      >
                        Clear search
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        No flights scheduled
                      </h3>
                      <p className="text-gray-500 text-sm">
                        No {dir} found for this time period
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {!loading &&
              displayedRows.map((r: FlightRow) => (
                <div
                  key={r.id}
                  className="border-b border-gray-100 p-4 last:border-b-0"
                >
                  <div className="grid grid-cols-2 gap-y-2 items-start">
                    <div className="text-[11px] uppercase tracking-wide text-gray-400">
                      Time
                    </div>
                    <div className="text-sm font-medium text-gray-900 text-left">
                      {formatTime(r.time)}
                    </div>

                    <div className="text-[11px] uppercase tracking-wide text-gray-400">
                      Flight
                    </div>
                    <button
                      onClick={() =>
                        (window.location.href = `/flight/${r.number}?date=${searchDate}`)
                      }
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition cursor-pointer text-left"
                    >
                      {r.number}
                    </button>

                    <div className="text-[11px] uppercase tracking-wide text-gray-400">
                      Airline
                    </div>
                    <div className="text-sm text-gray-700 text-left">
                      {r.airline}
                    </div>

                    <div className="text-[11px] uppercase tracking-wide text-gray-400">
                      {dir === "departures" ? "To" : "From"}
                    </div>
                    <div className="text-sm font-medium text-gray-900 text-left">
                      {dir === "departures" ? (
                        r.to ? (
                          <a
                            href={`/airport/${r.to}`}
                            className="text-gray-900 hover:text-gray-700 hover:underline transition-colors"
                          >
                            {r.to}
                          </a>
                        ) : (
                          "—"
                        )
                      ) : r.from ? (
                        <a
                          href={`/airport/${r.from}`}
                          className="text-gray-900 hover:text-gray-700 hover:underline transition-colors"
                        >
                          {r.from}
                        </a>
                      ) : (
                        "—"
                      )}
                    </div>

                    <div className="text-[11px] uppercase tracking-wide text-gray-400">
                      Reg.
                    </div>
                    <div className="text-left">
                      {r.reg ? (
                        <button
                          onClick={() =>
                            (window.location.href = `/aircraft/${r.reg}`)
                          }
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition cursor-pointer"
                        >
                          {r.reg}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>

                    <div className="text-[11px] uppercase tracking-wide text-gray-400">
                      Status
                    </div>
                    <div className="text-left">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                          r.status || ""
                        )}`}
                      >
                        {r.status || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

            {/* Loading indicator for additional flights */}
            {loadingMore && (
              <div className="p-4 text-center">
                <div className="inline-flex items-center gap-2 text-gray-600">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span className="text-sm">Loading more flights...</span>
                </div>
              </div>
            )}

            {/* Mobile Load More Button */}
            {pagination?.hasMore && (
              <div className="mt-6 mb-6 text-center px-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="btn-primary-md w-full disabled:opacity-60 disabled:cursor-not-allowed"
                  type="button"
                >
                  {loadingMore
                    ? "Loading..."
                    : `Load More (${
                        pagination.total - displayedRows.length
                      } remaining)`}
                </button>
              </div>
            )}
          </div>
        </PullToRefresh>
      </div>

      {/* Desktop Flight Board Section */}
      <div className="hidden sm:block">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Flight Board Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-5 w-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
                      />
                    </svg>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Flight Board
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">for</span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {code}
                    </span>
                  </div>
                  {/* Métriques en temps réel - Desktop */}
                  <div className="text-xs text-gray-500 mt-2">
                    {displayedRows.length} of{" "}
                    {pagination?.total || filtered.length} flights • Last
                    updated{" "}
                    {isClient && lastUpdate
                      ? lastUpdate.toLocaleTimeString()
                      : "Loading..."}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                  {(["departures", "arrivals"] as Direction[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDir(d)}
                      className={[
                        "px-4 py-2 text-sm font-medium rounded-lg transition",
                        dir === d
                          ? "bg-white shadow border border-gray-200 text-gray-900"
                          : "text-gray-600 hover:text-gray-900",
                      ].join(" ")}
                      aria-pressed={dir === d}
                      type="button"
                    >
                      {d === "departures" ? "Departures" : "Arrivals"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search flights, airlines, destinations..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg
                      className="h-4 w-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="btn-primary-sm"
                  type="button"
                >
                  Filters
                </button>
              </div>

              {/* Filtres avancés - Desktop */}
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Airline
                    </label>
                    <input
                      value={airlineFilter}
                      onChange={(e) => setAirlineFilter(e.target.value)}
                      placeholder="e.g. Air Canada"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="">All statuses</option>
                      <option value="expected">Expected</option>
                      <option value="delayed">Delayed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Time range
                    </label>
                    <select
                      value={timeFilter}
                      onChange={(e) => setTimeFilter(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="">All times</option>
                      <option value="next2h">Next 2 hours</option>
                      <option value="next4h">Next 4 hours</option>
                      <option value="next8h">Next 8 hours</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Section - Now inside the same container */}
          {/* Search Results Header */}
          {q && (
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span className="text-sm text-gray-600">
                    Showing {displayedRows.length} of {filtered.length} results
                    for "{q}"
                    {(airlineFilter || statusFilter || timeFilter) && (
                      <span className="ml-2 text-blue-600">
                        • Filtered by:{" "}
                        {[
                          airlineFilter && "Airline",
                          statusFilter && "Status",
                          timeFilter && "Time",
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setQ("")}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                    type="button"
                  >
                    Clear search
                  </button>
                  {(airlineFilter || statusFilter || timeFilter) && (
                    <button
                      onClick={() => {
                        setAirlineFilter("");
                        setStatusFilter("");
                        setTimeFilter("");
                      }}
                      className="text-xs text-blue-500 hover:text-blue-700 underline"
                      type="button"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Desktop: Table layout */}
          <div className="hidden sm:block">
            {loading ? (
              <div className="p-8">
                <EnhancedFlightSkeleton />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-center font-semibold w-20">
                      Time
                    </th>
                    <th className="px-4 py-3 text-center font-semibold w-24">
                      Flight
                    </th>
                    <th className="px-4 py-3 text-center font-semibold w-28">
                      Airline
                    </th>
                    <th className="px-4 py-3 text-center font-semibold w-20">
                      {dir === "departures" ? "To" : "From"}
                    </th>
                    <th className="px-4 py-3 text-center font-semibold w-20">
                      Reg.
                    </th>
                    <th className="px-4 py-3 text-center font-semibold w-24">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!loading && displayedRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-gray-500"
                      >
                        <div className="flex flex-col items-center gap-3">
                          {q ? (
                            <>
                              <svg
                                className="h-12 w-12 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                              </svg>
                              <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-1">
                                  No flights found
                                </h3>
                                <p className="text-gray-500 text-sm mb-3">
                                  No results match your search "{q}"
                                </p>
                                <button
                                  onClick={() => setQ("")}
                                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                                  type="button"
                                >
                                  Clear search
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <svg
                                className="h-12 w-12 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                />
                              </svg>
                              <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-1">
                                  No flights scheduled
                                </h3>
                                <p className="text-gray-500 text-sm">
                                  No {dir} found for this time period
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    displayedRows.map((r: FlightRow) => (
                      <tr
                        key={r.id}
                        className="hover:bg-gray-50/60 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-sm text-gray-900 text-center">
                          {formatTime(r.time)}
                        </td>
                        <td className="px-4 py-3 font-medium text-center">
                          <button
                            onClick={() =>
                              (window.location.href = `/flight/${r.number}?date=${searchDate}`)
                            }
                            className="text-blue-600 hover:text-blue-700 hover:underline transition cursor-pointer"
                          >
                            {r.number}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-gray-700 text-center">
                          {r.airline}
                        </td>
                        <td className="px-4 py-3 text-gray-900 text-center">
                          {dir === "departures" ? (
                            r.to ? (
                              <a
                                href={`/airport/${r.to}`}
                                className="text-gray-900 hover:text-gray-700 hover:underline transition-colors"
                              >
                                {r.to}
                              </a>
                            ) : (
                              "—"
                            )
                          ) : r.from ? (
                            <a
                              href={`/airport/${r.from}`}
                              className="text-gray-900 hover:text-gray-700 hover:underline transition-colors"
                            >
                              {r.from}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-center">
                          {r.reg ? (
                            <button
                              onClick={() =>
                                (window.location.href = `/aircraft/${r.reg}`)
                              }
                              className="text-blue-600 hover:text-blue-700 hover:underline transition cursor-pointer"
                            >
                              {r.reg}
                            </button>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              r.status || ""
                            )}`}
                          >
                            {r.status || "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {/* Loading indicator for additional flights - Desktop */}
            {loadingMore && (
              <div className="p-4 text-center">
                <div className="inline-flex items-center gap-2 text-gray-600">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span className="text-sm">Loading more flights...</span>
                </div>
              </div>
            )}
          </div>

          {/* Load More Button - Consistent with other blue buttons */}
          {pagination?.hasMore && (
            <div className="mt-6 mb-6 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="btn-primary-md disabled:opacity-60 disabled:cursor-not-allowed"
                type="button"
              >
                {loadingMore
                  ? "Loading..."
                  : `Load More (${
                      pagination.total - displayedRows.length
                    } remaining)`}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
