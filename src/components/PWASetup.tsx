"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa";

export default function PWASetup() {
  useEffect(() => {
    // Enregistrer le Service Worker
    registerServiceWorker();

    // Mesurer les performances de chargement
    if (typeof window !== "undefined") {
      const loadTime = performance.now();
      console.log(`[PWA] Page loaded in ${loadTime.toFixed(2)}ms`);
    }
  }, []);

  return null; // Ce composant ne rend rien visuellement
}





