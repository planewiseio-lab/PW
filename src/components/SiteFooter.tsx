import { t, type Lang } from "@/lib/i18n";

export function SiteFooter({ lang }: { lang: Lang }) {
  return (
    <footer className="site-footer">
      <p className="footer-line">
        PlaneWise · <a href="https://planewise.io">planewise.io</a>
      </p>
      <p className="footer-sources">{t(lang, "footer")}</p>
    </footer>
  );
}
