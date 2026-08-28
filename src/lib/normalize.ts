const MULTI_LETTER_PREFIXES = [
  "A6",
  "A7",
  "A9",
  "CC",
  "CN",
  "CP",
  "CS",
  "CX",
  "EC",
  "EI",
  "EK",
  "EP",
  "ES",
  "EW",
  "EX",
  "EY",
  "HA",
  "HB",
  "HC",
  "HI",
  "HK",
  "HL",
  "HP",
  "HR",
  "HS",
  "HZ",
  "LN",
  "LV",
  "LX",
  "LY",
  "OE",
  "OH",
  "OK",
  "OM",
  "OO",
  "OY",
  "PH",
  "PK",
  "PP",
  "PR",
  "PT",
  "PU",
  "RA",
  "RP",
  "SE",
  "SP",
  "ST",
  "SU",
  "SX",
  "TC",
  "TF",
  "TG",
  "TI",
  "TJ",
  "TN",
  "TR",
  "TS",
  "TU",
  "UR",
  "VH",
  "VN",
  "VT",
  "XA",
  "XB",
  "XC",
  "XT",
  "YA",
  "YI",
  "YK",
  "YL",
  "YN",
  "YR",
  "YS",
  "YU",
  "YV",
  "ZA",
  "ZK",
  "ZP",
  "ZS",
  "ZT",
  "ZU",
  "4K",
  "4R",
  "4X",
  "5A",
  "5B",
  "5H",
  "5N",
  "5R",
  "5U",
  "5X",
  "5Y",
  "6V",
  "6Y",
  "7T",
  "8P",
  "8Q",
  "9A",
  "9G",
  "9H",
  "9J",
  "9K",
  "9L",
  "9M",
  "9N",
  "9Q",
  "9U",
  "9V",
  "9Y",
] as const;

const NO_HYPHEN_PREFIXES = ["N", "JA", "HL"];
const SINGLE_LETTER_PREFIXES = ["B", "C", "D", "F", "G", "I"];

function compact(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hyphenate(compactReg: string): string {
  for (const prefix of NO_HYPHEN_PREFIXES) {
    if (compactReg.startsWith(prefix) && compactReg.length > prefix.length) {
      return compactReg;
    }
  }

  for (const prefix of MULTI_LETTER_PREFIXES) {
    if (compactReg.startsWith(prefix) && compactReg.length > prefix.length) {
      return `${prefix}-${compactReg.slice(prefix.length)}`;
    }
  }

  const first = compactReg[0] ?? "";
  if (SINGLE_LETTER_PREFIXES.includes(first) && compactReg.length >= 3) {
    return `${first}-${compactReg.slice(1)}`;
  }

  return compactReg;
}

/** Trim, uppercase, optional hyphen. Empty if the input is not a plausible tail number. */
export function normalizeRegistration(raw: string): string | null {
  const cleaned = compact(raw);
  if (cleaned.length < 2 || cleaned.length > 10) return null;
  if (!/^[A-Z0-9]+$/.test(cleaned)) return null;

  if (/[-\s]/.test(raw)) {
    const parts = raw
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .filter(Boolean);
    if (parts.length >= 2) {
      const prefix = parts[0];
      const rest = parts.slice(1).join("");
      if (NO_HYPHEN_PREFIXES.some((item) => prefix.startsWith(item))) {
        return `${prefix}${rest}`;
      }
      return `${prefix}-${rest}`;
    }
  }

  return hyphenate(cleaned);
}

export function registrationVariants(canonical: string): string[] {
  const withoutHyphen = canonical.replace(/-/g, "");
  const variants = [canonical];
  if (withoutHyphen !== canonical) variants.push(withoutHyphen);
  return variants;
}

export function registrationsMatch(a: string, b: string): boolean {
  return compact(a) === compact(b);
}
