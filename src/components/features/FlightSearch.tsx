"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "@/components/LazyMotion";

interface FlightSearchProps {
  initialFlight?: string;
  initialDate?: string;
}

export default function FlightSearch({
  initialFlight = "",
  initialDate,
}: FlightSearchProps) {
  const router = useRouter();
  const [flightNumber, setFlightNumber] = useState(initialFlight);
  const [searchDate, setSearchDate] = useState(
    initialDate || new Date().toISOString().split("T")[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const flight = flightNumber.trim();
    if (!flight) return;

    setIsSubmitting(true);
    startTransition(() => {
      router.push(`/flight/${encodeURIComponent(flight)}?date=${searchDate}`);
    });
  };

  const disabled = isSubmitting || isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-2xl border border-gray-200 bg-white/70 backdrop-blur p-1 shadow-sm">
          {["Aircraft", "Flight", "Airport"].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition ${
                tab === "Flight"
                  ? "bg-white shadow border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              ✈ {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Formulaire de recherche */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Champ de recherche du vol */}
          <div className="flex-1">
            <input
              type="text"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value)}
              placeholder="Enter a flight like AC123 and a date."
              disabled={disabled}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 disabled:opacity-60"
            />
          </div>

          {/* Sélecteur de date */}
          <div className="sm:w-48">
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              disabled={disabled}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 disabled:opacity-60"
            />
          </div>

          {/* Bouton de recherche */}
          <button
            type="submit"
            disabled={disabled}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-semibold transition"
          >
            {disabled ? "Searching..." : "Search"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

