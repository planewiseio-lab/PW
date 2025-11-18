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

    // Charger seulement après le rendu initial pour ne pas bloquer le LCP
    // Utiliser requestIdleCallback si disponible, sinon setTimeout avec délai plus long
    const loadAOSDelayed = () => {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        requestIdleCallback(loadAOS, { timeout: 2000 });
      } else {
        setTimeout(loadAOS, 500);
      }
    };
    
    const timer = setTimeout(loadAOSDelayed, 0);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);
  return null;
}
