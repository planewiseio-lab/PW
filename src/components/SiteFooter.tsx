import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";

export function SiteFooter({ lang }: { lang: Lang }) {
  return (
    <footer className="site-footer">
      <p className="footer-line">{t(lang, "footerCopyright")}</p>
      <nav className="footer-legal" aria-label={t(lang, "legalTitle")}>
        <Link href="/legal#privacy">{t(lang, "legalPrivacy")}</Link>
        <Link href="/legal#terms">{t(lang, "legalTerms")}</Link>
        <Link href="/legal#cookies">{t(lang, "legalCookies")}</Link>
        <Link href="/contact">{t(lang, "contactTitle")}</Link>
      </nav>
    </footer>
  );
}
