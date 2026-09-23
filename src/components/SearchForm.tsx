"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { EXAMPLE_REGISTRATIONS } from "@/lib/examples";
import { normalizeRegistration } from "@/lib/normalize";
import { t, type Lang } from "@/lib/i18n";

type SearchFormProps = {
  lang: Lang;
  defaultValue?: string;
  compact?: boolean;
};

export function SearchForm({ lang, defaultValue, compact }: SearchFormProps) {
  const router = useRouter();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const raw = String(data.get("q") ?? "").trim();
    const registration = normalizeRegistration(raw);
    router.push(registration ? `/${encodeURIComponent(registration)}` : "/");
  }

  return (
    <div className={compact ? "search-block is-compact" : "search-block"}>
      <form
        onSubmit={onSubmit}
        role="search"
        className="search-bar"
        key={defaultValue ?? "empty"}
      >
        <label htmlFor="q" className="sr-only">
          {t(lang, "searchAria")}
        </label>
        <span className="search-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
            <path
              d="M16.2 16.2 21 21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <input
          id="q"
          name="q"
          type="search"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={t(lang, "placeholder")}
          defaultValue={defaultValue}
          required
          maxLength={12}
          className="search-input"
        />
        <button type="submit" className="search-button">
          {t(lang, "search")}
        </button>
      </form>
      <ul className="chips">
        {EXAMPLE_REGISTRATIONS.map((example) => (
          <li key={example.registration}>
            <Link
              href={`/${encodeURIComponent(example.registration)}`}
              title={example.hint}
            >
              {example.registration}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
