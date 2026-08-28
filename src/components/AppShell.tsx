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
  const label = t(lang, "adLabel");
  return (
    <div className="app-shell">
      <SiteHeader lang={lang} />
      <AdSlot variant="banner" label={label} />
      <div className="stage">
        <AdSlot variant="rail" label={label} />
        {children}
        <AdSlot variant="rail" label={label} />
      </div>
      <SiteFooter lang={lang} />
    </div>
  );
}
