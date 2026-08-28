import type { Metadata } from "next";
import type { Lang } from "@/lib/i18n";
import type { AircraftFactSheet } from "@/lib/types";

export const SITE_URL = "https://planewise.io";

export function homeSeo(lang: Lang): { title: string; description: string; h1Extra: string } {
  if (lang === "en") {
    return {
      title: "PlaneWise — Aircraft registration & tail number lookup",
      description:
        "Look up an aircraft by registration or tail number: type, specs, age, and a photo of that airframe. Aviation · planewise.io",
      h1Extra: "Aircraft registration lookup by tail number",
    };
  }
  return {
    title: "PlaneWise — Immatriculation d’avion, tail number, aviation",
    description:
      "Recherchez une immatriculation d’avion (tail number) : type, âge et photo de la cellule. Aviation · planewise.io",
    h1Extra: "Recherche d’immatriculation d’avion",
  };
}

export function resultHeadline(aircraft: AircraftFactSheet): string {
  const detail = [aircraft.type, aircraft.operator].filter(Boolean).join(" · ");
  return detail ? `${aircraft.registration} — ${detail}` : aircraft.registration;
}

export function resultSeo(
  aircraft: AircraftFactSheet,
  lang: Lang,
): { title: string; description: string } {
  const headline = resultHeadline(aircraft);
  const type = aircraft.type ?? "";
  if (lang === "en") {
    return {
      title: `${headline} | PlaneWise`,
      description: type
        ? `${aircraft.registration} is a ${type}. Aircraft registration lookup: specs, age, and photo. PlaneWise · planewise.io`
        : `Aircraft registration ${aircraft.registration}: specs, age, and photo of that airframe. PlaneWise · planewise.io`,
    };
  }
  return {
    title: `${headline} | PlaneWise`,
    description: type
      ? `${aircraft.registration} est un ${type}. Fiche d’immatriculation d’avion : type, âge, photo. PlaneWise · planewise.io`
      : `Immatriculation ${aircraft.registration} : fiche, âge et photo de la cellule. PlaneWise · planewise.io`,
  };
}

export function fallbackResultSeo(
  registration: string,
  lang: Lang,
): { title: string; description: string } {
  if (lang === "en") {
    return {
      title: `${registration} | PlaneWise`,
      description: `Look up aircraft registration ${registration}: type, age, and photo. Aviation · planewise.io`,
    };
  }
  return {
    title: `${registration} | PlaneWise`,
    description: `Recherche d’immatriculation ${registration} : type, âge et photo. Aviation · planewise.io`,
  };
}

export function localeFor(lang: Lang): string {
  return lang === "en" ? "en_US" : "fr_FR";
}

export function pageMeta({
  title,
  description,
  path,
  lang,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path: string;
  lang: Lang;
  absoluteTitle?: boolean;
}): Metadata {
  const url = path.startsWith("http") ? path : `${SITE_URL}${path}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: localeFor(lang),
      url,
      siteName: "PlaneWise",
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PlaneWise",
    url: SITE_URL,
    inLanguage: ["fr", "en"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function aircraftJsonLd(aircraft: AircraftFactSheet) {
  const url = `${SITE_URL}/?q=${encodeURIComponent(aircraft.registration)}`;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    additionalType: "https://schema.org/Aircraft",
    name: resultHeadline(aircraft),
    identifier: aircraft.registration,
    url,
  };
  if (aircraft.type) data.model = aircraft.type;
  if (aircraft.manufacturer) {
    data.manufacturer = { "@type": "Organization", name: aircraft.manufacturer };
  }
  if (aircraft.yearBuilt != null) {
    data.productionDate = String(aircraft.yearBuilt);
  }
  if (aircraft.photos[0]?.url) data.image = aircraft.photos[0].url;
  if (aircraft.country) data.countryOfOrigin = aircraft.country;
  const descriptionParts = [
    aircraft.registration,
    aircraft.type,
    aircraft.operator,
  ].filter(Boolean);
  if (descriptionParts.length) data.description = descriptionParts.join(" · ");
  return data;
}
