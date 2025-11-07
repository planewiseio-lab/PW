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
            {/* Mobile version: single card with integrated date (like SearchHeader) */}
            <div className="block md:hidden">
              <div className="group flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm px-2 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/25 overflow-hidden">
                {/* Icône de recherche */}
                <span className="text-gray-400 shrink-0">
                  <svg
                    width="18"
                    height="18"
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

                {/* Champ de texte - prend tout l'espace disponible */}
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Flight number"
                  disabled={disabled || readOnly}
                  readOnly={readOnly}
                  className="flex-1 bg-transparent border-0 outline-none px-1.5 py-2 text-[16px] placeholder:text-gray-400 disabled:opacity-60 min-w-0"
                  style={{ minWidth: "80px" }}
                />

                {/* Séparateur */}
                <div className="h-6 w-px bg-gray-300 shrink-0"></div>

                {/* Sélecteur de date intégré - aligné à droite */}
                <div className="flex items-center shrink-0">
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
                    className="bg-transparent border-0 outline-none text-[14px] text-gray-700 disabled:opacity-60 text-right"
                    style={{ width: "110px" }}
                  />
                </div>

                {/* Bouton Search - Icône uniquement sur mobile */}
                <button
                  type="submit"
                  disabled={disabled || isPending}
                  className="shrink-0 rounded-full bg-[#178cf2] text-white shadow hover:brightness-110 transition-all duration-200 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed p-2 min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center ml-1"
                  aria-label="Search"
                >
                  {disabled || isPending ? (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-white"
                      aria-hidden
                    >
                      <path
                        d="M21 21l-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Desktop version: single card with integrated date */}
            <div className="hidden md:block">
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
          <>
            {/* Mobile version (like SearchHeader) */}
            <div className="block md:hidden">
              <div className="group flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm px-2 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/25">
                {/* Icône de recherche */}
                <span className="text-gray-400 shrink-0">
                  <svg
                    width="18"
                    height="18"
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

                {/* Champ de texte */}
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={placeholder}
                  disabled={disabled || readOnly}
                  readOnly={readOnly}
                  className="flex-1 bg-transparent border-0 outline-none px-1.5 py-2 text-[16px] placeholder:text-gray-400 disabled:opacity-60 min-w-0"
                  style={{ minWidth: "80px" }}
                />

                {/* Bouton Search - Icône uniquement sur mobile */}
                <button
                  type="submit"
                  disabled={disabled || isPending}
                  className="shrink-0 rounded-full bg-[#178cf2] text-white shadow hover:brightness-110 transition-all duration-200 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed p-2 min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center ml-1"
                  aria-label="Search"
                >
                  {disabled || isPending ? (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-white"
                      aria-hidden
                    >
                      <path
                        d="M21 21l-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Desktop version */}
            <div className="hidden md:block">
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
            </div>
          </>
        )}
      </form>
    </motion.div>
  );
}
