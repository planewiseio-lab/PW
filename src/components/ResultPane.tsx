import { formatAgeLabel, interpolate, t, type Lang } from "@/lib/i18n";
import { statusTone, translateStatus } from "@/lib/pretty";
import type { AircraftFactSheet, Photo } from "@/lib/types";

type Fact = { label: string; value?: string };

function factsFor(aircraft: AircraftFactSheet, lang: Lang): Fact[] {
  return [
    { label: t(lang, "type"), value: aircraft.type },
    { label: t(lang, "manufacturer"), value: aircraft.manufacturer },
    { label: t(lang, "modelIcao"), value: aircraft.icaoType },
    { label: t(lang, "iata"), value: aircraft.iataType },
    { label: t(lang, "airline"), value: aircraft.operator },
    { label: t(lang, "owner"), value: aircraft.owner },
    {
      label: t(lang, "year"),
      value: aircraft.yearBuilt != null ? String(aircraft.yearBuilt) : undefined,
    },
    {
      label: t(lang, "age"),
      value:
        aircraft.ageYears != null
          ? formatAgeLabel(aircraft.ageYears, lang)
          : undefined,
    },
    { label: t(lang, "delivery"), value: aircraft.deliveryDate },
    { label: t(lang, "msn"), value: aircraft.serial },
    { label: t(lang, "engines"), value: aircraft.engines },
    { label: t(lang, "country"), value: aircraft.country },
    { label: t(lang, "icao24"), value: aircraft.icao24 },
    {
      label: t(lang, "previousRegs"),
      value: aircraft.previousRegistrations?.join(", "),
    },
  ].filter((fact) => Boolean(fact.value));
}

function PhotoBlock({
  photo,
  featured,
  registration,
  lang,
}: {
  photo: Photo;
  featured: boolean;
  registration: string;
  lang: Lang;
}) {
  const credit = `© ${photo.photographer} ${t(lang, "via")} ${photo.sourceName}`;
  return (
    <figure className={featured ? "photo-figure" : "photo-thumb-figure"}>
      <a href={photo.link} className="photo-frame">
        {/* Planespotters ToS: load their URL as-is in the browser, do not proxy. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={interpolate(
            t(lang, featured ? "photoAlt" : "photoAltExtra"),
            { reg: registration },
          )}
          width={photo.width ?? 800}
          height={photo.height ?? 530}
          className={featured ? "photo-main" : "photo-thumb"}
        />
        <span className="photo-credit">{credit}</span>
      </a>
    </figure>
  );
}

export function ResultPane({
  aircraft,
  lang,
}: {
  aircraft: AircraftFactSheet;
  lang: Lang;
}) {
  const facts = factsFor(aircraft, lang);
  const [hero, ...gallery] = aircraft.photos;
  const tone = statusTone(aircraft.status);
  const statusLabel =
    tone === "active"
      ? t(lang, "statusActive")
      : translateStatus(aircraft.status, lang);

  return (
    <article className="result-card">
      <header className="result-head">
        <h1 className="result-reg">{aircraft.registration}</h1>
        {statusLabel ? (
          <span className={tone === "active" ? "status-pill is-active" : "status-pill"}>
            {statusLabel}
          </span>
        ) : null}
      </header>

      <dl className="facts">
        {facts.map((fact) => (
          <div key={fact.label} className="fact">
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>

      {hero ? (
        <div className="photos">
          <PhotoBlock
            photo={hero}
            featured
            registration={aircraft.registration}
            lang={lang}
          />
          {gallery.length > 0 ? (
            <div className="photo-gallery">
              {gallery.slice(0, 6).map((photo) => (
                <PhotoBlock
                  key={photo.url}
                  photo={photo}
                  featured={false}
                  registration={aircraft.registration}
                  lang={lang}
                />
              ))}
            </div>
          ) : null}
          <p className="photo-note">{t(lang, "photoNote")}</p>
        </div>
      ) : (
        <p className="notice">{t(lang, "noPhoto")}</p>
      )}
    </article>
  );
}

export function NotFoundPane({
  registration,
  lang,
}: {
  registration: string;
  lang: Lang;
}) {
  return (
    <div className="notice-card">
      <p>{interpolate(t(lang, "notFound"), { reg: registration })}</p>
    </div>
  );
}

export function InvalidPane({ lang }: { lang: Lang }) {
  return (
    <div className="notice-card">
      <p>{t(lang, "invalid")}</p>
    </div>
  );
}

export function ErrorPane({ lang }: { lang: Lang }) {
  return (
    <div className="notice-card">
      <p>{t(lang, "error")}</p>
    </div>
  );
}

export function ResultSkeleton() {
  return (
    <div className="result-card" aria-hidden="true">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-photo" />
    </div>
  );
}
