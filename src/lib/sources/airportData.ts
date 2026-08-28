import { fetchJson, fetchText } from "../http";
import type { Photo } from "../types";
import { parseYearPrefix } from "../pretty";
import {
  parseAirportProfileHtml,
  type AirportDataInfo,
} from "./airportDataParse";

export type { AirportDataInfo };
export { parseAirportProfileHtml };

type InfoJson = {
  status?: number;
  error?: string;
  reg?: string;
  model?: string;
  cn?: string;
  country?: string;
  mode_s_code?: string;
  link?: string;
};

type ThumbJson = {
  status?: number;
  data?: Array<{
    image?: string;
    link?: string;
    photographer?: string;
  }>;
};

export async function airportDataByHex(
  hex: string,
): Promise<AirportDataInfo | null> {
  const data = await fetchJson<InfoJson>(
    `https://airport-data.com/api/ac_info.json?m=${encodeURIComponent(hex)}`,
  );
  if (!data || data.status === 404 || data.error || data.status !== 200) {
    return null;
  }
  const registration = data.reg?.trim().toUpperCase();
  if (!registration) return null;
  const { year, rest } = parseYearPrefix(data.model);
  const manufacturer = rest?.split(/\s+/)[0];
  const type = rest;
  const serial = data.cn?.trim();
  return {
    registration,
    manufacturer,
    type,
    yearBuilt: year,
    serial: serial && serial !== "00000" ? serial : undefined,
    country: data.country?.trim(),
    icao24: data.mode_s_code?.trim().toUpperCase(),
    link: data.link || `https://airport-data.com/aircraft/${registration}`,
  };
}

export async function airportDataProfile(
  registration: string,
): Promise<Partial<AirportDataInfo> | null> {
  const result = await fetchText(
    `https://airport-data.com/aircraft/${encodeURIComponent(registration)}`,
  );
  if (!result.ok || !result.body) return null;
  return parseAirportProfileHtml(result.body, registration);
}

export async function airportDataPhotos(
  hex: string,
  registration: string,
): Promise<Photo[]> {
  const data = await fetchJson<ThumbJson>(
    `https://airport-data.com/api/ac_thumb.json?m=${encodeURIComponent(hex)}&n=4&r=${encodeURIComponent(registration)}`,
  );
  if (!data || data.status !== 200 || !Array.isArray(data.data)) return [];
  const photos: Photo[] = [];
  for (const item of data.data) {
    if (!item.image || !item.link) continue;
    photos.push({
      url: item.image,
      link: item.link,
      photographer: item.photographer?.trim() || "Airport-Data.com",
      source: "airport-data",
      sourceName: "Airport-Data.com",
    });
  }
  return photos;
}
