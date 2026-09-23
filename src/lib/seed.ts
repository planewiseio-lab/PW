/**
 * Seed registrations for the sitemap and build-time static generation.
 *
 * Only registrations verified to resolve to a real aircraft fiche belong
 * here — every sitemap URL must return a 200 with content, otherwise it
 * hurts indexing instead of helping it. All entries below were verified
 * against the live lookup on 2026-09-22/23.
 *
 * Grow this list over time from Google Search Console: check which
 * registrations people search for ("Performance > Search results") and
 * add the ones that resolve.
 */
export const SEED_REGISTRATIONS = [
  // Homepage examples
  "F-HTYA",
  "A6-EUA",
  "G-ZBKA",
  "PH-BHA",
  "D-AIXA",
  "VH-OQA",
  // Verified popular airframes
  "G-BOAC",
  "F-BVFA",
  "D-ABYT",
  "A7-APA",
  "9V-SKQ",
  "JA873A",
  "N172DZ",
  "G-STBA",
  "F-HPJA",
  "4X-EDB",
  "A9C-FA",
  "HS-TQB",
  "9M-MAC",
  "B-LXI",
  "A6-BLA",
  "TC-LLB",
  "ET-AUP",
  "JA898A",
  "HL7644",
  "N661US",
  "D-ABVD",
  "G-BYGC",
  "A6-EOB",
  "A7-ALW",
  "9V-SKW",
  "HB-JNA",
  "LN-RKP",
  "OE-LPA",
  "OH-LWA",
  "OY-KBM",
  "PH-BXA",
  "SP-LRA",
  "TC-JJN",
  "VH-OQJ",
  "VT-ANB",
  "XA-ADL",
  "ZK-OKQ",
  "N501DN",
  "C-GHPQ",
  "F-GSPD",
  // Batch 2 — verified 2026-09-23
  "F-GZNQ",
  "F-GZNT",
  "A6-EOA",
  "A6-EOU",
  "G-BYGA",
  "G-CIVY",
  "D-AIGA",
  "VH-OQB",
  "9V-SKA",
  "JA789A",
  "HL7418",
  "TC-JJP",
  "A7-ALZ",
  "PH-BVA",
  "HB-JNB",
  "OE-LPE",
  "OH-LWB",
  "SP-LRB",
  "C-FNNQ",
  "N171DZ",
  "ZK-OKR",
  "VT-AND",
  "XA-ADG",
  "B-LXM",
  "9M-MAD",
  "ET-AVT",
  "A6-BLC",
  "HS-TQC",
  "4X-EDC",
  "A9C-FB",
] as const;

export type AircraftFamily =
  | "concorde"
  | "737"
  | "747"
  | "767"
  | "777"
  | "787"
  | "a340"
  | "a350"
  | "a380";

/** Normalize a free-form type string ("Boeing 787-9 Dreamliner") to a family. */
export function familyOf(type: string | undefined): AircraftFamily | null {
  if (!type) return null;
  const t = type.toLowerCase();
  if (t.includes("concorde")) return "concorde";
  if (t.includes("737")) return "737";
  if (t.includes("747")) return "747";
  if (t.includes("767")) return "767";
  if (t.includes("777")) return "777";
  if (t.includes("787")) return "787";
  if (t.includes("340")) return "a340";
  if (t.includes("350")) return "a350";
  if (t.includes("380")) return "a380";
  return null;
}

export type SeedMeta = {
  registration: string;
  family: AircraftFamily;
  /** Operator as returned by the lookup ("" when unknown). */
  operator: string;
  /**
   * Build year when known — baked in by scripts/bake-seed-years.ts from the
   * live lookup. Used only for family age statistics; entries without a
   * year are excluded from the average.
   */
  yearBuilt?: number;
};

/** Metadata for similarity matching ("similar airframes" on fiches). */
export const SEED_META: SeedMeta[] = [
  { registration: "F-HTYA", family: "a350", operator: "Air France", yearBuilt: 2019 },
  { registration: "A6-EUA", family: "a380", operator: "Emirates Airline", yearBuilt: 2016 },
  { registration: "G-ZBKA", family: "787", operator: "British Airways", yearBuilt: 2015 },
  { registration: "PH-BHA", family: "787", operator: "KLM Royal Dutch Airlines", yearBuilt: 2015 },
  { registration: "D-AIXA", family: "a350", operator: "Lufthansa", yearBuilt: 2016 },
  { registration: "VH-OQA", family: "a380", operator: "Qantas", yearBuilt: 2008 },
  { registration: "G-BOAC", family: "concorde", operator: "", yearBuilt: 1975 },
  { registration: "F-BVFA", family: "concorde", operator: "", yearBuilt: 1976 },
  { registration: "D-ABYT", family: "747", operator: "Lufthansa", yearBuilt: 2015 },
  { registration: "A7-APA", family: "a380", operator: "Qatar Airways", yearBuilt: 2013 },
  { registration: "9V-SKQ", family: "a380", operator: "Singapore Airlines", yearBuilt: 2011 },
  { registration: "JA873A", family: "787", operator: "All Nippon Airways", yearBuilt: 2015 },
  { registration: "N172DZ", family: "767", operator: "Delta Air Lines", yearBuilt: 1998 },
  { registration: "G-STBA", family: "777", operator: "British Airways", yearBuilt: 2010 },
  { registration: "F-HPJA", family: "a380", operator: "", yearBuilt: 2010 },
  { registration: "4X-EDB", family: "787", operator: "EL AL", yearBuilt: 2017 },
  { registration: "A9C-FA", family: "787", operator: "Gulf Air", yearBuilt: 2018 },
  { registration: "HS-TQB", family: "787", operator: "Thai Airways International", yearBuilt: 2014 },
  { registration: "9M-MAC", family: "a350", operator: "Malaysia Airlines", yearBuilt: 2017 },
  { registration: "B-LXI", family: "a350", operator: "Cathay Pacific Airways", yearBuilt: 2019 },
  { registration: "A6-BLA", family: "787", operator: "Etihad Airways", yearBuilt: 2014 },
  { registration: "TC-LLB", family: "787", operator: "Turkish Airlines", yearBuilt: 2019 },
  { registration: "ET-AUP", family: "787", operator: "Ethiopian Airlines", yearBuilt: 2017 },
  { registration: "JA898A", family: "787", operator: "All Nippon Airways", yearBuilt: 2018 },
  { registration: "HL7644", family: "747", operator: "Korean Air", yearBuilt: 2017 },
  { registration: "N661US", family: "747", operator: "", yearBuilt: 1989 },
  { registration: "D-ABVD", family: "747", operator: "", yearBuilt: 1990 },
  { registration: "G-BYGC", family: "747", operator: "", yearBuilt: 1999 },
  { registration: "A6-EOB", family: "a380", operator: "Emirates Airline", yearBuilt: 2014 },
  { registration: "A7-ALW", family: "a350", operator: "Qatar Airways", yearBuilt: 2017 },
  { registration: "9V-SKW", family: "a380", operator: "Singapore Airlines", yearBuilt: 2017 },
  { registration: "HB-JNA", family: "777", operator: "Swiss International Air Lines", yearBuilt: 2015 },
  { registration: "LN-RKP", family: "a340", operator: "", yearBuilt: 1997 },
  { registration: "OE-LPA", family: "777", operator: "Austrian Airlines", yearBuilt: 1997 },
  { registration: "OH-LWA", family: "a350", operator: "Finnair", yearBuilt: 2015 },
  { registration: "OY-KBM", family: "a340", operator: "", yearBuilt: 2002 },
  { registration: "PH-BXA", family: "737", operator: "KLM Royal Dutch Airlines", yearBuilt: 1998 },
  { registration: "SP-LRA", family: "787", operator: "LOT Polish Airlines", yearBuilt: 2012 },
  { registration: "TC-JJN", family: "777", operator: "Turkish Airlines", yearBuilt: 2011 },
  { registration: "VH-OQJ", family: "a380", operator: "Qantas", yearBuilt: 2010 },
  { registration: "VT-ANB", family: "787", operator: "Air India", yearBuilt: 2011 },
  { registration: "XA-ADL", family: "787", operator: "AeroMexico", yearBuilt: 2016 },
  { registration: "ZK-OKQ", family: "777", operator: "Air New Zealand", yearBuilt: 2011 },
  { registration: "N501DN", family: "a350", operator: "Delta Air Lines", yearBuilt: 2017 },
  { registration: "C-GHPQ", family: "787", operator: "Air Canada", yearBuilt: 2014 },
  { registration: "F-GSPD", family: "777", operator: "Air France", yearBuilt: 1998 },
  { registration: "F-GZNQ", family: "777", operator: "Air France", yearBuilt: 2015 },
  { registration: "F-GZNT", family: "777", operator: "Air France", yearBuilt: 2016 },
  { registration: "A6-EOA", family: "a380", operator: "Emirates Airline", yearBuilt: 2014 },
  { registration: "A6-EOU", family: "a380", operator: "Emirates Airline", yearBuilt: 2015 },
  { registration: "G-BYGA", family: "747", operator: "", yearBuilt: 1998 },
  { registration: "G-CIVY", family: "747", operator: "", yearBuilt: 1998 },
  { registration: "D-AIGA", family: "a340", operator: "", yearBuilt: 1993 },
  { registration: "VH-OQB", family: "a380", operator: "Qantas", yearBuilt: 2008 },
  { registration: "9V-SKA", family: "a380", operator: "", yearBuilt: 2007 },
  { registration: "JA789A", family: "777", operator: "", yearBuilt: 2010 },
  { registration: "HL7418", family: "747", operator: "", yearBuilt: 1994 },
  { registration: "TC-JJP", family: "777", operator: "Turkish Airlines", yearBuilt: 2011 },
  { registration: "A7-ALZ", family: "a350", operator: "Qatar Airways", yearBuilt: 2018 },
  { registration: "PH-BVA", family: "777", operator: "KLM Royal Dutch Airlines", yearBuilt: 2008 },
  { registration: "HB-JNB", family: "777", operator: "Swiss International Air Lines", yearBuilt: 2016 },
  { registration: "OE-LPE", family: "777", operator: "Austrian Airlines", yearBuilt: 1998 },
  { registration: "OH-LWB", family: "a350", operator: "Finnair", yearBuilt: 2015 },
  { registration: "SP-LRB", family: "787", operator: "LOT Polish Airlines", yearBuilt: 2012 },
  { registration: "C-FNNQ", family: "777", operator: "Air Canada", yearBuilt: 2013 },
  { registration: "N171DZ", family: "767", operator: "Delta Air Lines", yearBuilt: 1998 },
  { registration: "ZK-OKR", family: "777", operator: "Air New Zealand", yearBuilt: 2014 },
  { registration: "VT-AND", family: "787", operator: "Air India", yearBuilt: 2011 },
  { registration: "XA-ADG", family: "787", operator: "AeroMexico", yearBuilt: 2017 },
  { registration: "B-LXM", family: "a350", operator: "Cathay Pacific Airways", yearBuilt: 2020 },
  { registration: "9M-MAD", family: "a350", operator: "Malaysia Airlines", yearBuilt: 2018 },
  { registration: "ET-AVT", family: "777", operator: "Ethiopian Cargo", yearBuilt: 2018 },
  { registration: "A6-BLC", family: "787", operator: "Etihad Airways", yearBuilt: 2015 },
  { registration: "HS-TQC", family: "787", operator: "Thai Airways International", yearBuilt: 2014 },
  { registration: "4X-EDC", family: "787", operator: "EL AL", yearBuilt: 2018 },
  { registration: "A9C-FB", family: "787", operator: "Gulf Air", yearBuilt: 2018 },
];

/**
 * Find similar seed fiches for internal linking: same operator first,
 * then same aircraft family. Never includes the current registration.
 */
export function findSimilar(
  registration: string,
  type: string | undefined,
  operator: string | undefined,
  limit = 6,
): SeedMeta[] {
  const family = familyOf(type);
  const scored = SEED_META.filter((s) => s.registration !== registration).map(
    (s) => {
      let score = 0;
      if (operator && s.operator === operator) score += 2;
      if (family && s.family === family) score += 1;
      return { seed: s, score };
    },
  );
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.seed);
}
