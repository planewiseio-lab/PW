export type Lang = "fr" | "en";

export const LANG_COOKIE = "pw-lang";

const fr = {
  tagline:
    "Recherchez une immatriculation et explorez la fiche, les photos et l’historique — au même endroit.",
  search: "Rechercher",
  searchAria: "Immatriculation de l’avion",
  placeholder: "C-FRSR, N875BD",
  type: "Type",
  manufacturer: "Constructeur",
  modelIcao: "Modèle / OACI",
  iata: "Code IATA",
  airline: "Compagnie",
  owner: "Propriétaire",
  year: "Année",
  age: "Âge",
  delivery: "Livraison",
  msn: "MSN",
  engines: "Moteurs",
  country: "Pays",
  icao24: "Mode S",
  previousRegs: "Autres immatriculations",
  statusActive: "Actif",
  photoNote:
    "Les photos visent cette immatriculation. Si une source n’a que des vues partielles, le crédit reste affiché.",
  noPhoto:
    "Aucune photographie de cette cellule n’a été trouvée. La fiche ci-dessus reprend uniquement les données publiques disponibles.",
  notFound:
    "Aucune fiche n’a été trouvée pour « {reg} ». Vérifiez le format de l’immatriculation (exemple : F-HTYA, G-ZBKA, N12345).",
  invalid:
    "Cette immatriculation n’est pas reconnue. Utilisez 2 à 10 caractères (lettres et chiffres), avec ou sans tiret.",
  error:
    "La recherche n’a pas pu aboutir. Réessayez dans un moment — les sources publiques peuvent être temporairement indisponibles.",
  pageNotFound:
    "Cette page n’existe pas. Recherchez une immatriculation ci-dessus.",
  footer:
    "Données issues de registres et bases publiques (hexdb, Airport-Data, Planespotters.net, Wikimedia Commons). Les fiches peuvent être incomplètes.",
  via: "via",
  photoAlt: "Photographie de l’avion {reg}",
  photoAltExtra: "Photo supplémentaire de {reg}",
  langFr: "Français",
  langEn: "English",
};

const en: typeof fr = {
  tagline:
    "Instantly look up any aircraft registration and explore specs, photos, and flight history — all in one place.",
  search: "Search",
  searchAria: "Aircraft registration",
  placeholder: "C-FRSR, N875BD",
  type: "Type",
  manufacturer: "Manufacturer",
  modelIcao: "Model / ICAO",
  iata: "IATA code",
  airline: "Airline",
  owner: "Owner",
  year: "Year",
  age: "Age",
  delivery: "Delivery",
  msn: "MSN",
  engines: "Engines",
  country: "Country",
  icao24: "Mode S",
  previousRegs: "Other registrations",
  statusActive: "Active",
  photoNote:
    "Photos are of this registration. If a source only has a partial view, the credit is still shown.",
  noPhoto:
    "No photograph of this airframe was found. The fact sheet above only includes available public data.",
  notFound:
    "No record was found for “{reg}”. Check the registration format (for example: F-HTYA, G-ZBKA, N12345).",
  invalid:
    "That registration is not recognized. Use 2 to 10 letters and digits, with or without a hyphen.",
  error:
    "The lookup could not be completed. Try again in a moment — public sources may be temporarily unavailable.",
  pageNotFound: "This page does not exist. Search for a registration above.",
  footer:
    "Data from public registries and databases (hexdb, Airport-Data, Planespotters.net, Wikimedia Commons). Records may be incomplete.",
  via: "via",
  photoAlt: "Photograph of aircraft {reg}",
  photoAltExtra: "Additional photo of {reg}",
  langFr: "French",
  langEn: "English",
};

export const messages = { fr, en } as const;

export type MessageKey = keyof typeof fr;

export function t(lang: Lang, key: MessageKey): string {
  return messages[lang][key];
}

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? "");
}

export function formatAgeLabel(ageYears: number, lang: Lang): string {
  if (lang === "en") return ageYears === 1 ? "1 year" : `${ageYears} years`;
  return ageYears === 1 ? "1 an" : `${ageYears} ans`;
}
