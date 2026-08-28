import { Logo } from "@/components/Logo";
import { t, type Lang } from "@/lib/i18n";

export function SiteFooter({ lang }: { lang: Lang }) {
  return (
    <footer className="site-footer">
      <p className="footer-brand">
        <Logo size={18} />
        <strong>PlaneWise</strong>
        <span aria-hidden="true">·</span>
        <a href="https://planewise.io">planewise.io</a>
      </p>
      <p>{t(lang, "footer")}</p>
    </footer>
  );
}
