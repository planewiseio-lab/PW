import { lookupAircraft } from "@/lib/lookup";
import { normalizeRegistration } from "@/lib/normalize";
import type { Lang } from "@/lib/i18n";
import {
  ErrorPane,
  InvalidPane,
  NotFoundPane,
  ResultPane,
} from "@/components/ResultPane";

export async function SearchResults({
  query,
  lang,
}: {
  query: string;
  lang: Lang;
}) {
  const result = await lookupAircraft(query);

  if (result.status === "invalid") return <InvalidPane lang={lang} />;
  if (result.status === "not_found") {
    return (
      <NotFoundPane
        lang={lang}
        registration={normalizeRegistration(query) ?? query.toUpperCase()}
      />
    );
  }
  if (result.status === "error") return <ErrorPane lang={lang} />;
  return <ResultPane aircraft={result.aircraft} lang={lang} />;
}
