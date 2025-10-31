"use client";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

type Mode = "aircraft" | "flight" | "airport";

function inferMode(path: string): Mode {
  if (path.startsWith("/flight")) return "flight";
  if (path.startsWith("/airport")) return "airport";
  return "aircraft";
}

export default function SearchHeader() {
  const pathname = (usePathname() || "/").toLowerCase();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("aircraft"); // État initial stable
  const [q, setQ] = useState("");
  const [searchDate, setSearchDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [isMounted, setIsMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isHome = pathname === "/";
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/dashboard" ||
    pathname === "/reset-password" ||
    pathname === "/account-settings" ||
    pathname === "/credits";
  const isAdminPage = pathname.startsWith("/admin");

  // Éviter les différences d'hydration
  useEffect(() => {
    setIsMounted(true);
    setMode(inferMode(pathname));
  }, [pathname]);

  // Vider le champ de recherche quand on change de mode
  useEffect(() => {
    setQ("");
  }, [mode]);

  const placeholder = useMemo(() => {
    if (mode === "flight") return "Flight number";
    if (mode === "airport") return "Airport (e.g. YUL or CYUL)";
    return "Registration (e.g. C-FRSR, N875BD)";
  }, [mode]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;

    startTransition(() => {
      if (mode === "flight") {
        router.push(`/flight/${encodeURIComponent(v)}?date=${searchDate}`);
      } else {
        router.push(`/${mode}/${encodeURIComponent(v)}`);
      }
    });
  };

  // Pas de SearchHeader sur la home, les pages d'auth, et les pages admin
  if (isHome || isAuthPage || isAdminPage) return null;

  // Éviter les différences d'hydration - rendu initial avec transition
  if (!isMounted) {
    return (
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative overflow-hidden isolate"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0">
          <div className="relative h-[200px] sm:h-[240px]">
            <div className="bg-dot-grid w-full h-full opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/60 to-white" />
          </div>
          <div className="h-20 sm:h-24 bg-white" />
        </div>
        <div className="relative z-10 pt-3 sm:pt-4 pb-1">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-1 sm:mb-4">
              <div className="flex items-center gap-4">
                <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                  <button className="px-4 py-2 text-sm font-medium rounded-lg text-gray-600">
                    Aircraft
                  </button>
                  <button className="px-4 py-2 text-sm font-medium rounded-lg text-gray-600">
                    Flight
                  </button>
                  <button className="px-4 py-2 text-sm font-medium rounded-lg text-gray-600">
                    Airport
                  </button>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="group flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm px-3 py-2 shadow-sm">
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
                <input
                  className="flex-1 bg-transparent border-0 outline-none px-2 py-3 text-sm sm:text-[17px] placeholder:text-gray-400"
                  placeholder="Registration (e.g. C-FRSR, N875BD)"
                />
                <button className="btn-primary-md shrink-0 rounded-xl shadow hover:brightness-110 mr-1">
                  Search
                </button>
              </div>
            </div>
            <div className="block md:hidden h-12"></div>
          </div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative overflow-hidden isolate"
    >
      {/* ---- FOND "PICOTÉ" + FADE (arrêt avant la bulle) ---- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0">
        {/* hauteur du motif : ajuste pour qu'il finisse JUSTE avant la bulle */}
        <div className="relative h-[200px] sm:h-[240px]">
          <div className="bg-dot-grid w-full h-full opacity-90" />
          {/* fade doux vers le bas */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/60 to-white" />
        </div>
        {/* sécurité : bande blanche solide pour garantir aucun point sous la bulle */}
        <div className="h-20 sm:h-24 bg-white" />
      </div>

      {/* CONTENU AU-DESSUS DU FOND */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-3 sm:pt-4 pb-1">
        <motion.div
          style={{ zIndex: 100 }}
          layoutId="searchCluster"
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 32,
            mass: 0.9,
          }}
          onLayoutAnimationStart={() => {
            // S'assurer que la barre de recherche reste visible pendant l'animation
            if (typeof window !== "undefined") {
              const element = document.querySelector(
                '[data-layout-id="searchCluster"]'
              );
              if (element) {
                (element as HTMLElement).style.zIndex = "100";
              }
            }
          }}
          onLayoutAnimationComplete={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("searchCluster:docked"));
            }
          }}
        >
          {/* Bulle 3 sélections */}
          <div className="mx-auto w-fit rounded-2xl border border-gray-200 bg-white/70 backdrop-blur p-1 shadow-sm mb-0 sm:mb-4">
            {(["aircraft", "flight", "airport"] as const).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={[
                    "px-4 py-2 text-sm font-medium rounded-xl",
                    active
                      ? "bg-white shadow border border-gray-200"
                      : "text-gray-600 hover:text-gray-900",
                  ].join(" ")}
                  aria-pressed={active}
                >
                  {m === "aircraft" && "✈︎ Aircraft"}
                  {m === "flight" && "✈︎ Flight"}
                  {m === "airport" && "✈︎ Airport"}
                </button>
              );
            })}
          </div>

          {/* Barre de recherche */}
          <form
            onSubmit={onSubmit}
            className="mx-auto w-full max-w-[92%] sm:max-w-[950px]"
          >
            {/* Espace réservé pour éviter le déplacement sur mobile - TOUJOURS présent */}
            <div className="block md:hidden h-2"></div>
            {/* Desktop Layout */}
            <div className="hidden md:block">
              <div
                className="
        group flex items-center gap-2
        rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm
        px-3 py-2 shadow-sm
        focus-within:ring-2 focus-within:ring-blue-500/25
      "
              >
                <span className="pl-2 text-gray-400 shrink-0">
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

                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={placeholder}
                  className="
          flex-1 bg-transparent border-0 outline-none
          px-2 py-3 text-[17px] placeholder:text-gray-400
          min-w-0
        "
                  style={{ minWidth: "120px" }}
                />

                {/* Sélecteur de date intégré (visible seulement pour les vols) */}
                {mode === "flight" && (
                  <div className="flex items-center gap-2 border-l border-gray-200 pl-3 shrink-0">
                    <input
                      type="date"
                      value={searchDate}
                      onChange={(e) => setSearchDate(e.target.value)}
                      className="
                        bg-transparent border-0 outline-none
                        text-[16px] text-gray-700
                      "
                      style={{ width: "140px" }}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary-md shrink-0 rounded-xl shadow hover:brightness-110 active:scale-[0.98] mr-1 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPending ? "Searching…" : "Search"}
                </button>
              </div>
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden">
              {mode === "flight" ? (
                /* Mode Flight : barre fusionnée avec numéro de vol et date */
                <div
                  className="
          group flex items-center gap-2
          rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm
          px-3 py-2 shadow-sm
          focus-within:ring-2 focus-within:ring-blue-500/25
        "
                >
                  {/* Icône de recherche */}
                  <span className="pl-2 text-gray-400 shrink-0">
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

                  {/* Champ numéro de vol */}
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Flight number"
                    className="
            flex-1 bg-transparent border-0 outline-none
            px-2 py-3 text-[17px] placeholder:text-gray-400
            min-w-0
          "
                  />

                  {/* Séparateur vertical */}
                  <div className="w-px h-6 bg-gray-300 shrink-0"></div>

                  {/* Champ date */}
                  <input
                    type="date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    className="
            bg-transparent border-0 outline-none
            text-[16px] text-gray-700
            w-32 shrink-0
          "
                  />

                  {/* Bouton Search */}
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary-md shrink-0 rounded-xl shadow hover:brightness-110 mr-1 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isPending ? "Searching…" : "Search"}
                  </button>
                </div>
              ) : (
                /* Mode normal (Aircraft/Airport) : barre simple */
                <div
                  className="
          group flex items-center gap-2
          rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm
          px-3 py-2 shadow-sm
          focus-within:ring-2 focus-within:ring-blue-500/25
        "
                >
                  <span className="pl-2 text-gray-400 shrink-0">
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

                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={placeholder}
                    className="
            flex-1 bg-transparent border-0 outline-none
            px-2 py-3 text-[17px] placeholder:text-gray-400
          "
                  />

                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary-md shrink-0 rounded-xl shadow hover:brightness-110 mr-1 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isPending ? "Searching…" : "Search"}
                  </button>
                </div>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </motion.section>
  );
}
