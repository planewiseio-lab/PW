"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT } from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdPlacement = "top" | "footer";

/**
 * Manual AdSense unit. Renders nothing until a real ad-unit slot ID is
 * configured — an empty box labeled "Publicité" helps nobody.
 * (Auto Ads, toggled in the AdSense dashboard, needs no slot ID: it only
 * needs the AdSenseScript already in the layout.)
 */
export function AdSlot({
  label,
  placement = "top",
  slotId,
}: {
  label: string;
  variant?: "banner";
  placement?: AdPlacement;
  slotId?: string;
}) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!slotId || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle ??= []).push({});
    } catch {
      /* Ad blockers are fine. */
    }
  }, [slotId]);

  if (!slotId) return null;

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
        data-ad-slot={slotId}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
