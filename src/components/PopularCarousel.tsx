"use client";

import Link from "next/link";
import { useAutoScroll } from "./useAutoScroll";

export type PopularItem = {
  registration: string;
  /** Short aircraft-type code shown on the ticket stub, e.g. "A350". */
  typeCode: string;
  /** Full aircraft family name, e.g. "Airbus A350". */
  family: string;
  operator: string;
};

/**
 * "Avions populaires" as a modern auto-scrolling carousel of
 * boarding-pass style cards.
 */
export function PopularCarousel({ items }: { items: PopularItem[] }) {
  const trackRef = useAutoScroll<HTMLDivElement>(4000, 300);

  return (
    <div className="popular-carousel">
      <div className="popular-track" ref={trackRef}>
        {items.map((item) => (
          <div key={item.registration} className="popular-slide">
            <Link
              href={`/${encodeURIComponent(item.registration)}`}
              className="bp-card"
            >
              <span className="bp-stub">{item.typeCode}</span>
              <span className="bp-reg">{item.registration}</span>
              <span className="bp-perf" aria-hidden="true" />
              <span className="bp-fields">
                <span className="bp-field">
                  <span className="bp-label">Type</span>
                  <b>{item.family || "—"}</b>
                </span>
                <span className="bp-field">
                  <span className="bp-label">Compagnie</span>
                  <b>{item.operator || "—"}</b>
                </span>
              </span>
              <span className="bp-barcode" aria-hidden="true" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
