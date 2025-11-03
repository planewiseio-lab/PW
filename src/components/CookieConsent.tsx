"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

type CookieConsent = "accepted" | "rejected" | null;

const COOKIE_CONSENT_KEY = "plane-wise-cookie-consent";

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [consent, setConsent] = useState<CookieConsent>(null);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà donné son consentement
    if (typeof window !== "undefined") {
      const savedConsent = localStorage.getItem(
        COOKIE_CONSENT_KEY
      ) as CookieConsent;
      if (!savedConsent) {
        // Aucun consentement enregistré, afficher le banner
        setShowBanner(true);
      } else {
        setConsent(savedConsent);
      }
    }
  }, []);

  const handleAccept = () => {
    saveConsent("accepted");
    // Déclencher un événement personnalisé pour notifier le consentement
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cookieConsent", { detail: "accepted" })
      );
    }
  };

  const handleReject = () => {
    saveConsent("rejected");
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cookieConsent", { detail: "rejected" })
      );
    }
  };

  const saveConsent = (value: CookieConsent) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(COOKIE_CONSENT_KEY, value!);
      setConsent(value);
      setShowBanner(false);
    }
  };

  if (!showBanner) {
    return null;
  }

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-50 px-4 py-4 sm:px-6 sm:py-5 bg-white border-t border-gray-200 shadow-lg"
        >
          <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Texte */}
            <div className="flex-1">
              <p className="text-sm text-gray-700 leading-relaxed">
                We use cookies to enhance your browsing experience, serve
                personalized content, and analyze our traffic. By clicking{" "}
                <strong>Accept All</strong>, you consent to our use of
                cookies.{" "}
                <Link
                  href="/privacy"
                  className="text-blue-600 hover:text-blue-700 underline font-medium"
                >
                  Learn more
                </Link>
              </p>
            </div>

            {/* Boutons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 w-full sm:w-auto">
              <button
                onClick={handleReject}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                Reject All
              </button>
              <button
                onClick={handleAccept}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                Accept All
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

