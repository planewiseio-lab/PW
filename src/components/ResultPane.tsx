import { formatAgeLabel, interpolate, t, type Lang } from "@/lib/i18n";
import { statusTone, translateStatus } from "@/lib/pretty";
import type { AircraftFactSheet } from "@/lib/types";
import { PhotoGallery } from "@/components/PhotoGallery";
import { JsonLd } from "@/components/JsonLd";
import { aircraftJsonLd } from "@/lib/seo";

type Fact = { label: string; value: string };

function present(label: string, value?: string): Fact | null {
  return value ? { label, value } : null;
}

function columns(aircraft: AircraftFactSheet, lang: Lang): {
  left: Fact[];
  right: Fact[];
} {
  const left = [
    present(t(lang, "type"), aircraft.type),
    present(t(lang, "manufacturer"), aircraft.manufacturer),
    present(t(lang, "modelIcao"), aircraft.icaoType),
    present(t(lang, "iata"), aircraft.iataType),
    present(t(lang, "airline"), aircraft.operator),
    present(t(lang, "owner"), aircraft.owner),
    present(t(lang, "country"), aircraft.country),
  ].filter((fact): fact is Fact => fact !== null);

  const right = [
    present(
      t(lang, "year"),
      aircraft.yearBuilt != null ? String(aircraft.yearBuilt) : undefined,
    ),
    present(
      t(lang, "age"),
      aircraft.ageYears != null
        ? formatAgeLabel(aircraft.ageYears, lang)
        : undefined,
    ),
    present(t(lang, "delivery"), aircraft.deliveryDate),
    present(t(lang, "msn"), aircraft.serial),
    present(t(lang, "engines"), aircraft.engines),
    present(t(lang, "icao24"), aircraft.icao24),
    present(t(lang, "previousRegs"), aircraft.previousRegistrations?.join(", ")),
  ].filter((fact): fact is Fact => fact !== null);

  return { left, right };
}

function FactColumn({ facts }: { facts: Fact[] }) {
  if (!facts.length) return null;
  return (
    <dl className="facts-col">
      {facts.map((fact) => (
        <div key={fact.label} className="fact">
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ResultPane({
  aircraft,
  lang,
}: {
  aircraft: AircraftFactSheet;
  lang: Lang;
}) {
  const { left, right } = columns(aircraft, lang);
  const tone = statusTone(aircraft.status);
  const statusLabel =
    tone === "active"
      ? t(lang, "statusActive")
      : translateStatus(aircraft.status, lang);

  return (
    <article className="result-card">
      <JsonLd data={aircraftJsonLd(aircraft)} />
      <header className="result-head">
        <h1 className="result-reg">{aircraft.registration}</h1>
        {statusLabel ? (
          <span className={tone === "active" ? "status-pill is-active" : "status-pill"}>
            {statusLabel}
          </span>
        ) : null}
      </header>

      <div className="facts">
        <FactColumn facts={left} />
        <FactColumn facts={right} />
      </div>

      {aircraft.photos.length > 0 ? (
        <PhotoGallery
          key={aircraft.registration}
          photos={aircraft.photos.slice(0, 7)}
          registration={aircraft.registration}
          lang={lang}
        />
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
