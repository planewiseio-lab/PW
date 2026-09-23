import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { pageMeta, SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import {
  AIRLINES,
  airlineBySlug,
  trackedRegistrations,
} from "@/lib/airlines";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return AIRLINES.map((airline) => ({ slug: airline.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const lang = await getLang();
  const airline = airlineBySlug(slug);
  if (!airline) return {};
  const title = `${airline.name} — ${t(lang, "airlinesTitle")}`;
  const description = `${airline.name} (${airline.iata}/${airline.icao}, ${t(lang, airline.countryKey)}) — ${t(lang, "trackedTitle")} : ${trackedRegistrations(airline.name).join(", ")}.`;
  return pageMeta({
    title,
    description,
    path: `/airlines/${airline.slug}`,
    lang,
    absoluteTitle: true,
  });
}

function airlineJsonLd(airline: {
  name: string;
  slug: string;
  iata: string;
  icao: string;
  website?: string;
  founded: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Airline",
    name: airline.name,
    url: `${SITE_URL}/airlines/${airline.slug}`,
    iataCode: airline.iata,
    foundingDate: String(airline.founded),
    ...(airline.website ? { sameAs: [`https://${airline.website}`] } : {}),
  };
}

export default async function AirlinePage({ params }: PageProps) {
  const { slug } = await params;
  const lang = await getLang();
  const airline = airlineBySlug(slug);
  if (!airline) notFound();
  const registrations = trackedRegistrations(airline.name);

  const facts: Array<{ label: string; value: string; href?: string }> = [
    { label: t(lang, "iata"), value: airline.iata },
    { label: t(lang, "icaoCode"), value: airline.icao },
    { label: t(lang, "callsign"), value: airline.callsign },
    { label: t(lang, "country"), value: t(lang, airline.countryKey) },
    { label: t(lang, "founded"), value: String(airline.founded) },
    ...(airline.alliance
      ? [{ label: t(lang, "alliance"), value: airline.alliance }]
      : []),
    { label: t(lang, "hubs"), value: airline.hubs.join(" · ") },
    ...(airline.website
      ? [
          {
            label: t(lang, "website"),
            value: airline.website,
            href: `https://${airline.website}`,
          },
        ]
      : []),
  ];

  return (
    <main className="page is-result">
      <JsonLd data={airlineJsonLd(airline)} />
      <div className="glow-card">
        {airline.noLogo ? (
          <span className="airline-detail-glyph" aria-hidden="true">
            ✈
          </span>
        ) : (
          <img
            className="airline-detail-logo"
            src={`/airlines/${airline.slug}.svg`}
            alt={airline.name}
          />
        )}
        <h1 className="sr-only">{airline.name}</h1>
        <p className="intro-text">
          {t(lang, airline.countryKey)}
          {" — "}
          {airline.iata} · {airline.icao}
        </p>
      </div>
      <section className="specs" aria-label={airline.name}>
        <dl className="facts-col">
          {facts.map((fact) => (
            <div key={fact.label} className="fact">
              <dt>{fact.label}</dt>
              <dd>
                {fact.href ? (
                  <a
                    href={fact.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {fact.value}
                  </a>
                ) : (
                  fact.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-label={t(lang, "trackedTitle")}>
        <h2 className="section-title">{t(lang, "trackedTitle")}</h2>
        <ul className="popular-grid">
          {registrations.map((registration, i) => (
            <li key={registration} className="popular-card">
              <Link
                href={`/${encodeURIComponent(registration)}`}
                style={{ "--i": i } as CSSProperties}
              >
                <span className="popular-reg">{registration}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
