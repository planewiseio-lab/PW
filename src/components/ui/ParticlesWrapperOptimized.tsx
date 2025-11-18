"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamic import avec ssr: false dans un composant client
const ParticlesClient = dynamic(
  () => import("./particles").then((mod) => ({ default: mod.Particles })),
  {
    ssr: false, // Pas de SSR pour les animations canvas
  }
);

interface ParticlesWrapperOptimizedProps {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  refresh?: boolean;
  color?: string;
  vx?: number;
  vy?: number;
}

export default function ParticlesWrapperOptimized(props: ParticlesWrapperOptimizedProps) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Détecter si on est sur mobile
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Ne charger les particules que sur desktop et après le rendu initial
      if (!mobile) {
        // Utiliser requestIdleCallback si disponible, sinon setTimeout
        if ("requestIdleCallback" in window) {
          (window as any).requestIdleCallback(() => {
            setShouldLoad(true);
          });
        } else {
          setTimeout(() => {
            setShouldLoad(true);
          }, 1000);
        }
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Ne pas charger sur mobile
  if (isMobile || !shouldLoad) {
    return null;
  }

  return <ParticlesClient {...props} />;
}

