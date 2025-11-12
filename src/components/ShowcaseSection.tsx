"use client";

import { useState, useEffect, CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// Hook pour détecter mobile
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
  const isMobile = useIsMobile();

  // Nombre d'images disponibles (ajustez selon vos besoins)
  // Assurez-vous d'avoir Showcase1.png, Showcase2.png, etc. pour PC
  // et Showcase1mob.png, Showcase2mob.png, etc. pour mobile
  const totalSlides = 6; // Changez ce nombre selon le nombre d'images que vous avez

  // Textes explicatifs pour chaque slide
  const slideTexts = [
    {
      title: "Aircraft Information",
      description: "Track your fleet of aircraft in your dashboard with real-time status updates. Monitor aircraft that are in flight with live position tracking and flight progress."
    },
    {
      title: "Fleet Dashboard",
      description: "Monitor your aircraft fleet in your dashboard. View aircraft that are on ground with their current location and arrival information."
    },
    {
      title: "Aircraft Lookup",
      description: "Search by registration to view detailed aircraft information including specifications, photos, operator details, and comprehensive aircraft data."
    },
    {
      title: "Flight History",
      description: "View the 7-day flight history of any aircraft. Track all flights, routes, destinations, and comprehensive historical data for detailed analysis."
    },
    {
      title: "Flight Details",
      description: "View detailed information for any flight including real-time status, departure and arrival times, progress tracking, and estimated arrival times."
    },
    {
      title: "Airport Board",
      description: "View real-time airport boards with current departures and arrivals. Track all flights for any airport with gates, status updates, and flight information."
    }
  ];

  // Auto-rotate slides
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 5000); // Change toutes les 5 secondes
    return () => clearInterval(interval);
  }, [isHovered, totalSlides]);

  // Obtenir le chemin de l'image selon le device
  const getImagePath = (index: number) => {
    const slideNumber = index + 1;
    if (isMobile) {
      return `/Assets/Showcase${slideNumber}mob.png`;
    }
    return `/Assets/Showcase${slideNumber}.png`;
  };

  // Ne pas afficher sur mobile
  if (isMobile) {
    return null;
  }

  return (
    <section className="mx-auto max-w-6xl px-2 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-16 md:py-24">
      <div className="text-center mb-8 sm:mb-12">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
          Everything you need to track aviation
        </h2>
        <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">
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
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-white">
          <div 
            className="relative w-full bg-white" 
            style={{ 
              aspectRatio: isMobile ? "3/4" : "16/9",
              minHeight: isMobile ? "600px" : "auto",
              maxHeight: isMobile ? "80vh" : "none"
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-white"
              >
                <Image
                  src={getImagePath(currentSlide)}
                  alt={`Showcase ${currentSlide + 1}`}
                  fill
                  className={isMobile ? "object-cover" : "object-contain"}
                  style={{
                    imageRendering: "crisp-edges",
                    WebkitImageRendering: "crisp-edges",
                    msImageRendering: "crisp-edges",
                  } as CSSProperties}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
                  priority={currentSlide === 0}
                  quality={100}
                  unoptimized={true}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={() =>
              setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides)
            }
            className={`absolute top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] w-11 h-11 bg-white/95 hover:bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-gray-700 hover:text-gray-900 transition opacity-80 hover:opacity-100 z-10 ${
              isMobile ? "left-2" : "left-4"
            }`}
            aria-label="Previous slide"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={() => setCurrentSlide((prev) => (prev + 1) % totalSlides)}
            className={`absolute top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] w-11 h-11 bg-white/95 hover:bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-gray-700 hover:text-gray-900 transition opacity-80 hover:opacity-100 z-10 ${
              isMobile ? "right-2" : "right-4"
            }`}
            aria-label="Next slide"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Texte explicatif pour le slide actuel - Sous l'image */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-center mt-4 sm:mt-6 px-2 flex items-center justify-center"
            style={{ minHeight: "72px", height: "72px" }}
          >
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto font-medium leading-relaxed">
              {slideTexts[currentSlide]?.description || ""}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Dots Indicator */}
        <div className="flex justify-center mt-6 gap-2">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`min-w-[44px] min-h-[44px] rounded-full transition flex items-center justify-center ${
                index === currentSlide
                  ? "bg-[#178cf2] w-8"
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
