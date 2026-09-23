import { Suspense } from "react";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { ResultSkeleton } from "@/components/ResultPane";
import { SearchResults } from "@/components/SearchResults";
import { Logo } from "@/components/Logo";
import { JsonLd } from "@/components/JsonLd";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { lookupAircraft } from "@/lib/lookup";
import { normalizeRegistration } from "@/lib/normalize";
import { SEED_META, SEED_REGISTRATIONS } from "@/lib/seed";
import type { AircraftFamily } from "@/lib/seed";
import {
  fallbackResultSeo,
  homeSeo,
  pageMeta,
  resultSeo,
  websiteJsonLd,
} from "@/lib/seo";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

function familyLabel(family: AircraftFamily): string {
  switch (family) {
    case "concorde":
      return "Concorde";
    case "737":
      return "Boeing 737";
    case "747":
      return "Boeing 747";
    case "767":
      return "Boeing 767";
    case "777":
      return "Boeing 777";
    case "787":
      return "Boeing 787";
    case "a340":
      return "Airbus A340";
    case "a350":
      return "Airbus A350";
    case "a380":
      return "Airbus A380";
  }
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const lang = await getLang();
  const registration = q ? normalizeRegistration(q) : null;
  if (!registration) {
    const home = homeSeo(lang);
    return pageMeta({
      title: home.title,
      description: home.description,
      path: "/",
      lang,
      absoluteTitle: true,
    });
  }

  // Legacy ?q= URLs render the fiche but declare the clean URL as canonical,
  // so search engines consolidate on /F-HTYA.
  const path = `/${encodeURIComponent(registration)}`;
  const result = await lookupAircraft(registration);
  if (result.status === "ok") {
    const seo = resultSeo(result.aircraft, lang);
    return pageMeta({
      title: seo.title,
      description: seo.description,
      path,
      lang,
      absoluteTitle: true,
    });
  }
  const fallback = fallbackResultSeo(registration, lang);
  return pageMeta({
    title: fallback.title,
    description: fallback.description,
    path,
    lang,
    absoluteTitle: true,
  });
}

export default async function Home({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const lang = await getLang();

  if (query) {
    const registration = normalizeRegistration(query);
    return (
      <main className="page is-result">
        <SearchForm lang={lang} defaultValue={registration ?? query} compact />
        <Suspense fallback={<ResultSkeleton />}>
          <SearchResults query={query} lang={lang} />
        </Suspense>
      </main>
    );
  }

  const home = homeSeo(lang);
  const popular = SEED_REGISTRATIONS.slice(0, 12);
  const metaByReg = new Map(SEED_META.map((m) => [m.registration, m]));
  return (
    <main className="page is-home">
      <JsonLd data={websiteJsonLd()} />
      <div className="hero">
        <Logo size={112} className="hero-logo" title="" />
        <h1 className="hero-title">
          PlaneWise.io
          <span className="sr-only"> — {home.h1Extra}</span>
        </h1>
        <p className="lede">{t(lang, "tagline")}</p>
        <SearchForm lang={lang} defaultValue="" />
      </div>
      <section className="home-intro" aria-label={t(lang, "homeIntroTitle")}>
        <div className="glow-card">
          <h2 className="glow-title">
            <span aria-hidden="true" className="glow-title-icon">
              ✈
            </span>{" "}
            {t(lang, "homeIntroTitle")}
          </h2>
          <p className="intro-text">{t(lang, "homeIntro")}</p>
        </div>
      </section>
      <section className="home-popular" aria-label={t(lang, "popularTitle")}>
        <h2 className="section-title">{t(lang, "popularTitle")}</h2>
        <ul className="popular-grid">
          {popular.map((registration, i) => {
            const meta = metaByReg.get(registration);
            return (
              <li key={registration} className="popular-card">
                <Link
                  href={`/${encodeURIComponent(registration)}`}
                  style={{ "--i": i } as CSSProperties}
                >
                  <span className="popular-reg">{registration}</span>
                  {meta && (
                    <span className="popular-family">
                      {familyLabel(meta.family)}
                    </span>
                  )}
                  {meta?.operator ? (
                    <span className="popular-operator">{meta.operator}</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
