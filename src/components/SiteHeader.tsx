import Link from "next/link";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";
import type { Lang } from "@/lib/i18n";

export function SiteHeader({ lang }: { lang: Lang }) {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <Logo size={30} />
        <span>PlaneWise</span>
      </Link>
      <LanguageToggle lang={lang} />
    </header>
  );
}
