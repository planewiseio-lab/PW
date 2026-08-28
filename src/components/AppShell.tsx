import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AdSlot } from "@/components/AdSlot";
import { t, type Lang } from "@/lib/i18n";

export function AppShell({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <SiteHeader lang={lang} />
      <AdSlot key="ad-top" placement="top" variant="banner" label={t(lang, "adLabel")} />
      <div className="app-main">{children}</div>
      <AdSlot key="ad-footer" placement="footer" variant="banner" label={t(lang, "adLabel")} />
      <SiteFooter lang={lang} />
    </div>
  );
}
