import type { Metadata } from "next";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { getLegalPage, type LegalBlock } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const page = getLegalPage(lang);
  return {
    title: page.title,
    description: page.intro.slice(0, 160),
    alternates: { canonical: "/legal" },
    openGraph: {
      title: page.title,
      url: "https://planewise.io/legal",
      description: page.intro.slice(0, 160),
    },
  };
}

function Block({ block }: { block: LegalBlock }) {
  if (block.type === "h3") return <h3>{block.text}</h3>;
  if (block.type === "ul") {
    return (
      <ul>
        {block.items.map((item) => {
          const url = item.startsWith("http")
            ? item
            : item.includes("https://")
              ? item.slice(item.indexOf("https://"))
              : null;
          if (url && item.includes("https://") && item !== url) {
            const label = item.slice(0, item.indexOf("https://")).trim().replace(/:$/, "");
            return (
              <li key={item}>
                {label ? `${label} : ` : null}
                <a href={url} rel="noopener noreferrer">
                  {url}
                </a>
              </li>
            );
          }
          if (url && item === url) {
            return (
              <li key={item}>
                <a href={url} rel="noopener noreferrer">
                  {url}
                </a>
              </li>
            );
          }
          return <li key={item}>{item}</li>;
        })}
      </ul>
    );
  }
  return <p>{block.text}</p>;
}

export default async function LegalPage() {
  const lang = await getLang();
  const page = getLegalPage(lang);

  return (
    <main className="page is-legal">
      <article className="legal">
        <h1>{page.title}</h1>
        <p className="legal-updated">{page.updated}</p>
        <p>{page.intro}</p>
        <nav className="legal-nav" aria-label={page.title}>
          {page.sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.title}
            </a>
          ))}
        </nav>
        {page.sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="legal-section"
          >
            <h2>{section.title}</h2>
            {section.blocks.map((block, index) => (
              <Block key={`${section.id}-${index}`} block={block} />
            ))}
          </section>
        ))}
        <p className="legal-home">
          <a href="/">{t(lang, "legalBack")}</a>
        </p>
      </article>
    </main>
  );
}
