import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchForm } from "@/components/SearchForm";
import { ResultSkeleton } from "@/components/ResultPane";
import { SearchResults } from "@/components/SearchResults";
import { getLang } from "@/lib/lang";
import { lookupAircraft } from "@/lib/lookup";
import { normalizeRegistration } from "@/lib/normalize";
import { SEED_REGISTRATIONS } from "@/lib/seed";
import {
  fallbackResultSeo,
  pageMeta,
  resultSeo,
} from "@/lib/seo";

type PageProps = {
  params: Promise<{ reg: string }>;
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Re-generate fiches at most once a day (Incremental Static Regeneration). */
export const revalidate = 86400;

/** Pre-render known registrations at build time; others render on demand. */
export async function generateStaticParams() {
  return SEED_REGISTRATIONS.map((registration) => ({
    reg: registration,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { reg } = await params;
  const lang = await getLang();
  const registration = normalizeRegistration(safeDecode(reg));
  if (!registration) return {};

  // Always canonical: /f-htya and /F-HTYA share the same canonical URL.
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

export default async function RegistrationPage({ params }: PageProps) {
  const { reg } = await params;
  const lang = await getLang();
  const registration = normalizeRegistration(safeDecode(reg));

  return (
    <main className="page is-result">
      <SearchForm lang={lang} defaultValue={registration ?? ""} compact />
      <Suspense fallback={<ResultSkeleton />}>
        <SearchResults query={registration ?? safeDecode(reg)} lang={lang} />
      </Suspense>
    </main>
  );
}
