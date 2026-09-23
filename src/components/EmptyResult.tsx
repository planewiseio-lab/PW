import Link from "next/link";
import { interpolate, t, type Lang } from "@/lib/i18n";

const SUGGESTIONS = ["F-HTYA", "G-BOAC", "A6-EUA", "9V-SKQ"];

function RadarVisual() {
  return (
    <div className="empty-radar" aria-hidden="true">
      <svg viewBox="0 0 120 120" className="radar-svg" role="presentation">
        <defs>
          <linearGradient id="radar-sweep-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7a5cff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#1d80e6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="54" className="radar-ring" />
        <circle cx="60" cy="60" r="38" className="radar-ring" />
        <circle cx="60" cy="60" r="22" className="radar-ring" />
        <line x1="60" y1="6" x2="60" y2="114" className="radar-cross" />
        <line x1="6" y1="60" x2="114" y2="60" className="radar-cross" />
        <g className="radar-sweep">
          <path
            d="M60 60 L60 8 A52 52 0 0 1 97 23 Z"
            fill="url(#radar-sweep-grad)"
          />
        </g>
        <circle cx="84" cy="44" r="3.5" className="radar-blip" />
        <circle cx="38" cy="80" r="2.8" className="radar-blip blip-2" />
        <circle cx="60" cy="60" r="3" className="radar-center" />
      </svg>
    </div>
  );
}

export function EmptyResult({
  lang,
  registration,
}: {
  lang: Lang;
  registration?: string;
}) {
  return (
    <div className="empty-wrap">
      <div className="empty-card glow-card">
        <RadarVisual />
        <h1 className="empty-title glow-title">{t(lang, "emptyTitle")}</h1>
        {registration ? (
          <p className="empty-reg">
            {interpolate(t(lang, "emptyFor"), { reg: registration })}
          </p>
        ) : null}
        <p className="empty-hint">{t(lang, "emptyHint")}</p>
        <p className="empty-try">{t(lang, "emptyTry")}</p>
        <ul className="empty-suggestions similar-list">
          {SUGGESTIONS.map((reg) => (
            <li key={reg}>
              <Link href={`/${encodeURIComponent(reg)}`}>{reg}</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
