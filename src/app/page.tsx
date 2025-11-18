// src/app/page.tsx
"use client";

import SearchCluster from "@/components/SearchCluster";
import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import SectionDivider from "@/components/layout/SectionDivider";
import dynamic from "next/dynamic";
import Image from "next/image";

// Fonction pour gérer le scroll vers la section pricing
function useHashScroll() {
  useEffect(() => {
    const scrollToPricing = () => {
      const pricingSection = document.getElementById("pricing");
      if (pricingSection) {
        // Utiliser un petit offset pour tenir compte du header fixe
        const headerOffset = 80;
        const elementPosition = pricingSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
        return true;
      }
      return false;
    };

    // Fonction pour essayer de scroller avec retry
    const tryScroll = (maxAttempts = 10, delay = 200) => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (scrollToPricing() || attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, delay);
    };

    // Vérifier le hash au chargement initial
    if (typeof window !== "undefined") {
      if (window.location.hash === "#pricing") {
        // Attendre un peu pour que les composants dynamiques se chargent
        setTimeout(() => {
          tryScroll();
        }, 500);
      }

      // Écouter les changements de hash (navigation avec #pricing)
      const handleHashChange = () => {
        if (window.location.hash === "#pricing") {
          tryScroll();
        }
      };

      window.addEventListener("hashchange", handleHashChange);

      return () => {
        window.removeEventListener("hashchange", handleHashChange);
      };
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
    <div suppressHydrationWarning>
      {/* Hero + Search */}
      <section className="relative">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <div className="flex flex-col items-center mb-4">
            <Image
              src="/Assets/logo.webp"
              alt="PlaneWise"
              width={224}
              height={224}
              priority
              fetchPriority="high"
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

      {/* Showcase - Chargé après le contenu principal */}
      <div suppressHydrationWarning>
        <SectionDivider className="my-8 sm:my-10" />
        <ShowcaseSection />
        <SectionDivider className="my-8 sm:my-10" />
      </div>

      {/* Pricing - Position fixe sous la section Showcase */}
      <div suppressHydrationWarning className="relative">
        <PricingSection />
      </div>
    </div>
  );
}
