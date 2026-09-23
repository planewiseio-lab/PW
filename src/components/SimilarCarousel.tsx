"use client";

import Link from "next/link";
import { airlineByName } from "@/lib/airlines";
import { FAMILY_LABELS } from "@/lib/specs";
import type { SeedMeta } from "@/lib/seed";
import { useAutoScroll } from "./useAutoScroll";

/**
 * "Similar aircraft" as an auto-scrolling card carousel.
 * Each card shows the operator's logo (when it's a tracked airline
 * with a logo file), the registration, the aircraft family and the
 * operator name. Airlines flagged `noLogo` (e.g. licensing) render
 * the ✈ glyph fallback instead of a broken image.
 */
export function SimilarCarousel({ items }: { items: SeedMeta[] }) {
  const trackRef = useAutoScroll<HTMLDivElement>(4000, 300);

  return (
    <div className="similar-carousel">
      <div className="similar-track" ref={trackRef}>
        {items.map((s) => {
          const airline = airlineByName(s.operator);
          const logo =
            airline && !airline.noLogo
              ? `/airlines/${airline.slug}.svg`
              : null;
          return (
            <div key={s.registration} className="similar-slide">
              <Link href={`/${encodeURIComponent(s.registration)}`}>
                {logo ? (
                  <img
                    className="similar-logo"
                    src={logo}
                    alt={s.operator}
                    loading="lazy"
                  />
                ) : (
                  <span className="similar-glyph" aria-hidden="true">
                    ✈
                  </span>
                )}
                <span className="similar-reg">{s.registration}</span>
                <span className="similar-family">{FAMILY_LABELS[s.family]}</span>
                <span className="similar-operator">{s.operator}</span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
