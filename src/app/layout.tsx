import "./globals.css";
import type { Metadata } from "next";
import Head from "next/head";
import AOSInit from "@/components/AOSInit";
import SearchHeader from "@/components/SearchHeader";
import ClientTransition from "@/components/ClientTransition";
import Footer from "@/components/layout/Footer";
import ScrollToTop from "@/components/layout/ScrollToTop";
import ErrorBoundary from "@/components/ErrorBoundary";
import PWASetup from "@/components/PWASetup";
import StructuredData from "@/components/StructuredData";
import { Comfortaa } from "next/font/google";

export const comfortaa = Comfortaa({
  subsets: ["latin"],
  weight: ["400", "600", "700"], // choisis ce dont tu as besoin
});
export const metadata: Metadata = {
  metadataBase: new URL("https://plane-wise.com"),
  title: {
    default: "PlaneWise - Aviation Data & Flight Tracking Platform",
    template: "%s | PlaneWise",
  },
  description:
    "Professional aviation data platform for aircraft registration lookup, flight tracking, airport information, and real-time flight status. Track flights, find aircraft details, and access comprehensive aviation database.",
  keywords: [
    "aviation data",
    "aircraft registration",
    "flight tracking",
    "airport information",
    "flight status",
    "aircraft lookup",
    "aviation database",
    "flight details",
    "aircraft photos",
    "aviation platform",
  ],
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
    maximumScale: 1,
    userScalable: false,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <Head>
        <link rel="preconnect" href="https://aerodatabox.p.rapidapi.com" />
        <link rel="preconnect" href="https://commons.wikimedia.org" />
        <link rel="dns-prefetch" href="https://aerodatabox.p.rapidapi.com" />
        <link rel="dns-prefetch" href="https://commons.wikimedia.org" />
      </Head>
      <body
        className={`${comfortaa.className} min-h-screen flex flex-col text-gray-900 bg-white`}
      >
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
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-5 w-5 text-blue-600"
              >
                <path
                  d="M2 12.5l8.5 1.5 3.5 6 1-6 7-1.5-7-1.5-1-6-3.5 6L2 12.5z"
                  fill="currentColor"
                />
              </svg>
              <span className="font-semibold">PlaneWise</span>
            </a>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <a className="text-gray-600 hover:text-gray-900 relative after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-gray-900 after:transition-[width] hover:after:w-full">
                Product
              </a>
              <a className="text-gray-600 hover:text-gray-900 relative after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-gray-900 after:transition-[width] hover:after:w-full">
                Docs
              </a>
              <a className="text-gray-600 hover:text-gray-900 relative after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-gray-900 after:transition-[width] hover:after:w-full">
                Pricing
              </a>
            </nav>
            <a
              href="/dashboard"
              className="rounded-full bg-[#178cf2] text-white px-4 py-1.5 text-sm font-semibold shadow hover:brightness-110"
            >
              Dashboard
            </a>
          </div>
        </header>
        {/* Barre de recherche compacte, affichée hors page d’accueil */}
        <SearchHeader />
        {/* AOS (ne rend rien visuellement) */}
        <AOSInit />
        {/* PWA Setup */}
        <PWASetup />
        {/* Structured Data pour le site web */}
        <StructuredData type="website" data={{}} />
        {/* Contenu des pages : prend toute la place restante */}
        <ErrorBoundary>
          <ClientTransition>
            <main className="flex-1 min-h-[calc(100vh-160px)]">{children}</main>
          </ClientTransition>
        </ErrorBoundary>
        {/* Footer commun */}
        <Footer />
        {/* Bouton scroll to top */}
        <ScrollToTop />
      </body>
    </html>
  );
}
