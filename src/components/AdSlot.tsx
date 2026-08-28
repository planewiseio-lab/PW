"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT } from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSlot({
  label,
  variant,
}: {
  label: string;
  variant: "banner" | "rail";
}) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle ??= []).push({});
    } catch {
      /* Ad blockers and missing slots are fine — keep the reserved unit. */
    }
  }, []);

  return (
    <aside
      className={variant === "banner" ? "ad-slot ad-banner" : "ad-slot ad-rail"}
      aria-label={label}
    >
      <p className="ad-caption">{label}</p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-format={variant === "banner" ? "horizontal" : "vertical"}
        data-full-width-responsive={variant === "banner" ? "true" : "false"}
      />
    </aside>
  );
}
