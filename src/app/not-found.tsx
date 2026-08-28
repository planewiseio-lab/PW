import { SearchForm } from "@/components/SearchForm";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";

export default async function NotFound() {
  const lang = await getLang();
  return (
    <main className="page is-home">
      <SearchForm lang={lang} />
      <div className="notice-card">
        <p>{t(lang, "pageNotFound")}</p>
      </div>
    </main>
  );
}
