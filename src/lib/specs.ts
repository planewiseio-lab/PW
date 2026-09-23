import type { AircraftFamily } from "@/lib/seed";

/**
 * Static technical data per aircraft family — no API, no quota, no fetch.
 *
 * Values are TYPICAL figures for the representative variant named in
 * `variant` (e.g. 737-800 for the whole 737 family). They vary with the
 * exact variant, engines and cabin configuration, which is why the UI
 * always presents them with "≈" and a disclaimer. Numbers were compiled
 * from public sources (manufacturer data, Simple Flying, Wikipedia) on
 * 2026-09-23; production totals marked "+" are still growing.
 */
export type FamilySpecs = {
  /** Representative variant these typical values describe. */
  variant: string;
  cruise: string;
  range: string;
  passengers: string;
  engines: string;
  /** Total airframes built (variant or programme, see value). */
  built: string;
};

export const FAMILY_LABELS: Record<AircraftFamily, string> = {
  concorde: "Concorde",
  "737": "Boeing 737",
  "747": "Boeing 747",
  "767": "Boeing 767",
  "777": "Boeing 777",
  "787": "Boeing 787",
  a340: "Airbus A340",
  a350: "Airbus A350",
  a380: "Airbus A380",
};

export const FAMILY_SPECS: Record<AircraftFamily, FamilySpecs> = {
  concorde: {
    variant: "Concorde",
    cruise: "≈ 2 150 km/h",
    range: "≈ 7 200 km",
    passengers: "≈ 100",
    engines: "4 × Rolls-Royce/Snecma Olympus 593",
    built: "20",
  },
  "737": {
    variant: "737-800",
    cruise: "≈ 840 km/h",
    range: "≈ 5 400 km",
    passengers: "160–189",
    engines: "2 × CFM56-7B",
    built: "4 000+",
  },
  "747": {
    variant: "747-400",
    cruise: "≈ 910 km/h",
    range: "≈ 13 400 km",
    passengers: "≈ 416",
    engines: "4 × PW4000 / CF6 / RB211",
    built: "694",
  },
  "767": {
    variant: "767-300ER",
    cruise: "≈ 850 km/h",
    range: "≈ 11 100 km",
    passengers: "≈ 218",
    engines: "2 × PW4000 / CF6-80 / RB211",
    built: "≈ 580",
  },
  "777": {
    variant: "777-300ER",
    cruise: "≈ 900 km/h",
    range: "≈ 13 650 km",
    passengers: "314–396",
    engines: "2 × GE90-115B",
    built: "≈ 833",
  },
  "787": {
    variant: "787-9",
    cruise: "≈ 900 km/h",
    range: "≈ 14 100 km",
    passengers: "≈ 290",
    engines: "2 × GEnx-1B / Trent 1000",
    built: "680+",
  },
  a340: {
    variant: "A340-300",
    cruise: "≈ 870 km/h",
    range: "≈ 13 500 km",
    passengers: "≈ 295",
    engines: "4 × CFM56-5C",
    built: "218",
  },
  a350: {
    variant: "A350-900",
    cruise: "≈ 900 km/h",
    range: "≈ 15 300 km",
    passengers: "300–350",
    engines: "2 × Rolls-Royce Trent XWB",
    built: "670+",
  },
  a380: {
    variant: "A380-800",
    cruise: "≈ 900 km/h",
    range: "≈ 14 800 km",
    passengers: "525–555",
    engines: "4 × Trent 900 / GP7200",
    built: "251",
  },
};
