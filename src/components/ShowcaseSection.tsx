"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// Hook pour détecter mobile et réduire les animations
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

export default function ShowcaseSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [maxCardHeight, setMaxCardHeight] = useState<number | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isMobile = useIsMobile();

  const slides = useMemo(() => {
    return [
      {
        id: "aircraft",
        title: "Aircraft Information",
        subtitle: "Complete aircraft details and specifications",
        description:
          "Search by registration to view detailed aircraft information including specifications, photos, and operator details.",
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
            <>
              {/* Header avec registration et badge */}
              <div className="px-4 pt-6 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900">C-FRSR</h2>
                  <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                    Active
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Last updated 2025-11-03
                </div>
              </div>

              {/* Spécifications en deux colonnes */}
              <div className="px-4 py-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm pb-4">
                {/* Colonne gauche */}
                <dl className="space-y-1.5">
                  <div className="flex justify-between">
                    <dt className="text-gray-700">Type:</dt>
                    <dd className="font-medium text-gray-900 text-right">
                      Boeing 787-9
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-700">Manufacturer:</dt>
                    <dd className="font-medium text-gray-900 text-right">
                      Boeing
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-700">Model:</dt>
                    <dd className="font-medium text-gray-900 text-right">
                      B789
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-700">Model Code:</dt>
                    <dd className="font-medium text-gray-900 text-right">
                      B787-9
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-700">Airline:</dt>
                    <dd className="font-medium text-gray-900 text-right">
                      Air Canada
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-700">Seats:</dt>
                    <dd className="font-medium text-gray-900 text-right">
                      298
                    </dd>
                  </div>
                </dl>
                {/* Colonne droite */}
                <dl className="space-y-1.5">
                  <div className="flex justify-between">
                    <dt className="text-gray-700">Year:</dt>
                    <dd className="font-medium text-gray-900 text-right">
                      2017
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-700">Age:</dt>
                    <dd className="font-medium text-gray-900 text-right">
                      8.5 years
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-700">First Flight:</dt>
                    <dd className="font-medium text-gray-900 text-right">
                      2017-05-01
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-700">Delivery Date:</dt>
                    <dd className="font-medium text-gray-900 text-right">
                      2017-05-12
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-700">Registration Date:</dt>
                    <dd className="font-medium text-gray-900 text-right">
                      2017-05-12
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-700">Engines:</dt>
                    <dd className="font-medium text-gray-900 text-right">
                      2 x Jet
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Grande image de l'avion */}
              <div className="px-4 pt-6 pb-2">
                <div
                  className="relative w-full bg-gray-100 overflow-hidden rounded-lg"
                  style={{
                    aspectRatio: "16/9",
                    minHeight: "200px",
                    maxHeight: "400px",
                  }}
                >
                  <Image
                    src="/Assets/frsr.jpg"
                    alt="C-FRSR"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                    quality={90}
                    loading="lazy"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm z-10">
                    © Helmy oved via Wikimedia Commons
                  </div>
                </div>
              </div>

              {/* Miniatures galerie */}
              <div className="px-4 py-4 border-b border-gray-200 grid grid-cols-4 gap-2">
                <div className="relative w-full aspect-video bg-gray-100 rounded overflow-hidden cursor-pointer hover:opacity-80 transition">
                  <Image
                    src="/Assets/frsr2.jpg"
                    alt="C-FRSR 2"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 25vw, 20vw"
                    quality={85}
                    loading="lazy"
                    style={{ imageRendering: "auto" }}
                  />
                </div>
                <div className="relative w-full aspect-video bg-gray-100 rounded overflow-hidden cursor-pointer hover:opacity-80 transition">
                  <Image
                    src="/Assets/frsr3.jpg"
                    alt="C-FRSR 3"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 25vw, 20vw"
                    quality={85}
                    loading="lazy"
                    style={{ imageRendering: "auto" }}
                  />
                </div>
                <div className="relative w-full aspect-video bg-gray-100 rounded overflow-hidden cursor-pointer hover:opacity-80 transition">
                  <Image
                    src="/Assets/frsr4.jpg"
                    alt="C-FRSR 4"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 25vw, 20vw"
                    quality={85}
                    loading="lazy"
                    style={{ imageRendering: "auto" }}
                  />
                </div>
                <div className="relative w-full aspect-video bg-gray-100 rounded overflow-hidden cursor-pointer hover:opacity-80 transition">
                  <Image
                    src="/Assets/frsr5.jpg"
                    alt="C-FRSR 5"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 25vw, 20vw"
                    quality={85}
                    loading="lazy"
                    style={{ imageRendering: "auto" }}
                  />
                </div>
              </div>
            </>
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 pt-6 pb-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                Flight History
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Aircraft Registration:{" "}
                <span className="text-blue-600 font-semibold">C-FRSR</span>
              </p>
            </div>

            {/* Statistics Cards */}
            <div className="px-4 py-6 grid grid-cols-4 gap-3 border-b border-gray-200">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">15</div>
                <div className="text-xs text-gray-600 mt-1">Total Flights</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">107 678</div>
                <div className="text-xs text-gray-600 mt-1">
                  km Flown (7 days)
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-600">10</div>
                <div className="text-xs text-gray-600 mt-1">Airports</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-600">9</div>
                <div className="text-xs text-gray-600 mt-1">Countries</div>
              </div>
            </div>

            {/* Flight List */}
            <div className="px-4 py-6 space-y-3 flex-1 overflow-y-auto">
              {/* Flight Card 1 */}
              <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      Air Canada AC 800
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Oct 26, 2025
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                    Arrived
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-700 mb-2">
                      Departure
                    </div>
                    <div className="text-blue-600 font-semibold">YYZ</div>
                    <div className="text-xs text-gray-600">Toronto Pearson</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Scheduled: Oct 26, 2025, 07:35 PM EDT
                    </div>
                    <div className="text-xs text-gray-500">Terminal: 1</div>
                    <div className="text-xs text-gray-500">Gate: E77</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700 mb-2">
                      Arrival
                    </div>
                    <div className="text-blue-600 font-semibold">DUB</div>
                    <div className="text-xs text-gray-600">Dublin</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Scheduled: Oct 27, 2025, 02:10 AM EDT
                    </div>
                    <div className="text-xs text-gray-500">Terminal: 1</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-600">
                    Distance: 5276 km
                  </span>
                  <a
                    href="#"
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    View Details <span>→</span>
                  </a>
                </div>
              </div>

              {/* Flight Card 2 */}
              <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      Air Canada AC 801
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Oct 27, 2025
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                    Arrived
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-700 mb-2">
                      Departure
                    </div>
                    <div className="text-blue-600 font-semibold">DUB</div>
                    <div className="text-xs text-gray-600">Dublin</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Scheduled: Oct 27, 2025, 04:00 AM EDT
                    </div>
                    <div className="text-xs text-gray-500">Terminal: 1</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700 mb-2">
                      Arrival
                    </div>
                    <div className="text-blue-600 font-semibold">YYZ</div>
                    <div className="text-xs text-gray-600">Toronto Pearson</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Scheduled: Oct 27, 2025, 11:15 AM EDT
                    </div>
                    <div className="text-xs text-gray-500">Terminal: 1</div>
                    <div className="text-xs text-gray-500">Gate: E76</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-600">
                    Distance: 5276 km
                  </span>
                  <a
                    href="#"
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    View Details <span>→</span>
                  </a>
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
        description:
          "Track any flight in real-time with live status updates, progress tracking, and estimated arrival times.",
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 pt-6 pb-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-blue-600">
                    Air Canada AC 6
                  </h3>
                </div>
                <p className="text-sm text-gray-600 ml-10">
                  Boeing 777 • C-FJZS
                </p>
              </div>
              <div className="text-right flex flex-col items-end justify-end">
                <span className="px-3 py-1.5 bg-blue-100 text-blue-800 border border-blue-200 text-xs rounded-full font-medium">
                  EnRoute
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Last updated 05:20 AM EST
                </p>
              </div>
            </div>

            {/* Progress Bar Section */}
            <div className="px-4 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Departure</p>
                    <p className="text-lg font-bold text-blue-600">NRT</p>
                    <p className="text-xs text-gray-600">Tokyo Narita</p>
                    <p className="text-xs text-gray-500">Tokyo</p>
                  </div>
                </div>
                <div className="flex-1 mx-6 relative">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                      style={{ width: "73%" }}
                    />
                  </div>
                  <div className="absolute top-0 left-0 w-full flex items-center justify-center mt-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">73%</p>
                      <p className="text-xs text-gray-500">ETA: 2h 59m</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Arrival</p>
                    <p className="text-lg font-bold text-blue-600">YUL</p>
                    <p className="text-xs text-gray-600">Montreal Trudeau</p>
                    <p className="text-xs text-gray-500">Montreal</p>
                  </div>
                </div>
              </div>
            </div>

            {/* General Information */}
            <div className="px-4 py-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Aircraft:</span>
                <span className="font-medium text-gray-900">Boeing 777</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Registration:</span>
                <span className="font-medium text-blue-600">C-FJZS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Distance:</span>
                <span className="font-medium text-gray-900">10 354 km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">From:</span>
                <span className="font-medium text-blue-600">
                  NRT — Tokyo Narita
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">To:</span>
                <span className="font-medium text-blue-600">
                  YUL — Montreal Trudeau
                </span>
              </div>
            </div>

            {/* Departure and Arrival Cards */}
            <div className="px-4 py-6 grid grid-cols-2 gap-4">
              {/* Departure Card */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900">Departure</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Scheduled:</span>
                    <p className="font-medium text-gray-900">04:45 AM EST</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Estimated:</span>
                    <p className="font-medium text-blue-600">05:00 AM EST</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Actual:</span>
                    <p className="font-medium text-green-600">05:06 AM EST</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Terminal:</span>
                    <p className="font-medium text-gray-900">1</p>
                  </div>
                </div>
              </div>

              {/* Arrival Card */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900">Arrival</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Scheduled:</span>
                    <p className="font-medium text-gray-900">05:05 PM EST</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Estimated:</span>
                    <p className="font-medium text-blue-600">04:53 PM EST</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Actual:</span>
                    <p className="font-medium text-green-600">04:06 PM EST</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Gate:</span>
                    <p className="font-medium text-gray-900">63</p>
                  </div>
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
        description:
          "View real-time airport boards with current departures, arrivals, gates, and flight status updates.",
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
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden"
            style={{
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
              textRendering: "optimizeLegibility",
              imageRendering: "auto",
            }}
          >
            {/* Header */}
            <div className="px-4 pt-6 pb-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-6 h-6 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      stroke="#178cf2"
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Flight Board
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">at</span>
                      <button
                        className="px-2.5 py-1 text-white text-xs rounded-md font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: "#178cf2" }}
                        aria-label="Select airport location: JFK"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span className="font-bold">JFK</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 hidden sm:inline">
                    20 of 406 flights • Last updated 13:14:49
                  </span>
                  <span className="text-xs text-gray-500 sm:hidden">
                    20 of 406 flights
                  </span>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="flex gap-2">
                  <button
                    className="px-4 py-1.5 text-white text-sm rounded-lg font-medium"
                    style={{ backgroundColor: "#178cf2" }}
                    aria-label="View departures"
                  >
                    Departures
                  </button>
                  <button
                    className="px-4 py-1.5 text-gray-600 text-sm rounded-lg font-medium hover:bg-gray-100 border border-gray-200"
                    aria-label="View arrivals"
                  >
                    Arrivals
                  </button>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search flights, airlines, destinations..."
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={
                    { "--tw-ring-color": "#178cf2" } as React.CSSProperties
                  }
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 0 2px #178cf2`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = "";
                  }}
                  aria-label="Search flights, airlines, destinations"
                />
                <svg
                  className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <button
                className="px-4 py-2 text-white text-sm rounded-lg font-medium"
                style={{ backgroundColor: "#178cf2" }}
                aria-label="Open filters"
              >
                Filters
              </button>
            </div>

            {/* Flight Table */}
            <div
              className="flex-1 overflow-y-auto"
              style={{
                WebkitFontSmoothing: "antialiased",
                MozOsxFontSmoothing: "grayscale",
                textRendering: "optimizeLegibility",
              }}
            >
              <table
                className="w-full text-sm"
                style={{
                  borderCollapse: "separate",
                  borderSpacing: 0,
                }}
              >
                <thead
                  className="bg-gray-50 border-b border-gray-200 sticky top-0"
                  style={{
                    WebkitFontSmoothing: "antialiased",
                    MozOsxFontSmoothing: "grayscale",
                  }}
                >
                  <tr>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">
                      Time
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">
                      Flight
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">
                      Airline
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">
                      To
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">
                      Reg.
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody
                  style={{
                    WebkitFontSmoothing: "antialiased",
                    MozOsxFontSmoothing: "grayscale",
                  }}
                >
                  {[
                    {
                      time: "08:45",
                      flight: "UA 890",
                      airline: "United",
                      to: "SFO",
                      reg: "N456UA",
                      status: "Departed",
                    },
                    {
                      time: "09:29",
                      flight: "B6 883",
                      airline: "JetBlue",
                      to: "MCO",
                      reg: "N3261J",
                      status: "Departed",
                    },
                    {
                      time: "09:45",
                      flight: "DL 1234",
                      airline: "Delta Air Lines",
                      to: "ATL",
                      reg: "N789DL",
                      status: "Departed",
                    },
                    {
                      time: "10:00",
                      flight: "B6 500",
                      airline: "JetBlue",
                      to: "FLL",
                      reg: "N123JB",
                      status: "Departed",
                    },
                    {
                      time: "10:30",
                      flight: "B6 1003",
                      airline: "JetBlue",
                      to: "SJU",
                      reg: "N763JB",
                      status: "Departed",
                    },
                    {
                      time: "10:40",
                      flight: "B6 1269",
                      airline: "JetBlue",
                      to: "PUJ",
                      reg: "N558JB",
                      status: "Departed",
                    },
                    {
                      time: "11:00",
                      flight: "F9 1043",
                      airline: "Frontier",
                      to: "ORD",
                      reg: "N665FR",
                      status: "Departed",
                    },
                    {
                      time: "11:00",
                      flight: "AA 3199",
                      airline: "American",
                      to: "CLT",
                      reg: "N754UW",
                      status: "Departed",
                    },
                    {
                      time: "11:16",
                      flight: "YX 5733",
                      airline: "Republic Airways",
                      to: "BOS",
                      reg: "N219YX",
                      status: "Departed",
                    },
                    {
                      time: "11:16",
                      flight: "DL 5733",
                      airline: "Delta Air Lines",
                      to: "BOS",
                      reg: "N219YX",
                      status: "Departed",
                    },
                    {
                      time: "11:24",
                      flight: "VJA 2",
                      airline: "VJA",
                      to: "BOS",
                      reg: "N302PE",
                      status: "Departed",
                    },
                    {
                      time: "12:00",
                      flight: "KE 82",
                      airline: "Korean Air",
                      to: "ICN",
                      reg: "HL7628",
                      status: "Departed",
                    },
                    {
                      time: "12:15",
                      flight: "AF 83",
                      airline: "Air France",
                      to: "CDG",
                      reg: "F-HPJB",
                      status: "Departed",
                    },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100 hover:bg-gray-50 transition"
                      style={{
                        WebkitFontSmoothing: "antialiased",
                        MozOsxFontSmoothing: "grayscale",
                      }}
                    >
                      <td className="px-4 py-2.5 text-center text-gray-900">
                        {row.time}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <a
                          href="#"
                          className="font-medium hover:opacity-80 transition"
                          style={{ color: "#178cf2" }}
                        >
                          {row.flight}
                        </a>
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-900">
                        {row.airline}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-900">
                        {row.to}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <a
                          href="#"
                          className="font-medium hover:opacity-80 transition"
                          style={{ color: "#178cf2" }}
                        >
                          {row.reg}
                        </a>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ),
      },
    ];
  }, []);

  // Mesurer toutes les cartes après le chargement des images
  useEffect(() => {
    const measureAllCards = () => {
      // Attendre que toutes les refs soient attachées
      const allRefsReady = cardRefs.current.every((ref, index) => {
        return ref !== null || index >= slides.length;
      });

      if (!allRefsReady) {
        // Réessayer après un court délai
        setTimeout(measureAllCards, 100);
        return;
      }

      const heights = cardRefs.current
        .slice(0, slides.length)
        .filter((ref) => ref !== null)
        .map((ref) => {
          if (!ref) return 0;
          // Forcer un reflow pour obtenir la hauteur réelle
          void ref.offsetHeight;
          return ref.offsetHeight || 0;
        });

      if (heights.length > 0 && heights.length === slides.length) {
        const maxHeight = Math.max(...heights);
        console.log(
          "[ShowcaseSection] Max card height measured:",
          maxHeight,
          "from",
          heights
        );
        setMaxCardHeight(maxHeight);
      }
    };

    // Mesurer après le rendu initial
    const timeout1 = setTimeout(measureAllCards, 200);
    // Re-mesurer après le chargement des images
    const timeout2 = setTimeout(measureAllCards, 1500);
    // Re-mesurer une dernière fois pour être sûr
    const timeout3 = setTimeout(measureAllCards, 3000);

    // Re-mesurer lors du redimensionnement
    window.addEventListener("resize", measureAllCards);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      window.removeEventListener("resize", measureAllCards);
    };
  }, [slides]);

  // Auto-rotate slides
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isHovered, slides.length]);

  // Animations réduites sur mobile
  const animationProps = isMobile
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 1 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -50 },
        transition: { duration: 0.5, ease: [0.22, 0.61, 0.36, 1] as const },
      };

  // Calculer la hauteur totale de la section (header + carte max + padding)
  // Le header fait environ 150px, on ajoute 250px de padding
  // Utiliser height au lieu de minHeight pour forcer une hauteur fixe
  const sectionHeight = maxCardHeight
    ? maxCardHeight + 400 // Header (150px) + padding (250px)
    : 1400; // Hauteur par défaut suffisamment grande pour la carte la plus haute

  return (
    <section
      className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
      style={{ height: `${sectionHeight}px`, overflow: "hidden" }}
    >
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
        {/* Slide Container */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="pb-8">
            {/* Cartes cachées pour mesurer toutes les hauteurs - Positionnées hors écran */}
            <div
              className="absolute opacity-0 pointer-events-none"
              style={{
                position: "absolute",
                top: "-9999px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "100%",
                maxWidth: "672px", // max-w-2xl
              }}
            >
              {slides.map((slide, index) => (
                <div
                  key={`measure-${index}`}
                  className="w-full max-w-2xl flex flex-col"
                  ref={(el) => {
                    if (el) {
                      cardRefs.current[index] = el;
                    }
                  }}
                >
                  {slide.preview}
                </div>
              ))}
            </div>

            {/* Carte visible */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                {...animationProps}
                className="flex justify-center w-full"
                style={{
                  willChange: isMobile ? "auto" : "transform, opacity",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "translateZ(0)",
                  WebkitFontSmoothing: "antialiased",
                  MozOsxFontSmoothing: "grayscale",
                }}
              >
                {/* Preview Card - Centré et sans conteneur bleu */}
                <div className="w-full max-w-2xl flex flex-col">
                  {slides[currentSlide].preview}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Arrows - Positionnées sous le texte du header */}
          <button
            onClick={() =>
              setCurrentSlide(
                (prev) => (prev - 1 + slides.length) % slides.length
              )
            }
            className="absolute left-2 min-w-[44px] min-h-[44px] w-11 h-11 bg-white/95 hover:bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-gray-700 hover:text-gray-900 transition opacity-80 hover:opacity-100 z-10"
            aria-label="Previous slide"
            style={{
              top: "250px",
            }}
          >
            ‹
          </button>
          <button
            onClick={() =>
              setCurrentSlide((prev) => (prev + 1) % slides.length)
            }
            className="absolute right-2 min-w-[44px] min-h-[44px] w-11 h-11 bg-white/95 hover:bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-gray-700 hover:text-gray-900 transition opacity-80 hover:opacity-100 z-10"
            aria-label="Next slide"
            style={{
              top: "250px",
            }}
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
              className={`min-w-[44px] min-h-[44px] rounded-full transition flex items-center justify-center ${
                index === currentSlide
                  ? "bg-brand-600 w-8"
                  : "bg-gray-300 hover:bg-gray-400 w-2 h-2"
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentSlide ? "true" : undefined}
            >
              {index === currentSlide && (
                <span className="sr-only">Current slide</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
