import { formatDeliveryDate, formatEngineLine } from "../pretty";
import { registrationsMatch } from "../normalize";

export type AirportDataInfo = {
  registration: string;
  manufacturer?: string;
  type?: string;
  yearBuilt?: number;
  serial?: string;
  country?: string;
  icao24?: string;
  status?: string;
  owner?: string;
  deliveryDate?: string;
  previousRegistrations?: string[];
  engines?: string;
  link: string;
};

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function tableCell(html: string, label: string): string | undefined {
  const pattern = new RegExp(
    `<td[^>]*>\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*</td>\\s*<td[^>]*>([\\s\\S]*?)</td>`,
    "i",
  );
  const match = html.match(pattern);
  if (!match) return undefined;
  const text = stripTags(match[1]);
  return text || undefined;
}

function previousRegs(html: string, current: string): string[] | undefined {
  const cell = html.match(
    /<td[^>]*>\s*Also Registered As\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i,
  );
  if (!cell) return undefined;
  const found = [...cell[1].matchAll(/aircraft\/([A-Z0-9-]+)/gi)].map((m) =>
    m[1].toUpperCase(),
  );
  const unique = [...new Set(found)].filter(
    (reg) => !registrationsMatch(reg, current),
  );
  return unique.length ? unique : undefined;
}

export function parseAirportProfileHtml(
  html: string,
  expectedReg: string,
): Partial<AirportDataInfo> | null {
  if (/Add aircraft/i.test(html) && !/Airframe Info/i.test(html)) return null;
  if (!/Airframe Info/i.test(html) && !/Year built/i.test(html)) return null;

  const registration =
    tableCell(html, "Registration Number") ?? expectedReg;
  const manufacturer = tableCell(html, "Manufacturer");
  const type = tableCell(html, "Model")?.replace(/\s*Search all[\s\S]*$/i, "");
  const yearRaw = tableCell(html, "Year built");
  const yearBuilt = yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : undefined;
  const serial = tableCell(html, "Construction Number (C/N)");
  const status = tableCell(html, "Current Status");
  const owner = tableCell(html, "Owner");
  const deliveryDate = formatDeliveryDate(tableCell(html, "Delivery Date"));
  const icao24 = tableCell(html, "Mode S (ICAO24) Code")?.toUpperCase();
  const engines = formatEngineLine(
    tableCell(html, "Number of Engines"),
    tableCell(html, "Engine Manufacturer and Model"),
  );

  return {
    registration: registration.toUpperCase(),
    manufacturer,
    type: type?.replace(/\s{2,}/g, " ").trim(),
    yearBuilt,
    serial,
    status,
    owner,
    deliveryDate,
    icao24,
    engines,
    previousRegistrations: previousRegs(html, expectedReg),
  };
}
