"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LANG_COOKIE, t, type Lang } from "@/lib/i18n";

type Props = { lang: Lang };

function persist(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
  try {
    localStorage.setItem(LANG_COOKIE, lang);
  } catch {
    /* ignore private-mode quota */
  }
}

export function LanguageToggle({ lang }: Props) {
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_COOKIE);
      if ((stored === "fr" || stored === "en") && stored !== lang) {
        persist(stored);
        router.refresh();
      }
    } catch {
      /* ignore */
    }
  }, [lang, router]);

  function choose(next: Lang) {
    if (next === lang) return;
    persist(next);
    document.documentElement.lang = next;
    router.refresh();
  }

  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button
        type="button"
        className={lang === "fr" ? "is-active" : undefined}
        aria-pressed={lang === "fr"}
        aria-label={t(lang, "langFr")}
        onClick={() => choose("fr")}
      >
        FR
      </button>
      <button
        type="button"
        className={lang === "en" ? "is-active" : undefined}
        aria-pressed={lang === "en"}
        aria-label={t(lang, "langEn")}
        onClick={() => choose("en")}
      >
        ENG
      </button>
    </div>
  );
}
