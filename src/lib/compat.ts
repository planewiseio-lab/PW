const STOP = new Set([
  "AIRCRAFT",
  "AIRPLANE",
  "THE",
  "AND",
  "COMPANY",
  "AIR",
  "LINES",
  "AIRLINE",
  "AIRLINES",
  "LTD",
  "LLC",
  "INC",
]);

export function significantTokens(value: string): Set<string> {
  return new Set(
    value
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .split(" ")
      .filter((token) => token.length >= 2 && !STOP.has(token)),
  );
}

/** True when two type/manufacturer strings likely describe the same airframe family. */
export function recordsCompatible(a?: string, b?: string): boolean {
  if (!a || !b) return true;
  const left = significantTokens(a);
  const right = significantTokens(b);
  for (const token of left) {
    if (token.length < 3) continue;
    if (right.has(token)) return true;
    for (const other of right) {
      if (other.length < 3) continue;
      if (token.includes(other) || other.includes(token)) return true;
    }
  }
  return false;
}

export function identityText(parts: Array<string | undefined>): string | undefined {
  const value = parts.filter(Boolean).join(" ");
  return value || undefined;
}
