// src/app/page.tsx
"use client";

import SearchCluster from "@/components/SearchCluster";
import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import SectionDivider from "@/components/layout/SectionDivider";
import dynamic from "next/dynamic";

// Fonction pour gérer le scroll vers la section pricing
function useHashScroll() {
  useEffect(() => {
    // Vérifier si on a un hash dans l'URL
    if (typeof window !== "undefined" && window.location.hash === "#pricing") {
      // Attendre que le DOM soit prêt
      setTimeout(() => {
        const pricingSection = document.getElementById("pricing");
        if (pricingSection) {
          pricingSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, []);
}

/* ==========================================================
   Lazy Loading Components
   ---------------------------------------------------------- */
// Lazy load ShowcaseSection et PricingSection (non-critiques pour le rendu initial)
// Ces sections utilisent framer-motion qui est lourd (~75KB), donc on les charge après le rendu initial
const ShowcaseSection = dynamic(() => import("@/components/ShowcaseSection"), {
  ssr: false, // Désactiver SSR pour ces sections non-critiques
  loading: () => <div className="min-h-[800px]" />, // Placeholder pour éviter layout shift
});

const PricingSection = dynamic(() => import("@/components/PricingSection"), {
  ssr: false, // Désactiver SSR pour ces sections non-critiques
  loading: () => <div className="min-h-[600px]" />, // Placeholder pour éviter layout shift
});

/* ==========================================================
   Types
   ---------------------------------------------------------- */
type Mode = "aircraft" | "flight" | "airport";

/* ==========================================================
   Page d'accueil Next.js (Hero + Search + nouvelles sections)
   ---------------------------------------------------------- */
export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("aircraft");
  const [q, setQ] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Gérer le scroll vers la section pricing si on a le hash #pricing
  useHashScroll();

  const placeholder = useMemo(() => {
    if (mode === "flight") return "Enter a flight like AC123 and a date.";
    if (mode === "airport") return "Airport code (e.g. YUL, JFK, LHR)";
    return "Registration (e.g. C-FRSR, N875BD)";
  }, [mode]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    setIsSubmitting(true);

    if (mode === "flight") {
      // Pour les vols, rediriger vers la page de recherche avec date
      // Utiliser la date du jour par défaut si pas de date sélectionnée
      const today = new Date().toISOString().split("T")[0];
      startTransition(() =>
        router.push(`/flight/${encodeURIComponent(v)}?date=${today}`)
      );
    } else {
      startTransition(() => router.push(`/${mode}/${encodeURIComponent(v)}`));
    }
  }

  const disabled = isSubmitting || isPending;

  return (
    <main>
      {/* Hero + Search */}
      <section className="relative">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <div className="flex flex-col items-center mb-4">
            <img
              src="/Assets/logo.png"
              alt="PlaneWise"
              className="h-32 sm:h-40 md:h-48 lg:h-56 w-auto mb-2"
            />
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-bold"
              style={{ fontFamily: "Comfortaa, sans-serif", color: "#178cf2" }}
            >
              PlaneWise.io
            </h1>
          </div>
          <p className="mt-4 text-gray-600 max-w-3xl text-lg mx-auto">
            Instantly look up any aircraft registration and explore specs,
            photos, and flight history — all in one place.
          </p>

          <div className="mt-8 flex justify-center">
            <SearchCluster
              mode={mode}
              setMode={setMode}
              q={q}
              setQ={setQ}
              placeholder={placeholder}
              onSubmit={onSubmit}
              disabled={disabled}
            />
          </div>
        </div>
      </section>

      {/* Showcase - Chargé après le contenu principal - Masqué sur mobile */}
      <div className="hidden sm:block" suppressHydrationWarning>
        <SectionDivider className="my-8 sm:my-10" />
        <ShowcaseSection />
        <SectionDivider className="my-8 sm:my-10" />
      </div>

      {/* Pricing - Chargé après le contenu principal */}
      <PricingSection />
    </main>
  );
}
