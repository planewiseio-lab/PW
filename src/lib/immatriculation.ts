import type { Lang } from "@/lib/i18n";
import type { LegalBlock } from "@/lib/legal";

export type ImmatFaq = { q: string; a: string };

export type ImmatSection = {
  id: string;
  title: string;
  nav: string;
  blocks: LegalBlock[];
};

export type ImmatPage = {
  title: string;
  description: string;
  intro: string;
  sections: ImmatSection[];
  faqTitle: string;
  faqNav: string;
  faqs: ImmatFaq[];
};

const fr: ImmatPage = {
  title: "Immatriculation d’avion et tail number",
  description:
    "Qu’est-ce qu’une immatriculation d’avion (tail number) ? Préfixes C-, N-, F- et recherche PlaneWise : fiche publique, photos créditées, usage informatif seulement.",
  intro:
    "Une immatriculation d’avion — aussi appelée tail number, marques de nationalité et d’immatriculation, ou simplement « reg » — est le code peint sur un aéronef pour l’identifier. PlaneWise sert à consulter une fiche informative à partir de ce code. Cette page explique ce que le code représente, comment lire les préfixes de pays les plus courants, ce que la recherche affiche, et ce qu’elle n’est pas. PlaneWise n’est pas un registre officiel et n’appartient à aucune autorité d’aviation civile.",
  sections: [
    {
      id: "definition",
      title: "Qu’est-ce qu’une immatriculation d’avion ?",
      nav: "Définition",
      blocks: [
        {
          type: "p",
          text: "Chaque aéronef civil porte des marques d’immatriculation attribuées par l’État où il est inscrit. Ces marques apparaissent en général sur le fuselage et, souvent, sur les ailes. Dans le langage courant, on parle aussi de numéro de queue (tail number), parce que le code est fréquemment peint près de l’empennage. Le but est pratique : distinguer un appareil d’un autre du même type, au sol comme en vol, dans les communications radio, les documents et les bases de données publiques.",
        },
        {
          type: "p",
          text: "L’immatriculation n’est pas le numéro de vol. Un vol commercial (par exemple AF123) change d’un jour à l’autre et peut être assuré par plusieurs cellules. L’immatriculation, elle, désigne une cellule précise — un exemplaire physique, souvent suivi aussi par un numéro de série constructeur (MSN). Si l’avion est vendu, loué ou réimmatriculé dans un autre pays, le code peint peut changer, alors que le MSN reste en principe le même.",
        },
        {
          type: "p",
          text: "Le format varie selon le pays : lettres et chiffres, parfois un tiret (F-HTYA, C-FRSR, G-ZBKA), parfois sans tiret (N875BD aux États-Unis, JA8089 au Japon). PlaneWise accepte les deux présentations pour les formats courants. Une immatriculation n’est pas un secret : elle est visible sur l’appareil et reprise dans de nombreuses sources publiques. Cela ne veut pas dire que toutes les données associées (propriétaire, statut, historique) sont toujours exactes ou à jour.",
        },
      ],
    },
    {
      id: "prefixes",
      title: "Préfixes de pays courants",
      nav: "Préfixes",
      blocks: [
        {
          type: "p",
          text: "Les marques civiles commencent le plus souvent par un préfixe de nationalité, puis par un suffixe propre à l’appareil. Les exemples ci-dessous aident à lire un tail number ; ce n’est pas un registre, ni une liste exhaustive, ni une confirmation qu’un code donné est actuellement attribué. Les autorités nationales (et, pour le cadre international, les pratiques associées à l’OACI) restent la référence officielle.",
        },
        {
          type: "ul",
          items: [
            "C- : Canada (exemple : C-FRSR).",
            "N : États-Unis ; les N-numbers n’ont en général pas de tiret (exemple : N875BD).",
            "F- : France (exemple : F-HTYA).",
            "G- : Royaume-Uni.",
            "D- : Allemagne.",
            "I- : Italie.",
            "EC- : Espagne.",
            "PH- : Pays-Bas.",
            "HB- : Suisse.",
            "OE- : Autriche.",
            "OO- : Belgique.",
            "VH- : Australie.",
            "ZK- : Nouvelle-Zélande.",
            "JA : Japon ; souvent sans tiret.",
            "HL : Corée du Sud ; souvent sans tiret.",
            "B- : souvent associé à la Chine, selon le reste de la marque ; d’autres usages historiques existent.",
            "PP-, PR-, PT- : Brésil, selon la série.",
            "A6- : Émirats arabes unis.",
            "9V- : Singapour.",
            "HS- : Thaïlande.",
          ],
        },
        {
          type: "p",
          text: "Un même préfixe ne dit pas tout : il indique le pays d’immatriculation au moment où les marques sont valides, pas nécessairement le pays de l’exploitant, ni le lieu où l’avion vole le plus souvent. Une compagnie peut exploiter des appareils immatriculés ailleurs, notamment en location. Inversement, un appareil peut changer de préfixe après une vente ou un transfert de registre. PlaneWise n’attribue aucun code et ne confirme pas qu’une marque est libre, réservée ou radiée.",
        },
      ],
    },
    {
      id: "lookup",
      title: "Comment fonctionne la recherche PlaneWise",
      nav: "Recherche",
      blocks: [
        {
          type: "p",
          text: "Sur la page d’accueil, vous saisissez une immatriculation puis lancez la recherche. Le serveur interroge des sources publiques pour composer une fiche de cette cellule. Rien n’est demandé dans le navigateur au-delà du code saisi et des témoins décrits sur /legal : pas de compte, pas de paiement, pas de formulaire d’identité. Si une source ne répond pas ou n’a pas la cellule, PlaneWise n’invente pas le champ manquant : il l’omet.",
        },
        {
          type: "p",
          text: "Le site normalise les saisies plausibles (lettres et chiffres, 2 à 10 caractères, tiret facultatif) afin d’accepter par exemple « fhtya » et « F-HTYA ». Les N-numbers américains restent sans tiret. Si le texte ne ressemble pas à une immatriculation, un message l’indique au lieu d’afficher une fiche vide. Une recherche sans résultat signifie que les sources publiques interrogées n’ont pas fourni assez d’éléments pour cette marque — pas qu’elle n’existe pas dans un registre officiel.",
        },
        {
          type: "p",
          text: "Les données de fiche proviennent notamment de bases publiques d’identification d’aéronefs (constructeur, type OACI, exploitant, adresse Mode S lorsqu’elle est connue) et de profils publics qui peuvent indiquer l’année, le MSN, le pays, le statut ou d’anciennes marques. Les photographies, lorsqu’il y en a, viennent de sources photo publiques distinctes. PlaneWise n’est affilié ni à ces sources, ni aux compagnies, ni aux autorités, ni aux titulaires d’immatriculation.",
        },
      ],
    },
    {
      id: "fiche",
      title: "Ce que montre la fiche",
      nav: "Fiche",
      blocks: [
        {
          type: "p",
          text: "Lorsqu’une fiche peut être composée, l’immatriculation apparaît en tête, parfois avec un indicateur de statut (par exemple « Actif ») s’il est disponible. Les champs suivants ne s’affichent que s’ils ont été trouvés : type, constructeur, modèle / code OACI, code IATA dérivé du type OACI lorsqu’il est connu, compagnie, propriétaire, pays, année de construction et âge approximatif, date de livraison, MSN, moteurs, adresse Mode S (ICAO24), et autres immatriculations déjà portées par la cellule.",
        },
        {
          type: "p",
          text: "L’âge est calculé à partir de l’année connue, pas d’une inspection. Le propriétaire et l’exploitant peuvent différer (location, filiale, gestion). Si les deux noms sont identiques dans les sources, PlaneWise n’affiche pas le propriétaire en double. Les champs absents ne sont pas remplis par approximation : une fiche courte n’est pas une fiche « secrète », c’est souvent une cellule peu documentée dans les sources publiques.",
        },
        {
          type: "p",
          text: "Sous les données, le site tente d’afficher des photographies de cette cellule-là, pas d’un autre avion du même type. Si aucune photo n’est trouvée, un court avis l’indique et la fiche texte reste visible. Les crédits photographes restent sur l’image. Pour une nouvelle recherche, revenez au champ en haut de page ou à l’accueil.",
        },
      ],
    },
    {
      id: "photos",
      title: "Photos et crédits",
      nav: "Photos",
      blocks: [
        {
          type: "p",
          text: "Les photos affichées sur une fiche n’appartiennent pas à PlaneWise. Elles sont chargées depuis des sources publiques (notamment des API photo et des catégories Wikimedia Commons liées à l’immatriculation, lorsqu’elles existent). Un bandeau de crédit indique le photographe et la source, dans l’esprit « © nom via source ». Cliquez ou consultez la source d’origine pour les conditions de réutilisation : PlaneWise ne concède aucune licence sur ces images.",
        },
        {
          type: "p",
          text: "La galerie, s’il y a plusieurs vues, permet de parcourir d’autres clichés de la même cellule. L’objectif est documentaire : montrer l’appareil correspondant au code saisi. Une photo peut dater, montrer une livrée ancienne, ou un angle qui ne reflète plus l’état actuel. L’absence de photo ne dit rien sur la navigabilité.",
        },
      ],
    },
    {
      id: "limites",
      title: "Usage informatif seulement",
      nav: "Limites",
      blocks: [
        {
          type: "p",
          text: "PlaneWise est un site d’information publique. Il ne sert pas à la planification de vol, au contrôle aérien, à la maintenance, à l’assurance, à l’identification juridique d’un propriétaire, ni à une décision de sécurité. Les sources peuvent être incomplètes, en retard, contradictoires ou erronées. Une fiche « Actif » n’est pas une preuve de navigabilité. Une photo n’est pas un certificat.",
        },
        {
          type: "p",
          text: "Ne vous appuyez pas sur ce site pour un usage opérationnel, juridique ou de sécurité aérienne. Pour un statut officiel, adressez-vous à l’autorité d’aviation civile compétente ou au titulaire d’immatriculation. Les conditions d’utilisation et la politique relative aux témoins, y compris la publicité Google AdSense, sont sur /legal. Pour écrire à PlaneWise : /contact ou info@planewise.io.",
        },
      ],
    },
  ],
  faqTitle: "Questions fréquentes",
  faqNav: "FAQ",
  faqs: [
    {
      q: "PlaneWise est-il un registre officiel ?",
      a: "Non. PlaneWise agrège des informations publiques pour afficher une fiche. Il n’attribue pas d’immatriculation, ne tient pas de registre et ne parle pas au nom d’une autorité.",
    },
    {
      q: "Pourquoi ma recherche ne trouve-t-elle rien ?",
      a: "Vérifiez le format (lettres, chiffres, tiret facultatif). Beaucoup d’appareils, surtout anciens, militaires, privés ou peu photographiés, n’apparaissent pas dans les sources publiques interrogées. Une absence de fiche n’est pas une radiation officielle.",
    },
    {
      q: "Puis-je chercher un numéro de vol ou une compagnie ?",
      a: "Non. La recherche porte uniquement sur l’immatriculation / tail number de la cellule, pas sur un vol du jour ni sur un nom de compagnie seul.",
    },
    {
      q: "Les photos sont-elles libres de droits ?",
      a: "Non par défaut. Le crédit sur l’image désigne le photographe et la source. Respectez leurs conditions ; PlaneWise n’est pas titulaire de ces droits.",
    },
    {
      q: "Puis-je m’en servir pour voler ou pour un dossier juridique ?",
      a: "Non. Les fiches sont informatives et fournies telles quelles. Elles ne remplacent ni documentation officielle, ni manuel, ni avis d’une autorité.",
    },
    {
      q: "Comment vous joindre ?",
      a: "Utilisez /contact ou écrivez à info@planewise.io. Il n’y a pas d’adresse postale publiée.",
    },
  ],
};

const en: ImmatPage = {
  title: "Aircraft registration and tail number",
  description:
    "What is an aircraft registration or tail number? Common prefixes (C-, N-, F-) and how PlaneWise lookup works — public fact sheet, credited photos, informational use only.",
  intro:
    "An aircraft registration — also called a tail number, nationality and registration marks, or simply a “reg” — is the code painted on an aircraft so it can be identified. PlaneWise looks up an informational fact sheet from that code. This page explains what the marks mean, how to read common country prefixes, what the lookup shows, and what it is not. PlaneWise is not an official registry and is not a civil-aviation authority.",
  sections: [
    {
      id: "definition",
      title: "What is an aircraft registration?",
      nav: "Definition",
      blocks: [
        {
          type: "p",
          text: "Civil aircraft carry registration marks issued by the state where the airframe is entered on a national register. The marks are usually painted on the fuselage and often on the wings. In everyday English they are also called the tail number, because the code is frequently painted near the empennage. The point is practical: tell one aeroplane apart from another of the same type, on the ground and in the air, on the radio, on paperwork, and in public databases.",
        },
        {
          type: "p",
          text: "Registration is not a flight number. A commercial flight (for example AF123) changes from day to day and may be flown by several airframes. The registration names one physical airframe, often also tracked by a manufacturer serial number (MSN). If the aircraft is sold, leased, or moved to another country’s register, the painted code can change; the MSN usually does not.",
        },
        {
          type: "p",
          text: "Format varies by country: letters and digits, sometimes with a hyphen (F-HTYA, C-FRSR, G-ZBKA) and sometimes without (N875BD in the United States, JA8089 in Japan). PlaneWise accepts both presentations for common formats. A registration is not a secret: it is visible on the aircraft and repeated in many public sources. That does not mean every associated field (owner, status, history) is always complete or current.",
        },
      ],
    },
    {
      id: "prefixes",
      title: "Common country prefixes",
      nav: "Prefixes",
      blocks: [
        {
          type: "p",
          text: "Civil marks usually start with a nationality prefix, then a suffix unique to that aircraft. The examples below help you read a tail number. They are not a registry, not a complete list, and not confirmation that a given code is currently assigned. National authorities (and, for the international framework, ICAO-related practice) remain the official reference.",
        },
        {
          type: "ul",
          items: [
            "C- : Canada (example: C-FRSR).",
            "N : United States; N-numbers typically have no hyphen (example: N875BD).",
            "F- : France (example: F-HTYA).",
            "G- : United Kingdom.",
            "D- : Germany.",
            "I- : Italy.",
            "EC- : Spain.",
            "PH- : Netherlands.",
            "HB- : Switzerland.",
            "OE- : Austria.",
            "OO- : Belgium.",
            "VH- : Australia.",
            "ZK- : New Zealand.",
            "JA : Japan; often written without a hyphen.",
            "HL : South Korea; often written without a hyphen.",
            "B- : often associated with China, depending on the rest of the mark; other historical uses exist.",
            "PP-, PR-, PT- : Brazil, depending on the series.",
            "A6- : United Arab Emirates.",
            "9V- : Singapore.",
            "HS- : Thailand.",
          ],
        },
        {
          type: "p",
          text: "A prefix does not tell the whole story. It indicates the state of registry while those marks are valid, not necessarily the operator’s country or where the aircraft flies most. An airline may operate airframes registered elsewhere, especially on lease. Conversely, an airframe may change prefix after a sale or a register transfer. PlaneWise does not assign marks and does not confirm that a code is free, reserved, or cancelled.",
        },
      ],
    },
    {
      id: "lookup",
      title: "How PlaneWise lookup works",
      nav: "Lookup",
      blocks: [
        {
          type: "p",
          text: "On the home page you type a registration and run the search. The server queries public sources and builds a fact sheet for that airframe. Nothing else is asked in the browser beyond the code you typed and the cookies described on /legal: no account, no payment, no identity form. If a source does not answer or has no record for that airframe, PlaneWise does not invent the missing field — it omits it.",
        },
        {
          type: "p",
          text: "The site normalizes plausible input (letters and digits, 2 to 10 characters, hyphen optional) so both “fhtya” and “F-HTYA” work. US N-numbers stay unhyphenated. If the text does not look like a registration, you get an error instead of an empty sheet. “Not found” means the public sources queried did not return enough to build a sheet — not that the marks are absent from an official register.",
        },
        {
          type: "p",
          text: "Fact-sheet data comes from public aircraft-identity sources (manufacturer, ICAO type, operator, Mode S address when known) and public profiles that may list year, MSN, country, status, or previous marks. Photographs, when present, come from separate public photo sources. PlaneWise is not affiliated with those sources, with airlines, with authorities, or with registration holders.",
        },
      ],
    },
    {
      id: "fiche",
      title: "What the fact sheet shows",
      nav: "Fact sheet",
      blocks: [
        {
          type: "p",
          text: "When a sheet can be built, the registration is shown at the top, sometimes with a status pill (for example “Active”) if that is available. The following fields appear only when found: type, manufacturer, model / ICAO code, IATA code derived from the ICAO type when known, airline, owner, country, year built and approximate age, delivery date, MSN, engines, Mode S address (ICAO24), and other registrations the airframe has carried.",
        },
        {
          type: "p",
          text: "Age is computed from the known year, not from an inspection. Owner and operator can differ (lease, subsidiary, management). If both names are the same in the sources, PlaneWise does not show owner twice. Missing fields are not guessed: a short sheet is usually a thinly documented airframe in public sources, not a “hidden” one.",
        },
        {
          type: "p",
          text: "Below the facts, the site tries to show photographs of that airframe, not another aircraft of the same type. If no photo is found, a short notice says so and the text sheet remains. Photographer credits stay on the image. For another lookup, use the search field at the top of the results page or return home.",
        },
      ],
    },
    {
      id: "photos",
      title: "Photos and credits",
      nav: "Photos",
      blocks: [
        {
          type: "p",
          text: "Photos on a fact sheet do not belong to PlaneWise. They are loaded from public sources (including photo APIs and Wikimedia Commons categories for the registration, when those exist). A credit overlay names the photographer and source, in the form “© name via source”. Check the original source for reuse terms: PlaneWise does not grant a licence to those images.",
        },
        {
          type: "p",
          text: "If several views exist, a gallery lets you browse other shots of the same airframe. The aim is documentary: show the aircraft that matches the code you typed. A photo may be old, show a former livery, or an angle that no longer matches the current airframe. A missing photo says nothing about airworthiness.",
        },
      ],
    },
    {
      id: "limites",
      title: "Informational use only",
      nav: "Limits",
      blocks: [
        {
          type: "p",
          text: "PlaneWise is a public information site. It is not for flight planning, air traffic control, maintenance, insurance, legal identification of an owner, or a safety decision. Sources may be incomplete, late, contradictory, or wrong. An “Active” pill is not proof of airworthiness. A photograph is not a certificate.",
        },
        {
          type: "p",
          text: "Do not rely on this site for operational, legal, or aviation-safety use. For an official status, go to the competent civil-aviation authority or the registration holder. Terms of use and the cookie notice, including Google AdSense advertising, are on /legal. To write to PlaneWise: /contact or info@planewise.io.",
        },
      ],
    },
  ],
  faqTitle: "Frequently asked questions",
  faqNav: "FAQ",
  faqs: [
    {
      q: "Is PlaneWise an official registry?",
      a: "No. PlaneWise aggregates public information to show a fact sheet. It does not issue registrations, keep a register, or speak for an authority.",
    },
    {
      q: "Why was my tail number not found?",
      a: "Check the format (letters, digits, optional hyphen). Many aircraft — especially older, military, private, or rarely photographed ones — do not appear in the public sources queried. A missing sheet is not an official cancellation.",
    },
    {
      q: "Can I search by flight number or airline?",
      a: "No. Lookup is by airframe registration / tail number only, not by a day’s flight number or an airline name alone.",
    },
    {
      q: "Are the photos free to reuse?",
      a: "Not by default. The credit on the image names the photographer and source. Follow their terms; PlaneWise does not own those rights.",
    },
    {
      q: "Can I use this to fly or for a legal file?",
      a: "No. Sheets are informational and provided as is. They do not replace official documentation, a manual, or an authority’s advice.",
    },
    {
      q: "How do I contact you?",
      a: "Use /contact or write to info@planewise.io. No postal address is published.",
    },
  ],
};

export function getImmatriculationPage(lang: Lang): ImmatPage {
  return lang === "en" ? en : fr;
}

export function immatriculationFaqJsonLd(page: ImmatPage) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}
