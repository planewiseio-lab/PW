"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";

const variants = {
  initial: { opacity: 0, y: 8, filter: "blur(2px)" },
  enter: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(2px)" },
};

export default function ClientTransition({
  children,
}: {
  children: ReactNode;
}) {
  const key = usePathname() || "/";
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
