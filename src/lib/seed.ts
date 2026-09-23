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
};

/** Metadata for similarity matching ("similar airframes" on fiches). */
export const SEED_META: SeedMeta[] = [
  { registration: "F-HTYA", family: "a350", operator: "Air France" },
  { registration: "A6-EUA", family: "a380", operator: "Emirates Airline" },
  { registration: "G-ZBKA", family: "787", operator: "British Airways" },
  { registration: "PH-BHA", family: "787", operator: "KLM Royal Dutch Airlines" },
  { registration: "D-AIXA", family: "a350", operator: "Lufthansa" },
  { registration: "VH-OQA", family: "a380", operator: "Qantas" },
  { registration: "G-BOAC", family: "concorde", operator: "" },
  { registration: "F-BVFA", family: "concorde", operator: "" },
  { registration: "D-ABYT", family: "747", operator: "Lufthansa" },
  { registration: "A7-APA", family: "a380", operator: "Qatar Airways" },
  { registration: "9V-SKQ", family: "a380", operator: "Singapore Airlines" },
  { registration: "JA873A", family: "787", operator: "All Nippon Airways" },
  { registration: "N172DZ", family: "767", operator: "Delta Air Lines" },
  { registration: "G-STBA", family: "777", operator: "British Airways" },
  { registration: "F-HPJA", family: "a380", operator: "" },
  { registration: "4X-EDB", family: "787", operator: "EL AL" },
  { registration: "A9C-FA", family: "787", operator: "Gulf Air" },
  { registration: "HS-TQB", family: "787", operator: "Thai Airways International" },
  { registration: "9M-MAC", family: "a350", operator: "Malaysia Airlines" },
  { registration: "B-LXI", family: "a350", operator: "Cathay Pacific Airways" },
  { registration: "A6-BLA", family: "787", operator: "Etihad Airways" },
  { registration: "TC-LLB", family: "787", operator: "Turkish Airlines" },
  { registration: "ET-AUP", family: "787", operator: "Ethiopian Airlines" },
  { registration: "JA898A", family: "787", operator: "All Nippon Airways" },
  { registration: "HL7644", family: "747", operator: "Korean Air" },
  { registration: "N661US", family: "747", operator: "" },
  { registration: "D-ABVD", family: "747", operator: "" },
  { registration: "G-BYGC", family: "747", operator: "" },
  { registration: "A6-EOB", family: "a380", operator: "Emirates Airline" },
  { registration: "A7-ALW", family: "a350", operator: "Qatar Airways" },
  { registration: "9V-SKW", family: "a380", operator: "Singapore Airlines" },
  { registration: "HB-JNA", family: "777", operator: "Swiss International Air Lines" },
  { registration: "LN-RKP", family: "a340", operator: "" },
  { registration: "OE-LPA", family: "777", operator: "Austrian Airlines" },
  { registration: "OH-LWA", family: "a350", operator: "Finnair" },
  { registration: "OY-KBM", family: "a340", operator: "" },
  { registration: "PH-BXA", family: "737", operator: "KLM Royal Dutch Airlines" },
  { registration: "SP-LRA", family: "787", operator: "LOT Polish Airlines" },
  { registration: "TC-JJN", family: "777", operator: "Turkish Airlines" },
  { registration: "VH-OQJ", family: "a380", operator: "Qantas" },
  { registration: "VT-ANB", family: "787", operator: "Air India" },
  { registration: "XA-ADL", family: "787", operator: "AeroMexico" },
  { registration: "ZK-OKQ", family: "777", operator: "Air New Zealand" },
  { registration: "N501DN", family: "a350", operator: "Delta Air Lines" },
  { registration: "C-GHPQ", family: "787", operator: "Air Canada" },
  { registration: "F-GSPD", family: "777", operator: "Air France" },
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
