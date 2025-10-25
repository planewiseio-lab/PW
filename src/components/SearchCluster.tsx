"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type Mode = "aircraft" | "flight" | "airport";

type Props = {
  mode: Mode;
  setMode: (m: Mode) => void;
  q: string;
  setQ: (v: string) => void;
  placeholder: string;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
  /** (optional) allows adjusting the width from the caller */
  className?: string;
  readOnly?: boolean; // Pour les pages de résultats
  externalDate?: string; // Date externe pour les pages de résultats
  onDateChange?: (date: string) => void; // Callback pour changer la date
};

export default function SearchCluster({
  mode,
  setMode,
  q,
  setQ,
  placeholder,
  onSubmit,
  disabled = false,
  className = "",
  readOnly = false,
  externalDate,
  onDateChange,
}: Props) {
  const [searchDate, setSearchDate] = useState(() => {
    return externalDate || new Date().toISOString().split("T")[0];
  });

  // Mettre à jour la date interne quand la date externe change
  useEffect(() => {
    if (externalDate) {
      setSearchDate(externalDate);
    }
  }, [externalDate]);

  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const flight = q.trim();
    if (!flight) return;

    if (mode === "flight" && !readOnly) {
      // For flights on the main page, redirect to the search page with date
      startTransition(() => {
        router.push(`/flight/${encodeURIComponent(flight)}?date=${searchDate}`);
      });
    } else {
      // For other modes or result pages, use normal logic
      onSubmit(e);
    }
  };
  return (
    <motion.div
      layoutId="searchCluster"
      transition={{ type: "spring", stiffness: 200, damping: 36, mass: 0.9 }}
      className={[
        "mx-auto w-full max-w-[92%] sm:max-w-[950px]",
        className,
      ].join(" ")}
    >
      {/* — Selection bubble — */}
      <div className="w-full flex justify-center">
        <div className="inline-flex rounded-2xl border border-gray-200 bg-white/70 backdrop-blur p-1 shadow-sm">
          {(["aircraft", "flight", "airport"] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                disabled={disabled}
                className={[
                  "px-4 py-2 text-sm font-medium rounded-xl transition-colors duration-150 border border-transparent",
                  active
                    ? "bg-white shadow-sm border-gray-200"
                    : "text-gray-600 hover:text-gray-900",
                  disabled ? "opacity-60 pointer-events-none" : "",
                ].join(" ")}
                aria-pressed={active}
                aria-disabled={disabled}
              >
                {m === "aircraft" && "✈ Aircraft"}
                {m === "flight" && "✈ Flight"}
                {m === "airport" && "✈ Airport"}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-3 w-full">
        {/* Flight mode on mobile: two separate cards */}
        {mode === "flight" ? (
          <>
            {/* Mobile version: two separate cards */}
            <div className="block sm:hidden space-y-3">
              {/* Card 1: Flight number + Search button */}
              <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/25">
                {/* Loupe icon */}
                <span className="text-gray-400">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="block"
                    aria-hidden
                  >
                    <path
                      d="M21 21l-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                {/* Text field */}
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Flight number"
                  disabled={disabled || readOnly}
                  readOnly={readOnly}
                  className="flex-1 bg-transparent border-0 outline-none px-2 py-3 text-sm placeholder:text-gray-400 disabled:opacity-60"
                />

                {/* Blue button */}
                <button
                  type="submit"
                  disabled={disabled || isPending}
                  className="btn-primary-md shrink-0 rounded-xl shadow hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {disabled || isPending ? "Searching…" : "Search"}
                </button>
              </div>

              {/* Card 2: Date selector */}
              <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm px-3 py-2 shadow-sm">
                {/* Calendar icon */}
                <span className="text-gray-400">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="block"
                    aria-hidden
                  >
                    <path
                      d="M8 2v3M16 2v3M3.5 9.09h17M21 8.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                {/* Date display */}
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => {
                    setSearchDate(e.target.value);
                    if (onDateChange) {
                      onDateChange(e.target.value);
                    }
                  }}
                  disabled={disabled}
                  className="flex-1 bg-transparent border-0 outline-none px-2 py-3 text-sm text-gray-700 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Desktop version: single card with integrated date */}
            <div className="hidden sm:block">
              <div className="group flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/25">
                {/* Loupe icon */}
                <span className="pl-2 text-gray-400">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="block"
                    aria-hidden
                  >
                    <path
                      d="M21 21l-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                {/* Text field */}
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={placeholder}
                  disabled={disabled || readOnly}
                  readOnly={readOnly}
                  className="flex-1 bg-transparent border-0 outline-none px-2 py-3 text-sm sm:text-[17px] placeholder:text-gray-400 disabled:opacity-60 min-w-0"
                  style={{ minWidth: "100px" }}
                />

                {/* Integrated date selector */}
                <div className="flex items-center gap-2 border-l border-gray-200 pl-3 shrink-0">
                  <input
                    type="date"
                    value={searchDate}
                    onChange={(e) => {
                      setSearchDate(e.target.value);
                      if (onDateChange) {
                        onDateChange(e.target.value);
                      }
                    }}
                    disabled={disabled}
                    className="bg-transparent border-0 outline-none text-sm sm:text-[17px] text-gray-700 disabled:opacity-60 min-w-0"
                    style={{ minWidth: "120px", maxWidth: "140px" }}
                  />
                </div>

                {/* Blue button */}
                <button
                  type="submit"
                  disabled={disabled || isPending}
                  className="btn-primary-md shrink-0 rounded-xl shadow hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed mr-1"
                >
                  {disabled || isPending ? "Searching…" : "Search"}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Normal mode (Aircraft/Airport): single card */
          <div className="group flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/25">
            {/* Loupe icon */}
            <span className="pl-2 text-gray-400">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className="block"
                aria-hidden
              >
                <path
                  d="M21 21l-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            {/* Text field */}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              disabled={disabled || readOnly}
              readOnly={readOnly}
              className="flex-1 bg-transparent border-0 outline-none px-2 py-3 text-sm sm:text-[17px] placeholder:text-gray-400 disabled:opacity-60 min-w-0"
              style={{ minWidth: "100px" }}
            />

            {/* Blue button */}
            <button
              type="submit"
              disabled={disabled || isPending}
              className="btn-primary-md shrink-0 rounded-xl shadow hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed mr-1"
            >
              {disabled || isPending ? "Searching…" : "Search"}
            </button>
          </div>
        )}
      </form>
    </motion.div>
  );
}
