import { recordsCompatible, identityText } from "./compat";
import { iataCodeFor } from "./iata";
import {
  normalizeRegistration,
  registrationVariants,
  registrationsMatch,
} from "./normalize";
import {
  ageFromYear,
  formatType,
  parseYearPrefix,
} from "./pretty";
import { airportDataByHex, airportDataPhotos, airportDataProfile } from "./sources/airportData";
import { commonsPhotos } from "./sources/commons";
import { aircraftFromHex, hexFromRegistration } from "./sources/hexdb";
import { planespottersByHex, planespottersByReg } from "./sources/planespotters";
import type { AircraftFactSheet, DataSource, LookupResult, Photo } from "./types";

function settled<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}

function uniquePhotos(photos: Photo[]): Photo[] {
  const seen = new Set<string>();
  const unique: Photo[] = [];
  for (const photo of photos) {
    if (seen.has(photo.url)) continue;
    seen.add(photo.url);
    unique.push(photo);
  }
  return unique;
}

function hasFacts(sheet: AircraftFactSheet): boolean {
  return Boolean(
    sheet.type ||
      sheet.manufacturer ||
      sheet.serial ||
      sheet.operator ||
      sheet.owner ||
      sheet.icaoType ||
      sheet.icao24 ||
      sheet.yearBuilt ||
      sheet.photos.length,
  );
}

export async function lookupAircraft(raw: string): Promise<LookupResult> {
  const registration = normalizeRegistration(raw);
  if (!registration) return { status: "invalid" };

  const variants = registrationVariants(registration);

  try {
    const hex = await hexFromRegistration(variants);

    const [hexdb, airportJson, airportHtml, photosHex, photosReg, photosCommons] =
      await Promise.allSettled([
        hex ? aircraftFromHex(hex) : Promise.resolve(null),
        hex ? airportDataByHex(hex) : Promise.resolve(null),
        airportDataProfile(registration),
        hex ? planespottersByHex(hex) : Promise.resolve([] as Photo[]),
        planespottersByReg(registration),
        commonsPhotos(registration),
      ]);

    const hexdbAircraft = settled(hexdb);
    const airportFromApi = settled(airportJson);
    const airportFromHtml = settled(airportHtml);
    const hexPhotos = settled(photosHex) ?? [];
    const regPhotos = settled(photosReg) ?? [];
    const commons = settled(photosCommons) ?? [];

    const hexdbMatches =
      !hexdbAircraft ||
      registrationsMatch(hexdbAircraft.registration, registration);

    const airportMatchesApi =
      airportFromApi &&
      registrationsMatch(airportFromApi.registration, registration)
        ? airportFromApi
        : null;

    const airportHtmlMatches =
      airportFromHtml &&
      (!airportFromHtml.registration ||
        registrationsMatch(airportFromHtml.registration, registration))
        ? airportFromHtml
        : null;

    const hexdbIdentity = identityText([
      hexdbAircraft?.manufacturer,
      hexdbAircraft?.type,
      hexdbAircraft?.icaoType,
    ]);
    const airportIdentity = identityText([
      airportMatchesApi?.manufacturer,
      airportMatchesApi?.type,
      airportHtmlMatches?.manufacturer,
      airportHtmlMatches?.type,
    ]);

    const sameAirframe =
      !hexdbAircraft ||
      !airportIdentity ||
      recordsCompatible(hexdbIdentity, airportIdentity);

    const sources: DataSource[] = [];
    const sheet: AircraftFactSheet = {
      registration,
      photos: [],
      sources,
    };

    if (hexdbAircraft && hexdbMatches) {
      sheet.manufacturer = hexdbAircraft.manufacturer;
      sheet.type = formatType(
        identityText([hexdbAircraft.manufacturer, hexdbAircraft.type]),
      );
      sheet.icaoType = hexdbAircraft.icaoType;
      sheet.operator = hexdbAircraft.operator;
      sheet.icao24 = hexdbAircraft.modeS;
      sources.push({
        name: "hexdb.io",
        url: `https://hexdb.io/api/v1/aircraft/${hexdbAircraft.modeS}`,
      });
    }

    if (sameAirframe && airportMatchesApi) {
      const parsed = parseYearPrefix(airportMatchesApi.type);
      sheet.yearBuilt = airportMatchesApi.yearBuilt ?? parsed.year;
      sheet.serial = airportMatchesApi.serial;
      sheet.country = airportMatchesApi.country;
      if (!sheet.icao24) sheet.icao24 = airportMatchesApi.icao24;
      if (!sheet.manufacturer) sheet.manufacturer = airportMatchesApi.manufacturer;
      if (airportMatchesApi.type) {
        const pretty = formatType(airportMatchesApi.type);
        if (pretty) sheet.type = pretty;
      }
      sources.push({
        name: "Airport-Data.com",
        url: airportMatchesApi.link,
      });
    }

    if (sameAirframe && airportHtmlMatches) {
      sheet.yearBuilt = sheet.yearBuilt ?? airportHtmlMatches.yearBuilt;
      sheet.serial = sheet.serial ?? airportHtmlMatches.serial;
      sheet.status = airportHtmlMatches.status;
      sheet.owner = airportHtmlMatches.owner;
      sheet.deliveryDate = airportHtmlMatches.deliveryDate;
      sheet.previousRegistrations = airportHtmlMatches.previousRegistrations;
      sheet.engines = airportHtmlMatches.engines;
      if (!sheet.manufacturer) sheet.manufacturer = airportHtmlMatches.manufacturer;
      if (airportHtmlMatches.type) {
        sheet.type = formatType(
          identityText([
            airportHtmlMatches.manufacturer,
            airportHtmlMatches.type,
          ]),
        );
      }
      if (!sheet.icao24) sheet.icao24 = airportHtmlMatches.icao24;
      if (!sources.some((source) => source.name === "Airport-Data.com")) {
        sources.push({
          name: "Airport-Data.com",
          url: `https://airport-data.com/aircraft/${registration}`,
        });
      }
    }

    if (sheet.icaoType) sheet.iataType = iataCodeFor(sheet.icaoType);
    sheet.ageYears = ageFromYear(sheet.yearBuilt);

    if (sheet.owner && sheet.operator && sheet.owner === sheet.operator) {
      sheet.owner = undefined;
    }

    const airportThumbs =
      hex && sameAirframe
        ? await airportDataPhotos(hex, registration).catch(() => [])
        : [];

    // Exact-tail photos only. Commons category and Planespotters-by-hex
    // are the safest; registration search is the fallback.
    sheet.photos = uniquePhotos([
      ...commons,
      ...hexPhotos,
      ...regPhotos,
      ...airportThumbs,
    ]);

    if (sheet.photos.some((photo) => photo.source === "planespotters")) {
      const photo = sheet.photos.find((item) => item.source === "planespotters");
      if (photo) {
        sources.push({ name: "Planespotters.net", url: photo.link });
      }
    }
    if (sheet.photos.some((photo) => photo.source === "commons")) {
      sources.push({
        name: "Wikimedia Commons",
        url: `https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(`${registration} (aircraft)`)}`,
      });
    }

    if (!hasFacts(sheet)) {
      return { status: "not_found", registration };
    }

    return { status: "ok", aircraft: sheet };
  } catch {
    return { status: "error", registration };
  }
}
