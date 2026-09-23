import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";
import { AIRLINES } from "@/lib/airlines";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return pageMeta({
    title: t(lang, "airlinesTitle"),
    description: t(lang, "airlinesIntro"),
    path: "/airlines",
    lang,
  });
}

function AirlineCard({
  index,
  slug,
  name,
  codes,
  country,
  noLogo,
}: {
  index: number;
  slug: string;
  name: string;
  codes: string;
  country: string;
  noLogo?: boolean;
}) {
  return (
    <li className="popular-card">
      <Link
        href={`/airlines/${slug}`}
        style={{ "--i": index } as CSSProperties}
      >
        {noLogo ? (
          <span className="popular-glyph" aria-hidden="true">
            ✈
          </span>
        ) : (
          <img
            className="popular-logo"
            src={`/airlines/${slug}.svg`}
            alt={name}
            loading="lazy"
          />
        )}
        <span className="popular-reg">{name}</span>
        <span className="popular-family">{codes}</span>
        <span className="popular-operator">{country}</span>
      </Link>
    </li>
  );
}

export default async function AirlinesPage() {
  const lang = await getLang();
  const entries = [...AIRLINES].sort((a, b) =>
    a.name.localeCompare(b.name, lang === "fr" ? "fr" : "en"),
  );

  return (
    <main className="page is-home">
      <div className="hero">
        <h1 className="hero-title">{t(lang, "airlinesTitle")}</h1>
        <p className="lede">{t(lang, "airlinesIntro")}</p>
      </div>
      <section aria-label={t(lang, "airlinesTitle")}>
        <ul className="popular-grid">
          {entries.map((airline, i) => (
            <AirlineCard
              key={airline.slug}
              index={i}
              slug={airline.slug}
              name={airline.name}
              codes={`${airline.iata} · ${airline.icao}`}
              country={t(lang, airline.countryKey)}
              noLogo={airline.noLogo}
            />
          ))}
        </ul>
      </section>
    </main>
  );
}
