import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchForm } from "@/components/SearchForm";
import { ResultSkeleton } from "@/components/ResultPane";
import { SearchResults } from "@/components/SearchResults";
import { HomeExplore } from "@/components/HomeExplore";
import { AdSlot } from "@/components/AdSlot";
import { Logo, Wordmark } from "@/components/Logo";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { normalizeRegistration } from "@/lib/normalize";

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
    return {
      title: "PlaneWise",
      description: t(lang, "tagline"),
    };
  }
  return {
    title: registration,
    description:
      lang === "en"
        ? `Fact sheet for ${registration} — type, age, photo of that airframe. PlaneWise · planewise.io`
        : `Fiche de l’avion ${registration} — type, âge, photo de la cellule. PlaneWise · planewise.io`,
    alternates: { canonical: `/?q=${encodeURIComponent(registration)}` },
    openGraph: {
      title: `${registration} · PlaneWise`,
      url: `https://planewise.io/?q=${encodeURIComponent(registration)}`,
    },
  };
}

export default async function Home({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const lang = await getLang();

  if (query) {
    return (
      <main className="page is-result">
        <SearchForm lang={lang} defaultValue={query} compact />
        <Suspense fallback={<ResultSkeleton />}>
          <SearchResults query={query} lang={lang} />
        </Suspense>
        <AdSlot label={t(lang, "adLabel")} />
      </main>
    );
  }

  return (
    <main className="page is-home">
      <div className="hero">
        <Logo size={112} className="hero-logo" title="" />
        <h1 className="hero-title">
          <Wordmark />
        </h1>
        <p className="lede">{t(lang, "tagline")}</p>
        <SearchForm lang={lang} defaultValue={query} />
      </div>
      <HomeExplore lang={lang} />
      <AdSlot label={t(lang, "adLabel")} />
    </main>
  );
}
