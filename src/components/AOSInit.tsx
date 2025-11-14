"use client";
import { useEffect } from "react";

export default function AOSInit() {
  useEffect(() => {
    // Chargement dynamique d'AOS seulement si nécessaire
    let mounted = true;

    const loadAOS = async () => {
      try {
        const AOS = (await import("aos")).default;
        // CSS import désactivé pour éviter les erreurs de build
        // await import("aos/dist/aos.css");

        if (mounted) {
          (window as any).AOS = AOS;
          AOS.init({ duration: 600, once: true });
        }
      } catch (error) {
        console.warn("AOS loading failed:", error);
      }
    };

    // Charger seulement après un délai pour éviter le blocage du rendu initial
    const timer = setTimeout(loadAOS, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);
  return null;
}
