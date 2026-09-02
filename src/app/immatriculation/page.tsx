import type { Metadata } from "next";
import Link from "next/link";
import { ArticleBlockView } from "@/components/ArticleBlocks";
import { JsonLd } from "@/components/JsonLd";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import {
  getImmatriculationPage,
  immatriculationFaqJsonLd,
} from "@/lib/immatriculation";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const page = getImmatriculationPage(lang);
  return pageMeta({
    title: page.title,
    description: page.description,
    path: "/immatriculation",
    lang,
  });
}

export default async function ImmatriculationPage() {
  const lang = await getLang();
  const page = getImmatriculationPage(lang);

  return (
    <main className="page is-legal">
      <JsonLd data={immatriculationFaqJsonLd(page)} />
      <article className="legal">
        <h1>{page.title}</h1>
        <ArticleBlockView block={{ type: "p", text: page.intro }} />
        <nav className="legal-nav" aria-label={page.title}>
          {page.sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.nav}
            </a>
          ))}
          <a href="#faq">{page.faqNav}</a>
        </nav>
        {page.sections.map((section) => (
          <section key={section.id} id={section.id} className="legal-section">
            <h2>{section.title}</h2>
            {section.blocks.map((block, index) => (
              <ArticleBlockView key={`${section.id}-${index}`} block={block} />
            ))}
          </section>
        ))}
        <section id="faq" className="legal-section">
          <h2>{page.faqTitle}</h2>
          {page.faqs.map((faq) => (
            <div key={faq.q}>
              <h3>{faq.q}</h3>
              <ArticleBlockView block={{ type: "p", text: faq.a }} />
            </div>
          ))}
        </section>
        <p className="legal-home">
          <Link href="/">{t(lang, "legalBack")}</Link>
        </p>
      </article>
    </main>
  );
}
