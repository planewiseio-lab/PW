"use client";

import { useState } from "react";
import { motion } from "@/components/LazyMotion";

export interface FleetAircraft {
  id: string;
  registration: string;
  type?: string;
  manufacturer?: string;
  model?: string;
  airline?: string;
  seats?: number;
  age?: number;
  engines?: string;
  hex?: string;
  status?: AircraftStatus;
  lastUpdated?: string;
  imageUrl?: string;
  imageLoading?: boolean;
}

export interface AircraftStatus {
  registration: string;
  date: string;
  status: "active" | "grounded" | "unknown" | "maintenance" | "in_flight" | "on_ground";
  message: string;
  location: string;
  updatedAt?: string;
  flightInfo?: any;
}

interface FleetTableProps {
  fleetAircraft: FleetAircraft[];
  selectedAircraft: Set<string>;
  toggleAircraftSelection: (registration: string) => void;
  removeFavoriteAircraft: (registration: string) => void;
}

export default function FleetTable({
  fleetAircraft,
  selectedAircraft,
  toggleAircraftSelection,
  removeFavoriteAircraft,
}: FleetTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  if (fleetAircraft.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <svg
          className="w-16 h-16 text-gray-400 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        <p className="text-gray-600 text-lg font-medium mb-2">
          No aircraft in your fleet
        </p>
        <p className="text-gray-500 text-sm">
          Add aircraft to your fleet to track their status
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={
                    fleetAircraft.length > 0 &&
                    fleetAircraft.every((a) =>
                      selectedAircraft.has(a.registration)
                    )
                  }
                  onChange={() => {
                    if (
                      fleetAircraft.every((a) =>
                        selectedAircraft.has(a.registration)
                      )
                    ) {
                      fleetAircraft.forEach((a) =>
                        toggleAircraftSelection(a.registration)
                      );
                    } else {
                      fleetAircraft.forEach((a) =>
                        toggleAircraftSelection(a.registration)
                      );
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {fleetAircraft.map((aircraft) => (
              <motion.tr
                key={aircraft.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedAircraft.has(aircraft.registration)}
                    onChange={() => toggleAircraftSelection(aircraft.registration)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {aircraft.registration}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {aircraft.type || aircraft.model || "N/A"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      aircraft.status?.status === "active" || aircraft.status?.status === "in_flight"
                        ? "bg-green-100 text-green-800"
                        : aircraft.status?.status === "grounded" || aircraft.status?.status === "on_ground"
                        ? "bg-red-100 text-red-800"
                        : aircraft.status?.status === "maintenance"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {aircraft.status?.status || "unknown"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {aircraft.status?.updatedAt
                    ? new Date(aircraft.status.updatedAt).toLocaleDateString()
                    : aircraft.lastUpdated
                    ? new Date(aircraft.lastUpdated).toLocaleDateString()
                    : "Never"}
                </td>
                <td className="px-4 py-3 text-sm">
                  <button
                    onClick={() => removeFavoriteAircraft(aircraft.registration)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Remove
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

