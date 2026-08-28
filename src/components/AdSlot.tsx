"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT } from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdPlacement = "top" | "footer";

export function AdSlot({
  label,
  placement = "top",
}: {
  label: string;
  variant?: "banner";
  placement?: AdPlacement;
}) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle ??= []).push({});
    } catch {
      /* Ad blockers are fine — keep the reserved banner. */
    }
  }, []);

  return (
    <aside
      className={`ad-slot ad-banner ad-banner-${placement}`}
      data-ad-placement={placement}
      aria-label={label}
    >
      <p className="ad-caption">{label}</p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
        data-ad-slot-name={placement}
      />
    </aside>
  );
}

