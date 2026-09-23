"use client";

import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { AIRLINES } from "@/lib/airlines";
import { useAutoScroll } from "./useAutoScroll";

/**
 * Clickable logo carousel of all tracked airlines.
 * Scrolls automatically (pauses on interaction); logos live in
 * /public/airlines/<slug>.svg.
 */
export function AirlineCarousel({ lang }: { lang: Lang }) {
  const trackRef = useAutoScroll<HTMLDivElement>(3500, 340);
  const locale = lang === "fr" ? "fr" : "en";
  const airlines = [...AIRLINES].sort((a, b) =>
    a.name.localeCompare(b.name, locale),
  );

  const scroll = (direction: 1 | -1) => {
    trackRef.current?.scrollBy({ left: direction * 340, behavior: "smooth" });
  };

  return (
    <div className="airline-carousel">
      <div
        className="airline-track"
        ref={trackRef}
        role="region"
        aria-label={t(lang, "airlinesTitle")}
      >
        {airlines.map((airline) => (
          <div key={airline.slug} className="airline-slide">
            <Link href={`/airlines/${airline.slug}`}>
              {airline.noLogo ? (
                <span className="airline-glyph" aria-hidden="true">
                  ✈
                </span>
              ) : (
                <img
                  className="airline-logo"
                  src={`/airlines/${airline.slug}.svg`}
                  alt={airline.name}
                  loading="lazy"
                />
              )}
              <span className="airline-name">{airline.name}</span>
            </Link>
          </div>
        ))}
      </div>
      <div className="carousel-nav">
        <button
          type="button"
          className="carousel-btn"
          onClick={() => scroll(-1)}
          aria-label={t(lang, "carouselPrev")}
        >
          ‹
        </button>
        <button
          type="button"
          className="carousel-btn"
          onClick={() => scroll(1)}
          aria-label={t(lang, "carouselNext")}
        >
          ›
        </button>
      </div>
    </div>
  );
}
