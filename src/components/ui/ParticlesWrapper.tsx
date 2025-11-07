"use client";

import dynamic from "next/dynamic";

// Dynamic import avec ssr: false dans un composant client
const ParticlesClient = dynamic(
  () => import("./particles").then((mod) => ({ default: mod.Particles })),
  {
    ssr: false, // Pas de SSR pour les animations canvas
  }
);

interface ParticlesWrapperProps {
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

export default function ParticlesWrapper(props: ParticlesWrapperProps) {
  return <ParticlesClient {...props} />;
}
