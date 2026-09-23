"use client";

import { useEffect, useRef } from "react";

/**
 * Auto-advances a horizontal scroll-snap track, looping back to the start.
 * Pauses while the user interacts (hover / touch / keyboard focus) and
 * stays off entirely for users who prefer reduced motion.
 */
export function useAutoScroll<T extends HTMLElement>(
  intervalMs = 3500,
  step = 340,
) {
  const ref = useRef<T>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const pause = () => {
      pausedRef.current = true;
    };
    const resume = () => {
      pausedRef.current = false;
    };
    el.addEventListener("pointerenter", pause);
    el.addEventListener("pointerleave", resume);
    el.addEventListener("pointerdown", pause);
    el.addEventListener("pointerup", resume);
    el.addEventListener("focusin", pause);
    el.addEventListener("focusout", resume);

    const id = window.setInterval(() => {
      if (pausedRef.current || document.hidden) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      if (el.scrollLeft >= max - 12) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: step, behavior: "smooth" });
      }
    }, intervalMs);

    return () => {
      window.clearInterval(id);
      el.removeEventListener("pointerenter", pause);
      el.removeEventListener("pointerleave", resume);
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("pointerup", resume);
      el.removeEventListener("focusin", pause);
      el.removeEventListener("focusout", resume);
    };
  }, [intervalMs, step]);

  return ref;
}
