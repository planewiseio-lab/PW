import type { Lang } from "./i18n";

const STATUS_LABEL: Record<string, { fr: string; en: string }> = {
  registered: { fr: "Actif", en: "Active" },
  active: { fr: "Actif", en: "Active" },
  operational: { fr: "Actif", en: "Active" },
  stored: { fr: "Stocké", en: "Stored" },
  parked: { fr: "Stocké", en: "Stored" },
  scrapped: { fr: "Détruit", en: "Scrapped" },
  broken: { fr: "Détruit", en: "Scrapped" },
  "written off": { fr: "Radié", en: "Written off" },
  writtenoff: { fr: "Radié", en: "Written off" },
  "written-off": { fr: "Radié", en: "Written off" },
  preserved: { fr: "Préservé", en: "Preserved" },
  "on order": { fr: "En commande", en: "On order" },
  destroyed: { fr: "Détruit", en: "Destroyed" },
};

const ACTIVE_KEYS = new Set(["registered", "active", "operational"]);

export function statusTone(raw?: string): "active" | "muted" | null {
  if (!raw?.trim()) return null;
  return ACTIVE_KEYS.has(raw.trim().toLowerCase()) ? "active" : "muted";
}

export function translateStatus(raw?: string, lang: Lang = "fr"): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  const mapped = STATUS_LABEL[cleaned.toLowerCase()];
  if (mapped) return mapped[lang];
  return cleaned;
}

export function formatType(raw?: string): string | undefined {
  if (!raw) return undefined;
  let value = raw.replace(/\s+/g, " ").trim();
  value = value.replace(/^(\d{4})\s+/, "");
  value = value.replace(/\b(A\d{3})\s+(\d{2,3})\b/i, "$1-$2");
  value = value.replace(/\b(\d{3})\s+(\d)\b/, "$1-$2");
  return value || undefined;
}

export function parseYearPrefix(model?: string): {
  year?: number;
  rest?: string;
} {
  if (!model) return {};
  const match = model.trim().match(/^(\d{4})\s+(.+)$/);
  if (!match) return { rest: model.trim() };
  const year = Number(match[1]);
  if (year < 1903 || year > 2100) return { rest: model.trim() };
  return { year, rest: match[2] };
}

export function ageFromYear(year?: number, now = new Date()): number | undefined {
  if (!year) return undefined;
  const age = now.getUTCFullYear() - year;
  if (age < 0 || age > 120) return undefined;
  return age;
}

export function formatDeliveryDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  if (!value) return undefined;
  const yyyymm00 = value.match(/^(\d{4})-(\d{2})-00$/);
  if (yyyymm00) return `${yyyymm00[1]}-${yyyymm00[2]}`;
  const yyyymmdd = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyymmdd) return value;
  return value;
}

export function formatEngineLine(
  count?: string,
  model?: string,
): string | undefined {
  const cleanModel = model?.replace(/\s+/g, " ").trim();
  const cleanCount = count?.trim();
  if (cleanModel && cleanCount && /^\d+$/.test(cleanCount)) {
    return `${cleanCount} × ${cleanModel}`;
  }
  return cleanModel || undefined;
}
