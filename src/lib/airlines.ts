/**
 * Static airline profiles for the /airlines hub pages.
 *
 * Each entry's `name` must match the operator strings in SEED_META
 * character-for-character — that is what links fiches to their airline
 * page. All facts below were verified against public sources (IATA/ICAO
 * listings, airline websites, Wikipedia) on 2026-09-23. No API, no quota:
 * this is a static table baked at build time.
 */
export type Alliance = "Star Alliance" | "SkyTeam" | "oneworld";

export interface AirlineInfo {
  /** Exact operator name as it appears in SEED_META. */
  name: string;
  /** URL slug under /airlines/. */
  slug: string;
  iata: string;
  icao: string;
  callsign: string;
  /** i18n key for the country name (country* keys in lib/i18n.ts). */
  countryKey: MessageKey;
  founded: number;
  alliance: Alliance | null;
  /** e.g. ["Paris (CDG)", "Amsterdam (AMS)"] */
  hubs: string[];
  /**
   * Bare domain, e.g. "airfrance.com". Omitted for defunct airlines
   * (no official site anymore) — pages then skip the website row.
   */
  website?: string;
  /**
   * When true, no logo file is shipped for this airline (e.g. licensing)
   * and UIs must render the ✈ glyph fallback instead of the SVG.
   */
  noLogo?: boolean;
}

export const AIRLINES: AirlineInfo[] = [
  {
    name: "Emirates Airline",
    slug: "emirates-airline",
    iata: "EK",
    icao: "UAE",
    callsign: "EMIRATES",
    countryKey: "countryUAE",
    founded: 1985,
    alliance: null,
    hubs: ["Dubai (DXB)"],
    website: "emirates.com",
  },
  {
    name: "Air France",
    slug: "air-france",
    iata: "AF",
    icao: "AFR",
    callsign: "AIRFRANS",
    countryKey: "countryFrance",
    founded: 1933,
    alliance: "SkyTeam",
    hubs: ["Paris (CDG)", "Paris (ORY)"],
    website: "airfrance.com",
  },
  {
    name: "Turkish Airlines",
    slug: "turkish-airlines",
    iata: "TK",
    icao: "THY",
    callsign: "TURKISH",
    countryKey: "countryTurkey",
    founded: 1933,
    alliance: "Star Alliance",
    hubs: ["Istanbul (IST)"],
    website: "turkishairlines.com",
  },
  {
    name: "Qatar Airways",
    slug: "qatar-airways",
    iata: "QR",
    icao: "QTR",
    callsign: "QATARI",
    countryKey: "countryQatar",
    founded: 1993,
    alliance: "oneworld",
    hubs: ["Doha (DOH)"],
    website: "qatarairways.com",
  },
  {
    name: "Qantas",
    slug: "qantas",
    iata: "QF",
    icao: "QFA",
    callsign: "QANTAS",
    countryKey: "countryAustralia",
    founded: 1920,
    alliance: "oneworld",
    hubs: ["Sydney (SYD)", "Melbourne (MEL)", "Brisbane (BNE)"],
    website: "qantas.com",
  },
  {
    name: "KLM Royal Dutch Airlines",
    slug: "klm-royal-dutch-airlines",
    iata: "KL",
    icao: "KLM",
    callsign: "KLM",
    countryKey: "countryNetherlands",
    founded: 1919,
    alliance: "SkyTeam",
    hubs: ["Amsterdam (AMS)"],
    website: "klm.com",
  },
  {
    name: "Delta Air Lines",
    slug: "delta-air-lines",
    iata: "DL",
    icao: "DAL",
    callsign: "DELTA",
    countryKey: "countryUSA",
    founded: 1924,
    alliance: "SkyTeam",
    hubs: ["Atlanta (ATL)", "Detroit (DTW)", "Minneapolis (MSP)"],
    website: "delta.com",
  },
  {
    name: "Thai Airways International",
    slug: "thai-airways-international",
    iata: "TG",
    icao: "THA",
    callsign: "THAI",
    countryKey: "countryThailand",
    founded: 1960,
    alliance: "Star Alliance",
    hubs: ["Bangkok (BKK)", "Phuket (HKT)"],
    website: "thaiairways.com",
  },
  {
    name: "Swiss International Air Lines",
    slug: "swiss-international-air-lines",
    iata: "LX",
    icao: "SWR",
    callsign: "SWISS",
    countryKey: "countrySwitzerland",
    founded: 2002,
    alliance: "Star Alliance",
    hubs: ["Zurich (ZRH)", "Geneva (GVA)"],
    website: "swiss.com",
  },
  {
    name: "Singapore Airlines",
    slug: "singapore-airlines",
    iata: "SQ",
    icao: "SIA",
    callsign: "SINGAPORE",
    countryKey: "countrySingapore",
    founded: 1947,
    alliance: "Star Alliance",
    hubs: ["Singapore (SIN)"],
    website: "singaporeair.com",
  },
  {
    name: "Malaysia Airlines",
    slug: "malaysia-airlines",
    iata: "MH",
    icao: "MAS",
    callsign: "MALAYSIAN",
    countryKey: "countryMalaysia",
    founded: 1947,
    alliance: "oneworld",
    hubs: ["Kuala Lumpur (KUL)", "Kota Kinabalu (BKI)"],
    website: "malaysiaairlines.com",
    noLogo: true,
  },
  {
    name: "Lufthansa",
    slug: "lufthansa",
    iata: "LH",
    icao: "DLH",
    callsign: "LUFTHANSA",
    countryKey: "countryGermany",
    founded: 1953,
    alliance: "Star Alliance",
    hubs: ["Frankfurt (FRA)", "Munich (MUC)"],
    website: "lufthansa.com",
  },
  {
    name: "LOT Polish Airlines",
    slug: "lot-polish-airlines",
    iata: "LO",
    icao: "LOT",
    callsign: "LOT",
    countryKey: "countryPoland",
    founded: 1928,
    alliance: "Star Alliance",
    hubs: ["Warsaw (WAW)", "Kraków (KRK)"],
    website: "lot.com",
  },
  {
    name: "Gulf Air",
    slug: "gulf-air",
    iata: "GF",
    icao: "GFA",
    callsign: "GULF AIR",
    countryKey: "countryBahrain",
    founded: 1950,
    alliance: null,
    hubs: ["Bahrain (BAH)"],
    website: "gulfair.com",
  },
  {
    name: "Finnair",
    slug: "finnair",
    iata: "AY",
    icao: "FIN",
    callsign: "FINNAIR",
    countryKey: "countryFinland",
    founded: 1923,
    alliance: "oneworld",
    hubs: ["Helsinki (HEL)"],
    website: "finnair.com",
  },
  {
    name: "Etihad Airways",
    slug: "etihad-airways",
    iata: "EY",
    icao: "ETD",
    callsign: "ETIHAD",
    countryKey: "countryUAE",
    founded: 2003,
    alliance: null,
    hubs: ["Abu Dhabi (AUH)"],
    website: "etihad.com",
  },
  {
    name: "EL AL",
    slug: "el-al",
    iata: "LY",
    icao: "ELY",
    callsign: "ELAL",
    countryKey: "countryIsrael",
    founded: 1948,
    alliance: null,
    hubs: ["Tel Aviv (TLV)"],
    website: "elal.com",
  },
  {
    name: "Cathay Pacific Airways",
    slug: "cathay-pacific-airways",
    iata: "CX",
    icao: "CPA",
    callsign: "CATHAY",
    countryKey: "countryHongKong",
    founded: 1946,
    alliance: "oneworld",
    hubs: ["Hong Kong (HKG)"],
    website: "cathaypacific.com",
  },
  {
    name: "British Airways",
    slug: "british-airways",
    iata: "BA",
    icao: "BAW",
    callsign: "SPEEDBIRD",
    countryKey: "countryUK",
    founded: 1974,
    alliance: "oneworld",
    hubs: ["London (LHR)", "London (LGW)"],
    website: "britishairways.com",
  },
  {
    name: "Austrian Airlines",
    slug: "austrian-airlines",
    iata: "OS",
    icao: "AUA",
    callsign: "AUSTRIAN",
    countryKey: "countryAustria",
    founded: 1957,
    alliance: "Star Alliance",
    hubs: ["Vienna (VIE)"],
    website: "austrian.com",
  },
  {
    name: "All Nippon Airways",
    slug: "all-nippon-airways",
    iata: "NH",
    icao: "ANA",
    callsign: "ALL NIPPON",
    countryKey: "countryJapan",
    founded: 1952,
    alliance: "Star Alliance",
    hubs: ["Tokyo (HND)", "Tokyo (NRT)", "Osaka (KIX)"],
    website: "ana.co.jp",
  },
  {
    name: "Air New Zealand",
    slug: "air-new-zealand",
    iata: "NZ",
    icao: "ANZ",
    callsign: "NEW ZEALAND",
    countryKey: "countryNewZealand",
    founded: 1940,
    alliance: "Star Alliance",
    hubs: ["Auckland (AKL)", "Christchurch (CHC)", "Wellington (WLG)"],
    website: "airnewzealand.com",
  },
  {
    name: "Air India",
    slug: "air-india",
    iata: "AI",
    icao: "AIC",
    callsign: "AIRINDIA",
    countryKey: "countryIndia",
    founded: 1932,
    alliance: "Star Alliance",
    hubs: ["Delhi (DEL)", "Mumbai (BOM)", "Bengaluru (BLR)"],
    website: "airindia.com",
  },
  {
    name: "Air Canada",
    slug: "air-canada",
    iata: "AC",
    icao: "ACA",
    callsign: "AIR CANADA",
    countryKey: "countryCanada",
    founded: 1937,
    alliance: "Star Alliance",
    hubs: ["Toronto (YYZ)", "Montreal (YUL)", "Vancouver (YVR)"],
    website: "aircanada.com",
  },
  {
    name: "AeroMexico",
    slug: "aeromexico",
    iata: "AM",
    icao: "AMX",
    callsign: "AEROMEXICO",
    countryKey: "countryMexico",
    founded: 1934,
    alliance: "SkyTeam",
    hubs: ["Mexico City (MEX)", "Guadalajara (GDL)", "Monterrey (MTY)"],
    website: "aeromexico.com",
  },
  {
    name: "Korean Air",
    slug: "korean-air",
    iata: "KE",
    icao: "KAL",
    callsign: "KOREAN AIR",
    countryKey: "countrySouthKorea",
    founded: 1962,
    alliance: "SkyTeam",
    hubs: ["Seoul (ICN)", "Seoul (GMP)"],
    website: "koreanair.com",
  },
  {
    name: "Ethiopian Cargo",
    slug: "ethiopian-cargo",
    iata: "ET",
    icao: "ETH",
    callsign: "ETHIOPIAN",
    countryKey: "countryEthiopia",
    founded: 1945,
    alliance: "Star Alliance",
    hubs: ["Addis Ababa (ADD)", "Liège (LGG)"],
    website: "ethiopianairlines.com",
  },
  {
    name: "Ethiopian Airlines",
    slug: "ethiopian-airlines",
    iata: "ET",
    icao: "ETH",
    callsign: "ETHIOPIAN",
    countryKey: "countryEthiopia",
    founded: 1945,
    alliance: "Star Alliance",
    hubs: ["Addis Ababa (ADD)", "Lomé (LFW)", "Lusaka (LUN)"],
    website: "ethiopianairlines.com",
  },
  {
    name: "Northwest Airlines",
    slug: "northwest-airlines",
    iata: "NW",
    icao: "NWA",
    callsign: "NORTHWEST",
    countryKey: "countryUSA",
    founded: 1926,
    alliance: null,
    hubs: ["Minneapolis (MSP)", "Detroit (DTW)", "Tokyo (NRT)"],
    noLogo: true,
  },
  {
    name: "Scandinavian Airlines",
    slug: "scandinavian-airlines",
    iata: "SK",
    icao: "SAS",
    callsign: "SCANDINAVIAN",
    countryKey: "countryScandinavia",
    founded: 1946,
    alliance: "SkyTeam",
    hubs: ["Copenhagen (CPH)", "Oslo (OSL)", "Stockholm (ARN)"],
    website: "flysas.com",
    noLogo: true,
  },
  {
    name: "Asiana Airlines",
    slug: "asiana-airlines",
    iata: "OZ",
    icao: "AAR",
    callsign: "ASIANA",
    countryKey: "countrySouthKorea",
    founded: 1988,
    alliance: "Star Alliance",
    hubs: ["Seoul (ICN)"],
    website: "flyasiana.com",
    noLogo: true,
  },
];

const bySlug = new Map<string, AirlineInfo>();
const byName = new Map<string, AirlineInfo>();
for (const airline of AIRLINES) {
  bySlug.set(airline.slug, airline);
  byName.set(airline.name, airline);
}

export function airlineBySlug(slug: string): AirlineInfo | undefined {
  return bySlug.get(slug);
}

export function airlineByName(name: string): AirlineInfo | undefined {
  return byName.get(name);
}

export function slugifyAirlineName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

import { SEED_META } from "@/lib/seed";
import type { MessageKey } from "@/lib/i18n";

/** Registrations in SEED_META operated by this airline. */
export function trackedRegistrations(airlineName: string): string[] {
  return SEED_META.filter((m) => m.operator === airlineName).map(
    (m) => m.registration,
  );
}
