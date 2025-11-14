"use client";

import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

// Lazy load framer-motion uniquement sur desktop
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  
  return isMobile;
}

export default function ClientTransition({
  children,
}: {
  children: ReactNode;
}) {
  const key = usePathname() || "/";
  const isMobile = useIsMobile();
  const [motionComponents, setMotionComponents] = useState<{
    AnimatePresence: any;
    motion: any;
  } | null>(null);

  useEffect(() => {
    // Charger framer-motion uniquement sur desktop et après le rendu initial
    if (!isMobile) {
      import("framer-motion").then((fm) => {
        setMotionComponents({
          AnimatePresence: fm.AnimatePresence,
          motion: fm.motion,
        });
      });
    }
  }, [isMobile]);

  // Sur mobile, pas d'animation - retourner directement les enfants
  if (isMobile) {
    return <>{children}</>;
  }

  // Sur desktop, utiliser framer-motion si chargé, sinon retourner les enfants
  if (!motionComponents) {
    return <>{children}</>;
  }

  const { AnimatePresence, motion } = motionComponents;
  
  const variants = {
    initial: { opacity: 0, y: 8, filter: "blur(2px)" },
    enter: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -8, filter: "blur(2px)" },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        variants={variants}
        initial="initial"
        animate="enter"
        exit="exit"
        transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
