// src/app/page.tsx
"use client";

import SearchCluster from "@/components/SearchCluster";
import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import SectionDivider from "@/components/layout/SectionDivider";
import { motion, AnimatePresence } from "framer-motion";

/* ==========================================================
   Types
   ---------------------------------------------------------- */
type Mode = "aircraft" | "flight" | "airport";

/* ==========================================================
   Sections réutilisables (Showcase / Stats / Pricing / Footer)
   ---------------------------------------------------------- */

// -- Showcase (carousel des services)
function ShowcaseSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const slides = [
    {
      id: "aircraft",
      title: "Aircraft Information",
      subtitle: "Complete aircraft details and specifications",
      icon: (
        <svg
          className="w-6 h-6 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      ),
      content: {
        registration: "C-FRSR",
        type: "Boeing 787-9 Dreamliner",
        airline: "Air Canada",
        status: "Active",
        year: "2018",
        seats: "294",
      },
      preview: (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </div>
              <div>
                <span className="font-semibold text-gray-900">C-FRSR</span>
                <div className="text-xs text-gray-500">Boeing 787-9</div>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
              Active
            </span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Airline:</span>
              <span className="font-medium text-gray-900">Air Canada</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Year:</span>
              <span className="font-medium text-gray-900">2018 (6 years)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Seats:</span>
              <span className="font-medium text-gray-900">294</span>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-center items-center text-xs text-gray-500">
                <span>Images: Representative aircraft photos available</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "history",
      title: "Flight History",
      subtitle: "Track all flights and routes",
      icon: (
        <svg
          className="w-6 h-6 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      content: {
        flights: "47 flights",
        period: "Last 7 days",
        totalDistance: "89,234 km",
        destinations: "12 cities",
      },
      preview: (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <span className="font-semibold text-gray-900">
                  Flight History
                </span>
                <div className="text-xs text-gray-500">C-FRSR • 7 days</div>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
              Live
            </span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Total Flights:</span>
              <span className="font-medium text-gray-900">12</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Distance:</span>
              <span className="font-medium text-gray-900">23,456 km</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Destinations:</span>
              <span className="font-medium text-gray-900">12 cities</span>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Avg: 1.7 flights/day</span>
                <span>Last: YYZ→LAX</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "flight",
      title: "Flight Details",
      subtitle: "Real-time flight tracking and status",
      icon: (
        <svg
          className="w-6 h-6 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      content: {
        flight: "AC 801",
        route: "YYZ → LAX",
        status: "In Flight",
        progress: "65%",
        eta: "2h 15m",
      },
      preview: (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <span className="font-semibold text-gray-900">AC 801</span>
                <div className="text-xs text-gray-500">Air Canada</div>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
              In Flight
            </span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Route:</span>
              <span className="font-medium text-gray-900">YYZ → LAX</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Progress:</span>
              <span className="font-medium text-gray-900">65%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">ETA:</span>
              <span className="font-medium text-gray-900">2h 15m</span>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Aircraft: C-FRSR</span>
                <span>Alt: 37,000 ft</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "airport",
      title: "Airport Board",
      subtitle: "Live departures and arrivals",
      icon: (
        <svg
          className="w-6 h-6 text-purple-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
      content: {
        airport: "Toronto Pearson (YYZ)",
        departures: "23 flights",
        arrivals: "18 flights",
        lastUpdate: "2 min ago",
      },
      preview: (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div>
                <span className="font-semibold text-gray-900">YYZ Board</span>
                <div className="text-xs text-gray-500">Toronto Pearson</div>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
              Live
            </span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Departures:</span>
              <span className="font-medium text-gray-900">23 flights</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Arrivals:</span>
              <span className="font-medium text-gray-900">18 flights</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Updated:</span>
              <span className="font-medium text-gray-900">2 min ago</span>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Terminal 1: 15 flights</span>
                <span>Terminal 3: 26 flights</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Auto-rotate slides
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000); // Augmenté de 4000ms à 6000ms
    return () => clearInterval(interval);
  }, [isHovered, slides.length]);

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
          Everything you need to track aviation
        </h2>
        <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
          From aircraft details to real-time flight tracking, access
          comprehensive aviation data in one place.
        </p>
      </div>

      {/* Carousel Container */}
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Slide */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
              className="p-8 sm:p-12"
            >
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                {/* Content */}
                <div className="text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-200">
                      {slides[currentSlide].icon}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {slides[currentSlide].title}
                      </h3>
                      <p className="text-gray-600">
                        {slides[currentSlide].subtitle}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-6">
                    {slides[currentSlide].id === "aircraft" &&
                      "Get complete aircraft specifications, photos, and detailed information for any registration worldwide."}
                    {slides[currentSlide].id === "history" &&
                      "Track flight history, routes, and statistics for any aircraft over the past 7 days with detailed analytics."}
                    {slides[currentSlide].id === "flight" &&
                      "Monitor real-time flight status, progress, delays, and estimated arrival times with live updates."}
                    {slides[currentSlide].id === "airport" &&
                      "View live airport boards with current departures, arrivals, and gate information updated in real-time."}
                  </p>
                  <div className="flex gap-3 justify-center lg:justify-start">
                    <button
                      onClick={() => {
                        // Sélectionner le bon onglet selon la slide actuelle
                        const tabMapping: { [key: string]: Mode } = {
                          aircraft: "aircraft",
                          history: "aircraft", // L'historique est lié aux avions
                          flight: "flight",
                          airport: "airport",
                        };

                        const targetMode = tabMapping[slides[currentSlide].id];

                        // Trouver et cliquer sur le bon onglet
                        const tabs = document.querySelectorAll(
                          'button[type="button"]'
                        );
                        const targetTab = Array.from(tabs).find((tab) => {
                          const text = tab.textContent || "";
                          return text.includes(
                            targetMode === "aircraft"
                              ? "Aircraft"
                              : targetMode === "flight"
                              ? "Flight"
                              : "Airport"
                          );
                        }) as HTMLButtonElement;

                        if (targetTab) {
                          targetTab.click();
                        }

                        // Scroll vers la section de recherche
                        setTimeout(() => {
                          const searchSection =
                            document.querySelector("section.relative");
                          if (searchSection) {
                            searchSection.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }
                        }, 100);
                      }}
                      className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition"
                    >
                      Try it now
                    </button>
                    <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition">
                      Learn more
                    </button>
                  </div>
                </div>

                {/* Preview Card */}
                <div className="flex justify-center lg:justify-end">
                  <div className="w-full max-w-sm h-[240px] flex flex-col">
                    {slides[currentSlide].preview}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          <button
            onClick={() =>
              setCurrentSlide(
                (prev) => (prev - 1 + slides.length) % slides.length
              )
            }
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/95 hover:bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 transition opacity-80 hover:opacity-100 z-10"
          >
            ‹
          </button>
          <button
            onClick={() =>
              setCurrentSlide((prev) => (prev + 1) % slides.length)
            }
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/95 hover:bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 transition opacity-80 hover:opacity-100 z-10"
          >
            ›
          </button>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center mt-6 gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition ${
                index === currentSlide
                  ? "bg-brand-600 w-8"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// -- Pricing (3 cartes)
function PricingSection() {
  return (
    <section id="pricing" className="section-fade">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="mb-10 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Pricing
          </h2>
          <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
            Simple plans with fair limits. Start free and upgrade anytime.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              name: "Free",
              price: "$0",
              note: "/mo",
              perks: [
                "Basic lookup",
                "Basic specs & photos",
                "Community support",
              ],
              cta: {
                href: "/signup",
                text: "Get started",
                className: "bg-gray-900 hover:bg-black",
              },
              wrapClass: "border-gray-200",
            },
            {
              name: "Basic",
              price: "$9.99",
              note: "/mo",
              perks: [
                "Everything in Free",
                "7-day detailed flight history",
                "Detailed airport flight board",
              ],
              cta: {
                href: "/checkout?plan=basic",
                text: "Choose Basic",
                className: "bg-brand-600 hover:bg-brand-700",
              },
              wrapClass: "border-brand-200",
              badge: "Popular",
            },
            {
              name: "Advance",
              price: "$14.99",
              note: "/mo",
              perks: [
                "Everything in Basic",
                "Priority processing",
                "Higher monthly request limit",
              ],
              cta: {
                href: "/checkout?plan=advance",
                text: "Choose Advance",
                className: "bg-gray-900 hover:bg-black",
              },
              wrapClass: "border-gray-200",
            },
          ].map((p, i) => (
            <article
              key={p.name}
              className={`relative rounded-2xl border ${p.wrapClass} bg-white p-6 sm:p-8 shadow-sm hover:shadow-md transition`}
            >
              {p.badge && (
                <div className="absolute -top-3 right-4">
                  <span className="rounded-full bg-brand-100 text-brand-800 text-xs font-semibold px-3 py-1 border border-brand-200">
                    {p.badge}
                  </span>
                </div>
              )}
              <h3 className="text-xl font-semibold">{p.name}</h3>
              <p className="mt-1 text-3xl font-extrabold">
                {p.price}
                <span className="text-base font-medium text-gray-500">
                  {p.note}
                </span>
              </p>
              <p className="mt-3 text-sm text-gray-600">
                {i === 0 && "5 requests per day"}
                {i === 1 && "Up to 500 total requests / month"}
                {i === 2 && "Up to 2500 total requests / month"}
              </p>
              <ul className="mt-5 space-y-2 text-sm text-gray-700">
                {p.perks.map((perk) => (
                  <li key={perk}>• {perk}</li>
                ))}
              </ul>
              <a
                href={p.cta.href}
                className={`mt-6 inline-flex w-full justify-center rounded-xl ${p.cta.className} text-white px-4 py-2.5 font-semibold`}
              >
                {p.cta.text}
              </a>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-gray-500">
          All prices in USD. Request counts reset monthly. Fair use applies.
        </p>
      </div>
    </section>
  );
}

// -- Footer simple (proche de index.html)
function FooterSection() {
  return (
    <footer className="border-t border-gray-200/70">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} AirReg. Minimal &amp; clear aircraft
          lookup.
        </p>
        <div className="flex items-center gap-4 text-sm">
          <a href="#" className="text-gray-600 hover:text-brand-700">
            Privacy
          </a>
          <a href="#" className="text-gray-600 hover:text-brand-700">
            Terms
          </a>
          <a href="#" className="text-gray-600 hover:text-brand-700">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ==========================================================
   Page d'accueil Next.js (Hero + Search + nouvelles sections)
   ---------------------------------------------------------- */
export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("aircraft");
  const [q, setQ] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

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
      startTransition(() => router.push(`/flight/${encodeURIComponent(v)}`));
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
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 backdrop-blur px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live aviation data
            </span>
          </div>

          <h1 className="mt-4 text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight text-gray-900">
            PlaneWise<span className="text-gray-900">.io</span>
          </h1>
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

      <SectionDivider className="my-8 sm:my-10" />

      {/* Showcase */}
      <ShowcaseSection />

      <SectionDivider className="my-8 sm:my-10" />

      {/* Pricing */}
      <PricingSection />
    </main>
  );
}
