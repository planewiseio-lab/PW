import { fetchJson, fetchText } from "../http";

export type HexdbAircraft = {
  modeS: string;
  registration: string;
  manufacturer?: string;
  icaoType?: string;
  type?: string;
  operator?: string;
};

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || /^n\/a$/i.test(trimmed)) return undefined;
  return trimmed;
}

export async function hexFromRegistration(
  variants: string[],
): Promise<string | null> {
  for (const variant of variants) {
    const result = await fetchText(
      `https://hexdb.io/reg-hex?reg=${encodeURIComponent(variant)}`,
    );
    const hex = result.body.trim().toUpperCase();
    if (result.ok && /^[0-9A-F]{6}$/.test(hex)) return hex;
  }
  return null;
}

type HexdbJson = {
  ModeS?: string;
  Registration?: string;
  Manufacturer?: string;
  ICAOTypeCode?: string;
  Type?: string;
  RegisteredOwners?: string;
  status?: string;
  error?: string;
};

export async function aircraftFromHex(
  hex: string,
): Promise<HexdbAircraft | null> {
  const data = await fetchJson<HexdbJson>(
    `https://hexdb.io/api/v1/aircraft/${encodeURIComponent(hex)}`,
  );
  if (!data || data.status === "404" || data.error) return null;
  const modeS = clean(data.ModeS)?.toUpperCase();
  const registration = clean(data.Registration)?.toUpperCase();
  if (!modeS || !registration) return null;
  return {
    modeS,
    registration,
    manufacturer: clean(data.Manufacturer),
    icaoType: clean(data.ICAOTypeCode)?.toUpperCase(),
    type: clean(data.Type),
    operator: clean(data.RegisteredOwners),
  };
}
