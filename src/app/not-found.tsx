import { SearchForm } from "@/components/SearchForm";
import { EmptyResult } from "@/components/EmptyResult";
import { getLang } from "@/lib/lang";

export default async function NotFound() {
  const lang = await getLang();
  return (
    <main className="page is-home">
      <SearchForm lang={lang} />
      <EmptyResult lang={lang} />
    </main>
  );
}
