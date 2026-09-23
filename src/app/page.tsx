import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchForm } from "@/components/SearchForm";
import { ResultSkeleton } from "@/components/ResultPane";
import { SearchResults } from "@/components/SearchResults";
import { Logo } from "@/components/Logo";
import { JsonLd } from "@/components/JsonLd";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { lookupAircraft } from "@/lib/lookup";
import { normalizeRegistration } from "@/lib/normalize";
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
    </main>
  );
}
