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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxSlide, setLightboxSlide] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const isMobile = useIsMobile();

  // Nombre d'images disponibles (ajustez selon vos besoins)
  // Assurez-vous d'avoir Showcase1.png, Showcase2.png, etc. pour PC
  // et Showcase1mob.png, Showcase2mob.png, etc. pour mobile
  const totalSlides = 6; // Changez ce nombre selon le nombre d'images que vous avez

  // Textes explicatifs pour chaque slide
  const slideTexts = [
    {
      title: "Fleet Dashboard",
      description:
        "Track your fleet of aircraft in your dashboard with real-time status updates. Monitor aircraft that are in flight or on ground with live position tracking, flight progress, and arrival information.",
    },
    {
      title: "Aircraft Lookup",
      description:
        "Search by registration to view detailed aircraft information including specifications, photos, operator details, and comprehensive aircraft data.",
    },
    {
      title: "Flight History",
      description:
        "View the 7-day flight history of any aircraft. Track all flights, routes, destinations, and comprehensive historical data for detailed analysis.",
    },
    {
      title: "Flight Details",
      description:
        "View detailed information for any flight including real-time status, departure and arrival times, progress tracking, and estimated arrival times.",
    },
    {
      title: "Airport Board",
      description:
        "View real-time airport boards with current departures and arrivals. Track all flights for any airport with gates, status updates, and flight information.",
    },
  ];

  // Auto-rotate slides
  useEffect(() => {
    if (isHovered || isLightboxOpen) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 5000); // Change toutes les 5 secondes
    return () => clearInterval(interval);
  }, [isHovered, isLightboxOpen, totalSlides]);

  // Gérer ESC pour fermer le lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isLightboxOpen]);

  // Ouvrir le lightbox avec l'image actuelle
  const openLightbox = (slideIndex: number) => {
    setLightboxSlide(slideIndex);
    setZoomLevel(1); // Réinitialiser le zoom
    setIsLightboxOpen(true);
  };

  // Fonctions de zoom
  const zoomIn = () => {
    setZoomLevel((prev) => Math.min(5, prev + 0.5));
  };

  const zoomOut = () => {
    setZoomLevel((prev) => Math.max(1, prev - 0.5));
  };

  // Réinitialiser le zoom et la position quand on change d'image
  useEffect(() => {
    if (isLightboxOpen) {
      setZoomLevel(1);
      setImagePosition({ x: 0, y: 0 });
    }
  }, [lightboxSlide, isLightboxOpen]);

  // Gérer le drag de l'image
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1 && e.button === 0) {
      // Seulement le clic gauche
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Limiter le déplacement pour que l'image ne sorte pas complètement
      const maxOffset = 200; // Ajustez selon vos besoins
      setImagePosition({
        x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
        y: Math.max(-maxOffset, Math.min(maxOffset, newY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Réinitialiser la position quand on change le zoom
  useEffect(() => {
    if (zoomLevel === 1) {
      setImagePosition({ x: 0, y: 0 });
    }
  }, [zoomLevel]);

  // Obtenir le chemin de l'image selon le device
  const getImagePath = (index: number) => {
    const slideNumber = index + 1;
    if (isMobile) {
      return `/Assets/Showcase${slideNumber}mob.png`;
    }
    return `/Assets/Showcase${slideNumber}.png`;
  };

  // Version mobile avec SVG, titres et descriptions
  if (isMobile) {
    return (
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Everything you need to track aviation
          </h2>
          <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
            From aircraft details to real-time flight tracking, access
            comprehensive aviation data in one place.
          </p>
        </div>

        {/* Grille de fonctionnalités mobile */}
        <div className="grid grid-cols-1 gap-6 sm:gap-8">
          {slideTexts.map((slide, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                {/* SVG Icon - Centré verticalement */}
                <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-blue-50 flex items-center justify-center">
                  {index === 0 && (
                    // Fleet Dashboard - Icône dashboard/graphique
                    <svg
                      className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600"
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
                  )}
                  {index === 1 && (
                    // Aircraft Lookup - Icône recherche
                    <svg
                      className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600"
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
                  )}
                  {index === 2 && (
                    // Flight History - Icône horloge/historique
                    <svg
                      className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                  {index === 3 && (
                    // Flight Details - Icône éclair/vitesse
                    <svg
                      className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600"
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
                  )}
                  {index === 4 && (
                    // Airport Board - Icône bâtiment/aéroport
                    <svg
                      className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600"
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
                  )}
                </div>

                {/* Contenu texte */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    {slide.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    {slide.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
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
              maxHeight: isMobile ? "80vh" : "none",
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-white cursor-pointer z-0"
                onClick={() => openLightbox(currentSlide)}
              >
                <Image
                  src={getImagePath(currentSlide)}
                  alt={`Showcase ${currentSlide + 1}`}
                  fill
                  className={`${
                    isMobile ? "object-cover" : "object-contain"
                  } pointer-events-none`}
                  sizes="(max-width: 768px) 100vw, (max-width: 1536px) 1152px, 1152px"
                  priority={currentSlide === 0}
                  quality={95}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
            }}
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
            onClick={(e) => {
              e.stopPropagation();
              setCurrentSlide((prev) => (prev + 1) % totalSlides);
            }}
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

        {/* Dots Indicator - Cliquables pour ouvrir le lightbox */}
        <div className="flex flex-col items-center mt-6 gap-3">
          <div className="flex justify-center gap-2">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentSlide(index);
                  openLightbox(index);
                }}
                className={`min-w-[44px] min-h-[44px] rounded-full transition flex items-center justify-center cursor-pointer ${
                  index === currentSlide
                    ? "bg-[#178cf2] w-8"
                    : "bg-gray-300 hover:bg-gray-400 w-2 h-2"
                }`}
                aria-label={`View slide ${index + 1} in fullscreen`}
                aria-current={index === currentSlide ? "true" : undefined}
              >
                {index === currentSlide && (
                  <span className="sr-only">Current slide</span>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 text-center">
            Click on the image to view in fullscreen
          </p>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsLightboxOpen(false)}
          >
            {/* Image en grand */}
            <div
              className="relative w-full max-w-7xl max-h-[90vh] flex items-center justify-center overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Contrôles zoom - En haut de l'image, centrés */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 pointer-events-auto">
                {/* Bouton zoom out */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    zoomOut();
                  }}
                  disabled={zoomLevel <= 1}
                  className="w-10 h-10 bg-gray-200/80 hover:bg-gray-300/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-gray-700 hover:text-gray-900 transition shadow-md"
                  aria-label="Zoom out"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                    />
                  </svg>
                </button>

                {/* Bouton zoom in */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    zoomIn();
                  }}
                  disabled={zoomLevel >= 5}
                  className="w-10 h-10 bg-gray-200/80 hover:bg-gray-300/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-gray-700 hover:text-gray-900 transition shadow-md"
                  aria-label="Zoom in"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                    />
                  </svg>
                </button>
              </div>

              {/* Bouton fermer - Coin droit */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(false);
                  setZoomLevel(1);
                  setImagePosition({ x: 0, y: 0 });
                }}
                className="absolute top-2 right-2 z-[60] w-10 h-10 bg-gray-200/80 hover:bg-gray-300/90 rounded-full flex items-center justify-center text-gray-700 hover:text-gray-900 transition shadow-md pointer-events-auto"
                aria-label="Close lightbox"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <div
                className="relative w-full h-full"
                style={{ maxHeight: "90vh" }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={lightboxSlide}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                      opacity: 1,
                      scale: zoomLevel,
                      x: imagePosition.x,
                      y: imagePosition.y,
                    }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="relative w-full h-full origin-center"
                    style={{
                      aspectRatio: "16/9",
                      maxHeight: "90vh",
                      cursor:
                        zoomLevel > 1
                          ? isDragging
                            ? "grabbing"
                            : "grab"
                          : "default",
                    }}
                    onMouseDown={handleMouseDown}
                  >
                    <Image
                      src={getImagePath(lightboxSlide)}
                      alt={`Showcase ${lightboxSlide + 1} - ${
                        slideTexts[lightboxSlide]?.title || ""
                      }`}
                      fill
                      className="object-contain"
                      sizes="100vw"
                      quality={100}
                      priority
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Navigation dans le lightbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxSlide(
                      (prev) => (prev - 1 + totalSlides) % totalSlides
                    );
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-gray-200/80 hover:bg-gray-300/90 rounded-full flex items-center justify-center text-gray-700 hover:text-gray-900 transition z-20"
                  aria-label="Previous image"
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxSlide((prev) => (prev + 1) % totalSlides);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-gray-200/80 hover:bg-gray-300/90 rounded-full flex items-center justify-center text-gray-700 hover:text-gray-900 transition z-20"
                  aria-label="Next image"
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
