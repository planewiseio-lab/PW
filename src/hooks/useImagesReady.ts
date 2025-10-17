"use client";
import { useEffect, useState } from "react";

/**
 * Hook React pour précharger des images avec délai minimal.
 */
export function useImagesReady(urls: string[], minDelayMs = 450) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const start = performance.now();

    const loadOne = (url: string) =>
      new Promise<void>((resolve) => {
        if (!url) return resolve();
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
      });

    (async () => {
      try {
        await Promise.all(urls.map(loadOne));
      } finally {
        const elapsed = performance.now() - start;
        const left = Math.max(0, minDelayMs - elapsed);
        setTimeout(() => !cancelled && setReady(true), left);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [urls.join(","), minDelayMs]);

  return ready;
}
