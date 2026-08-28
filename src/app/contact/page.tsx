import type { Metadata } from "next";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";

const CONTACT_EMAIL = "info@planewise.io";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: t(lang, "contactTitle"),
    description:
      lang === "en"
        ? `Send emails to ${CONTACT_EMAIL}`
        : `Contactez-nous par email à ${CONTACT_EMAIL}`,
    alternates: { canonical: "/contact" },
    openGraph: {
      title: t(lang, "contactTitle"),
      url: "https://planewise.io/contact",
      description:
        lang === "en"
          ? `Send emails to ${CONTACT_EMAIL}`
          : `Contactez-nous par email à ${CONTACT_EMAIL}`,
    },
  };
}

export default async function ContactPage() {
  const lang = await getLang();
  return (
    <main className="page is-legal">
      <article className="legal">
        <h1>{t(lang, "contactTitle")}</h1>
        <p>
          {t(lang, "contactLead")}{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </article>
    </main>
  );
}
