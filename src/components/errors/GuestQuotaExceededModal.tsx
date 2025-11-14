"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  CreditCard,
  Zap,
  Star,
  CheckCircle,
  X,
} from "lucide-react";

/**
 * Format time remaining in seconds to human-readable string
 * @param seconds - Time remaining in seconds
 * @returns Formatted string (e.g., "2h 30m 15s")
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "0s";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export function GuestQuotaExceededModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [guestRemaining, setGuestRemaining] = useState(0);
  const [guestLimit, setGuestLimit] = useState(3); // Default à 3 pour les requêtes générales
  const [guestTtl, setGuestTtl] = useState(0); // TTL en secondes
  const [timeRemaining, setTimeRemaining] = useState(0); // Temps restant en secondes
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Vérifier l'authentification au montage et quand l'état change
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session?.user);
      } catch (error) {
        console.error("[GuestQuotaExceededModal] Error checking auth:", error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    // Écouter les changements d'authentification
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const authenticated = !!session?.user;
      setIsAuthenticated(authenticated);
      // Si l'utilisateur se connecte, fermer le modal s'il est ouvert
      if (authenticated) {
        setIsOpen(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleGuestQuotaExceeded = async (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("[GuestQuotaExceededModal] Event received:", customEvent.detail);
      
      // Vérifier si l'utilisateur est authentifié avant d'afficher le modal
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log("[GuestQuotaExceededModal] User is authenticated, ignoring guest quota exceeded event");
          return; // Ne pas afficher le modal pour les utilisateurs authentifiés
        }
      } catch (error) {
        console.error("[GuestQuotaExceededModal] Error checking auth:", error);
        // En cas d'erreur, continuer (mieux vaut afficher le modal que rien)
      }

      const receivedLimit = customEvent.detail?.guestLimit;
      // Si limit reçu, l'utiliser, sinon default à 3 pour les requêtes générales
      // Si c'est 4, corriger à 3 (probablement une erreur de backend)
      const correctedLimit =
        receivedLimit && receivedLimit !== 4 ? receivedLimit : 3;
      setGuestRemaining(customEvent.detail?.guestRemaining ?? 0);
      setGuestLimit(correctedLimit);
      const ttl = customEvent.detail?.guestTtl ?? customEvent.detail?.ttl ?? 0;
      console.log(
        "[GuestQuotaExceededModal] TTL:",
        ttl,
        "Limit:",
        correctedLimit,
        "Full event detail:",
        customEvent.detail
      );
      setGuestTtl(ttl);
      // Initialiser timeRemaining avec ttl immédiatement
      if (ttl > 0) {
        setTimeRemaining(ttl);
      }
      setIsOpen(true);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener(
      "guestQuotaExceeded",
      handleGuestQuotaExceeded as EventListener
    );
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "guestQuotaExceeded",
        handleGuestQuotaExceeded as EventListener
      );
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isAuthenticated]);

  // Fermer le modal si l'utilisateur se connecte
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      setIsOpen(false);
    }
  }, [isAuthenticated, isOpen]);

  // Mettre à jour le countdown chaque seconde
  useEffect(() => {
    if (!isOpen) return;

    // Initialiser timeRemaining avec guestTtl si nécessaire (au premier render ou si timeRemaining est 0)
    if (timeRemaining <= 0 && guestTtl > 0) {
      setTimeRemaining(guestTtl);
    }

    // Utiliser le temps actuel pour vérifier si on doit démarrer le countdown
    const currentTime =
      timeRemaining > 0 ? timeRemaining : guestTtl > 0 ? guestTtl : 0;
    if (currentTime <= 0) return;

    const countdownInterval = setInterval(() => {
      setTimeRemaining((prev) => {
        const current = prev > 0 ? prev : guestTtl > 0 ? guestTtl : 0;
        if (current <= 0) return 0;
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [isOpen, guestTtl]);

  // Ne pas afficher le modal si l'utilisateur est authentifié
  if (!isOpen || isAuthenticated) {
    return null;
  }

  const handleClose = () => {
    setIsOpen(false);
    // Rediriger vers la page d'accueil avec scroll vers la section pricing
    if (typeof window !== "undefined") {
      // Si on est déjà sur la page d'accueil, juste scroller
      if (window.location.pathname === "/") {
        setTimeout(() => {
          const pricingSection = document.getElementById("pricing");
          if (pricingSection) {
            pricingSection.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }, 100);
      } else {
        // Sinon, rediriger vers la page d'accueil avec le hash
        router.push("/#pricing");
        // Attendre que la page charge et scroller
        setTimeout(() => {
          const pricingSection = document.getElementById("pricing");
          if (pricingSection) {
            pricingSection.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          } else {
            // Si pas trouvé, réessayer après un délai plus long
            setTimeout(() => {
              const pricingSection = document.getElementById("pricing");
              if (pricingSection) {
                pricingSection.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }, 500);
          }
        }, 100);
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Header */}
        <div className="text-center p-4 sm:p-6 md:p-8 border-b border-gray-200">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-orange-100 rounded-full mb-4 sm:mb-6">
            <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-4 px-2">
            Guest Limit Reached
          </h1>
          <p className="text-sm sm:text-base md:text-xl text-gray-600 max-w-2xl mx-auto px-2">
            You've used all your {guestLimit} anonymous requests in the last
            24h. Log in to get 50 credits/month (Free plan)!
          </p>
        </div>

        {/* Current Status */}
        <div className="bg-gray-50 p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Current: Guest Access
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  {guestLimit} requests/24h
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-2xl sm:text-3xl font-bold text-orange-600">
                {guestRemaining}
              </div>
              <div className="text-xs sm:text-sm text-gray-500">requests remaining</div>

              {/* Countdown - juste sous "requests remaining" */}
              {(timeRemaining > 0 || guestTtl > 0) && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <div className="flex items-center sm:justify-end space-x-2">
                    <svg
                      className="w-4 h-4 text-gray-500 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-xs text-gray-600 whitespace-nowrap">
                      Resets in:
                    </span>
                    <span className="text-sm font-bold text-orange-600 whitespace-nowrap">
                      {formatTimeRemaining(
                        timeRemaining > 0
                          ? timeRemaining
                          : guestTtl > 0
                          ? guestTtl
                          : 0
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upgrade Options */}
        <div className="p-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Free Plan */}
            <div className="bg-white border-2 border-blue-200 rounded-xl p-6 hover:border-blue-300 transition-colors relative flex flex-col">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Free</h3>
                <div className="text-3xl font-bold text-blue-600 mb-1">$0</div>
                <div className="text-gray-600 text-sm">/mo</div>
              </div>

              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Aircraft Lookup and history</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Flight history</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Airport information
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Personal fleet max 1 aircraft
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Ads</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 mb-4">
                50 Credits
              </div>

              <Link
                href="/auth?mode=register"
                onClick={handleClose}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Get started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Basic Plan */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors flex flex-col">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                  <Star className="w-6 h-6 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Basic</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  $5.99
                </div>
                <div className="text-gray-600 text-sm">/mo</div>
              </div>

              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Aircraft Lookup and history</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Flight history</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Airport information
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Personal fleet max 5 aircraft
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">No ads</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 mb-4">
                350 Credits
              </div>

              <Link
                href="/checkout?plan=basic"
                onClick={handleClose}
                className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-semibold hover:bg-black transition-colors flex items-center justify-center space-x-2"
              >
                <span>Choose Basic</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-white border-2 border-blue-200 rounded-xl p-6 hover:border-blue-300 transition-colors relative flex flex-col">
              <div className="absolute -top-3 right-4">
                <span className="rounded-full bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 border border-blue-200">
                  Popular
                </span>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="absolute -top-3 left-4 z-10"
              >
                <span className="inline-block px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse shadow-lg">
                  SAVE 23%
                </span>
              </motion.div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Pro</h3>
                <div className="mb-1 relative">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-lg font-medium text-gray-400 line-through relative mb-1"
                  >
                    $12.99
                    <motion.span
                      animate={{
                        scale: [1, 1.05, 1],
                        opacity: [0.5, 0.8, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute left-0 right-0 top-0 bottom-0 bg-gradient-to-r from-transparent via-red-200/30 to-transparent"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-3xl font-bold text-blue-600 mb-1 relative inline-block"
                  >
                    <motion.span
                      animate={{
                        boxShadow: [
                          "0 0 0px rgba(37, 99, 235, 0)",
                          "0 0 20px rgba(37, 99, 235, 0.5)",
                          "0 0 0px rgba(37, 99, 235, 0)",
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute inset-0 rounded-lg blur-sm"
                    />
                    <span className="relative z-10">$9.99</span>
                  </motion.div>
                </div>
                <div className="text-gray-600 text-sm">/mo</div>
              </div>

              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Aircraft Lookup and history</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Flight history</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Airport information
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Personal fleet max 15 aircraft
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">No ads</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 mb-4">
                750 Credits
              </div>

              <Link
                href="/checkout?plan=pro"
                onClick={handleClose}
                className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-semibold hover:bg-black transition-colors flex items-center justify-center space-x-2"
              >
                <span>Choose Pro</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">
                Why create an account?
              </h2>
              <p className="text-xl text-blue-100">
                Unlock the full potential of PlaneWise with our free and premium
                plans
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-4">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">More Requests</h3>
                <p className="text-blue-100">
                  Up to 750 requests per month for unlimited exploration
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-4">
                  <Star className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Advanced Features
                </h3>
                <p className="text-blue-100">Access to all premium features</p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-4">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Priority Support</h3>
                <p className="text-blue-100">
                  Dedicated 24/7 technical assistance
                </p>
              </div>
            </div>
          </div>

          {/* Alternative Actions */}
          <div className="text-center">
            <p className="text-gray-600 mb-6">
              Not ready to create an account? Your guest quota resets in 24
              hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                onClick={handleClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-center"
              >
                Continue as Guest
              </Link>
              <Link
                href="/auth?mode=register"
                onClick={handleClose}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Create Free Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
