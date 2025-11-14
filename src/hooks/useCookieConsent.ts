"use client";

import { useEffect, useState } from "react";

type CookieConsent = "accepted" | "rejected" | null;

const COOKIE_CONSENT_KEY = "plane-wise-cookie-consent";

export function useCookieConsent(): CookieConsent {
  const [consent, setConsent] = useState<CookieConsent>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedConsent = localStorage.getItem(
        COOKIE_CONSENT_KEY
      ) as CookieConsent;
      setConsent(savedConsent);

      // Écouter les changements de consentement
      const handleConsentChange = (event: Event) => {
        const customEvent = event as CustomEvent;
        setConsent(customEvent.detail);
      };

      window.addEventListener("cookieConsent", handleConsentChange);

      return () => {
        window.removeEventListener("cookieConsent", handleConsentChange);
      };
    }
  }, []);

  return consent;
}

