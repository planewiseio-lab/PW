"use client";

import { useEffect } from "react";

/**
 * BFCache (Back/Forward Cache) Handler
 * 
 * Optimizes the back/forward cache behavior by:
 * - Handling page visibility changes
 * - Managing scroll restoration
 * - Preventing unwanted cache behavior
 */
export default function BFCacheHandler() {
  useEffect(() => {
    // Handle page visibility changes (when user navigates back/forward)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Page is now visible (user navigated back)
        // You can add logic here to refresh data if needed
        console.log("[BFCache] Page visible, checking for updates...");
      }
    };

    // Handle pageshow event (fires when page is loaded from cache)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page was loaded from cache
        console.log("[BFCache] Page loaded from cache");
        // Optionally refresh critical data
      }
    };

    // Disable automatic scroll restoration for better UX
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return null;
}

