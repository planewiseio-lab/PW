"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CreditCard,
  Zap,
  Star,
  CheckCircle,
  X,
} from "lucide-react";

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

export function FreeCreditsExceededModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState(0);
  const [freeUserTtl, setFreeUserTtl] = useState(0); // TTL en secondes
  const [timeRemaining, setTimeRemaining] = useState(0); // Temps restant en secondes

  useEffect(() => {
    const handleCreditsExceeded = (event: CustomEvent) => {
      console.log(
        "[FreeCreditsExceededModal] Event received:",
        event.detail
      );
      const ttl = event.detail?.freeUserTtl ?? event.detail?.ttl ?? 0;
      console.log(
        "[FreeCreditsExceededModal] TTL:",
        ttl,
        "Full event detail:",
        event.detail
      );
      setCreditsRemaining(
        event.detail?.creditsRemaining ?? event.detail?.freeUserRemaining ?? 0
      );
      setFreeUserTtl(ttl);
      // Initialiser timeRemaining avec ttl immédiatement
      if (ttl > 0) {
        setTimeRemaining(ttl);
      }
      console.log(
        "[FreeCreditsExceededModal] States set - freeUserTtl:",
        ttl,
        "timeRemaining:",
        ttl
      );
      setIsOpen(true);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener(
      "freeCreditsExceeded",
      handleCreditsExceeded as EventListener
    );
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "freeCreditsExceeded",
        handleCreditsExceeded as EventListener
      );
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Mettre à jour le countdown chaque seconde
  useEffect(() => {
    if (!isOpen) return;

    // Initialiser timeRemaining avec freeUserTtl si nécessaire (au premier render ou si timeRemaining est 0)
    if (timeRemaining <= 0 && freeUserTtl > 0) {
      setTimeRemaining(freeUserTtl);
    }

    // Utiliser le temps actuel pour vérifier si on doit démarrer le countdown
    const currentTime =
      timeRemaining > 0 ? timeRemaining : freeUserTtl > 0 ? freeUserTtl : 0;
    if (currentTime <= 0) return;

    const countdownInterval = setInterval(() => {
      setTimeRemaining((prev) => {
        const current = prev > 0 ? prev : freeUserTtl > 0 ? freeUserTtl : 0;
        if (current <= 0) return 0;
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [isOpen, freeUserTtl]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
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
        <div className="text-center p-8 border-b border-gray-200">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-full mb-6">
            <Zap className="w-10 h-10 text-orange-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Daily Credits Exhausted
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            You've used all your 5 daily credits. Upgrade to Pro plan for 500
            monthly credits and unlimited access!
          </p>
        </div>

        {/* Current Status */}
        <div className="bg-gray-50 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Current Plan: Free
                </h3>
                <p className="text-gray-600">
                  5 requests per day • Daily renewal
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-red-600">0</div>
              <div className="text-sm text-gray-500">credits remaining</div>

              {/* Countdown - juste sous "credits remaining" */}
              {(timeRemaining > 0 || freeUserTtl > 0) && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <div className="flex items-center justify-end space-x-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-gray-600">
                      Quota resets in:
                    </span>
                    <span className="text-sm font-bold text-orange-600">
                      {formatTimeRemaining(
                        timeRemaining > 0
                          ? timeRemaining
                          : freeUserTtl > 0
                          ? freeUserTtl
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
            {/* Free Plan (Current) */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 flex flex-col">
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
                  <span className="text-sm text-gray-700">Aircraft lookup</span>
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
                    Basic specs & photos
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Community support
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Ads</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 mb-4">
                5 requests per day
              </div>

              <div className="w-full bg-gray-300 text-gray-500 py-3 px-4 rounded-lg font-semibold flex items-center justify-center space-x-2 cursor-not-allowed">
                <span>Current Plan</span>
              </div>
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
                  <span className="text-sm text-gray-700">Aircraft lookup</span>
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
                    Basic specs & photos
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Community support
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Ads</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 mb-4">
                350 credits per month
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
                  <span className="text-sm text-gray-700">Aircraft lookup</span>
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
                    Basic specs & photos
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Community support
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Priority processing
                  </span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 mb-4">
                750 requests per month
              </div>

              <Link
                href="/checkout?plan=pro"
                onClick={handleClose}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Choose Pro</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
            <h3 className="text-2xl font-bold mb-4 text-center">
              Why Upgrade to Pro?
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-3">
                  <Zap className="w-6 h-6" />
                </div>
                <h4 className="font-semibold mb-2">More Credits</h4>
                <p className="text-sm opacity-90">
                  From 5 daily to 350 or 750 monthly credits
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-3">
                  <Star className="w-6 h-6" />
                </div>
                <h4 className="font-semibold mb-2">Priority Processing</h4>
                <p className="text-sm opacity-90">
                  Faster response times for all requests
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-3">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h4 className="font-semibold mb-2">No Daily Limits</h4>
                <p className="text-sm opacity-90">
                  Use all credits whenever you need
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="text-center">
            <p className="text-gray-600 mb-6">
              Your credits will reset tomorrow. Upgrade now for unlimited
              access!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                onClick={handleClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-center"
              >
                Wait for Tomorrow
              </Link>
              <Link
                href="/checkout?plan=pro"
                onClick={handleClose}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Upgrade to Pro</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

