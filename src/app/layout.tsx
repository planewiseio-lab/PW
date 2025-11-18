import "./globals.css";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Image from "next/image";

// Lazy load SearchHeader pour réduire le bundle initial
// Ce composant utilise framer-motion qui est lourd (~75KB)
const SearchHeader = dynamic(() => import("@/components/SearchHeader"), {
  ssr: true, // SSR pour le SEO
});

// ClientTransition est déjà un composant client ("use client")
// Import direct car Next.js 15 gère automatiquement le rendu côté client
// et évite les problèmes HMR avec dynamic()
import ClientTransition from "@/components/ClientTransition";

// Lazy load Footer et ScrollToTop (non-critiques pour le rendu initial)
const Footer = dynamic(() => import("@/components/layout/Footer"), {
  ssr: true, // SSR pour le footer (important pour le SEO)
});

// ScrollToTop - lazy loaded (SSR par défaut dans Server Components)
const ScrollToTop = dynamic(() => import("@/components/layout/ScrollToTop"), {
  ssr: true, // SSR activé car on est dans un Server Component
});

// Lazy load modals et handlers d'erreur (non-critiques pour le rendu initial)
// Note: ssr: false n'est pas autorisé dans Server Components (Next.js 15)
// Ces composants sont "use client" donc ils gèrent le rendu côté client automatiquement
const ClientGlobalLogoutModal = dynamic(
  () => import("@/components/ClientGlobalLogoutModal")
);

const AuthErrorHandler = dynamic(() => import("@/components/AuthErrorHandler"));

const UserDeletedHandler = dynamic(
  () => import("@/components/UserDeletedHandler")
);

const SupabaseErrorHandler = dynamic(
  () => import("@/components/SupabaseErrorHandler")
);

const GlobalInsufficientCreditsHandler = dynamic(() =>
  import("@/components/GlobalInsufficientCreditsHandler").then((mod) => ({
    default: mod.GlobalInsufficientCreditsHandler,
  }))
);

const GuestQuotaExceededModal = dynamic(() =>
  import("@/components/errors/GuestQuotaExceededModal").then((mod) => ({
    default: mod.GuestQuotaExceededModal,
  }))
);

const FreeCreditsExceededModal = dynamic(() =>
  import("@/components/errors/FreeCreditsExceededModal").then((mod) => ({
    default: mod.FreeCreditsExceededModal,
  }))
);

const CookieConsent = dynamic(() => import("@/components/CookieConsent"));

const GoogleAnalytics = dynamic(() => import("@/components/GoogleAnalytics"));

// Lazy load AOSInit - charger uniquement après le rendu initial
// Note: AOSInit est déjà un composant client, donc pas besoin de ssr: false
const AOSInit = dynamic(() => import("@/components/AOSInit"));

// Lazy load AuthButton sur mobile pour éviter le chargement de Supabase auth
const AuthButton = dynamic(() => import("@/components/AuthButton"), {
  ssr: true, // SSR pour le SEO
});

// Lazy load ParticlesWrapper - très lourd, charger uniquement après le rendu initial
// Version optimisée qui ne charge pas sur mobile et utilise requestIdleCallback
// Note: ParticlesWrapperOptimized est déjà un composant client, donc pas besoin de ssr: false
const ParticlesWrapper = dynamic(() => import("@/components/ui/ParticlesWrapperOptimized"));

import ErrorBoundary from "@/components/ErrorBoundary";
import HeadLinks from "@/components/HeadLinks";
import PWASetup from "@/components/PWASetup";
import StructuredDataServer from "@/components/StructuredDataServer";
import BFCacheHandler from "@/components/BFCacheHandler";
import { AdSection } from "@/components/ads/AdWrapper";
import { UserStatusProvider } from "@/contexts/UserStatusContext";
import { Comfortaa } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";

export const comfortaa = Comfortaa({
  subsets: ["latin"],
  weight: ["400", "600", "700"], // choisis ce dont tu as besoin
  display: "swap", // Optimisation: afficher le texte immédiatement avec une police de fallback
  preload: true, // Précharger la police
});
export const metadata: Metadata = {
  metadataBase: new URL("https://plane-wise.com"),
  title: {
    default: "PlaneWise - Aviation Data & Flight Tracking Platform",
    template: "%s | PlaneWise",
  },
  description:
    "Professional aviation data platform for aircraft registration lookup, flight tracking, airport information, and real-time flight status. Track flights, find aircraft details, and access comprehensive aviation database.",
  authors: [{ name: "PlaneWise Team" }],
  creator: "PlaneWise",
  publisher: "PlaneWise",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://plane-wise.com",
    title: "PlaneWise - Aviation Data & Flight Tracking Platform",
    description:
      "Professional aviation data platform for aircraft registration lookup, flight tracking, and airport information.",
    siteName: "PlaneWise",
    images: [
      {
        url: "/Assets/airplane.jpg",
        width: 1200,
        height: 630,
        alt: "PlaneWise Aviation Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PlaneWise - Aviation Data & Flight Tracking Platform",
    description:
      "Professional aviation data platform for aircraft registration lookup, flight tracking, and airport information.",
    images: ["/Assets/airplane.jpg"],
    creator: "@planewise",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/Assets/logo.webp", sizes: "32x32", type: "image/webp" },
      { url: "/Assets/logo.webp", sizes: "16x16", type: "image/webp" },
    ],
    apple: [{ url: "/Assets/logo.webp", sizes: "180x180", type: "image/webp" }],
    shortcut: "/Assets/logo.webp",
  },
  other: {
    "format-detection": "telephone=no",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PlaneWise",
  },
  alternates: {
    canonical: "https://plane-wise.com",
  },
  category: "aviation",
};

// Fonction viewport séparée (Next.js 15+)
export function generateViewport() {
  return {
    themeColor: "#2563eb",
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;

  return (
    <html lang="en">
      <head>
        {/* Script AdSense - Chargé en lazy pour ne pas bloquer le rendu initial */}
        {adsenseId && (
          <Script
            id="adsense-validation"
            strategy="lazyOnload"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body
        className={`${comfortaa.className} min-h-screen flex flex-col text-gray-900 bg-white`}
      >
        <HeadLinks />
        <UserStatusProvider>
          {/* background grid - discret + fade bas */}
          <div className="fixed inset-0 -z-10 bg-white">
            <div className="bg-dot-grid w-full h-full [mask-image:linear-gradient(to_bottom,black_65%,transparent_100%)]" />
          </div>{" "}
          {/* Header (même structure que ton index.html) */}
          <header className="sticky top-0 z-50 border-b border-black/5 bg-white/70 backdrop-blur-md">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
              <a
                href="/"
                className="inline-flex items-center gap-2 hover:opacity-90 transition"
              >
                <Image
                  src="/Assets/logo.webp"
                  alt="PlaneWise"
                  width={24}
                  height={24}
                  className="h-6 w-auto"
                  priority
                />
                <span className="font-semibold">PlaneWise</span>
              </a>
              <AuthButton />
            </div>
          </header>
          {/* Barre de recherche compacte, affichée hors page d'accueil */}
          <SearchHeader />
          {/* Publicité TOP - Juste après le search header */}
          <AdSection positionLabel="TOP (après header site)" />
          {/* AOS - Lazy load uniquement si nécessaire (chargé après rendu initial) */}
          <AOSInit />
          {/* PWA Setup */}
          <PWASetup />
          {/* Structured Data pour le site web - Server Component optimisé */}
          <StructuredDataServer type="website" data={{}} />
          {/* BFCache Handler - Optimise le back/forward cache */}
          <BFCacheHandler />
          {/* Contenu des pages : prend toute la place restante */}
          <ErrorBoundary>
            <ClientTransition>
              <main className="relative flex-1 min-h-[calc(100vh-160px)]">
                {/* Particles Background - Optimisé : ne charge pas sur mobile, lazy load sur desktop */}
                <ParticlesWrapper
                  className="absolute inset-0 z-0 pointer-events-none"
                  quantity={100}
                  ease={80}
                  color="#178cf2"
                  size={0.6}
                  refresh
                />
                <div className="relative z-10">{children}</div>
              </main>
            </ClientTransition>
          </ErrorBoundary>
          {/* Publicité BOTTOM - Avant le footer du site */}
          <AdSection positionLabel="BOTTOM (avant footer site)" />
          {/* Footer commun */}
          <Footer />
          {/* Bouton scroll to top */}
          <ScrollToTop />
          {/* Modal global de déconnexion */}
          <ClientGlobalLogoutModal />
          {/* Gestionnaire d'erreurs d'authentification */}
          <AuthErrorHandler />
          {/* Gestionnaire de suppression d'utilisateur */}
          <UserDeletedHandler />
          {/* Gestionnaire d'erreurs Supabase */}
          <SupabaseErrorHandler />
          {/* Gestionnaire de crédits insuffisants */}
          <GlobalInsufficientCreditsHandler />
          {/* Modal de quota invité dépassé */}
          <GuestQuotaExceededModal />
          {/* Modal de crédits épuisés pour utilisateurs Free */}
          <FreeCreditsExceededModal />
          {/* Google Analytics - Chargé uniquement si consentement accepté */}
          <GoogleAnalytics />
          {/* Vercel Analytics */}
          <Analytics />
          {/* Cookie Consent Banner */}
          <CookieConsent />
        </UserStatusProvider>
      </body>
    </html>
  );
}
