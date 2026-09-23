/**
 * Seed registrations for the sitemap and build-time static generation.
 *
 * Only registrations verified to resolve to a real aircraft fiche belong
 * here — every sitemap URL must return a 200 with content, otherwise it
 * hurts indexing instead of helping it. All entries below were verified
 * against the live lookup on 2026-09-22.
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
