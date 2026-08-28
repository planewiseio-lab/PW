import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";

const STORIES = [
  { registration: "F-HTYA", key: "storyFhtya" },
  { registration: "A6-EUA", key: "storyA6eua" },
  { registration: "G-ZBKA", key: "storyGzbka" },
] as const;

export function HomeExplore({ lang }: { lang: Lang }) {
  return (
    <section className="home-explore" aria-label={t(lang, "exploreAria")}>
      <article className="explore-card">
        <h2>{t(lang, "introTitle")}</h2>
        <p>{t(lang, "introBody")}</p>
      </article>
      <article className="explore-card">
        <h2>{t(lang, "tailTitle")}</h2>
        <p>{t(lang, "tailBody")}</p>
      </article>
      <article className="explore-card">
        <h2>{t(lang, "sheetTitle")}</h2>
        <p>{t(lang, "sheetBody")}</p>
      </article>
      <article className="explore-card">
        <h2>{t(lang, "storiesTitle")}</h2>
        <ul className="story-list">
          {STORIES.map((story) => (
            <li key={story.registration}>
              <Link href={`/?q=${encodeURIComponent(story.registration)}`}>
                <span className="story-reg">{story.registration}</span>
                <span className="story-text">{t(lang, story.key)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
