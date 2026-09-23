import type { Lang } from "@/lib/i18n";
import { ADSENSE_CLIENT } from "@/lib/adsense";

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] };

export type LegalSection = {
  id: "privacy" | "terms" | "cookies";
  title: string;
  blocks: LegalBlock[];
};

export type LegalPage = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

const fr: LegalPage = {
  title: "Mentions légales",
  updated: "Dernière mise à jour : 23 septembre 2026",
  intro:
    "PlaneWise (planewise.io) est un site public d’information sur les aéronefs. Aucun compte n’est requis. Cette page résume la confidentialité, les conditions d’utilisation et les cookies.",
  sections: [
    {
      id: "privacy",
      title: "Confidentialité",
      blocks: [
        {
          type: "p",
          text: "Le site traite : l’immatriculation recherchée (pour afficher la fiche), un témoin de langue (pw-lang), et les données techniques habituelles d’hébergement (adresse IP, navigateur, pages vues).",
        },
        {
          type: "p",
          text: "Aucun compte, aucun paiement, aucun nom ni adresse ne sont demandés. Les fiches et photos proviennent de sources publiques tierces.",
        },
        {
          type: "p",
          text: "Google AdSense peut déposer des témoins publicitaires (identifiant d’éditeur " +
            ADSENSE_CLIENT +
            "). Voir la section Cookies. PlaneWise ne vend pas vos recherches.",
        },
        {
          type: "p",
          text: "Vous pouvez demander l’accès ou la rectification de vos renseignements, et retirer votre consentement pour la publicité personnalisée via les paramètres de Google et de votre navigateur.",
        },
      ],
    },
    {
      id: "terms",
      title: "Conditions d’utilisation",
      blocks: [
        {
          type: "p",
          text: "En utilisant planewise.io, vous acceptez ces conditions.",
        },
        {
          type: "p",
          text: "Les fiches sont fournies « telles quelles » à partir de sources publiques pouvant être incomplètes ou erronées. Ne les utilisez pas pour des décisions opérationnelles ou de sécurité aérienne.",
        },
        {
          type: "ul",
          items: [
            "Ne surchargez pas le site et ne contournez pas ses mesures techniques.",
            "Ne laissez pas croire que PlaneWise certifie un aéronef ou une compagnie.",
          ],
        },
        {
          type: "p",
          text: "La marque et l’interface appartiennent à PlaneWise ; les photos restent la propriété de leurs auteurs. Le site affiche des publicités Google AdSense. Droit applicable : Québec et Canada.",
        },
      ],
    },
    {
      id: "cookies",
      title: "Cookies",
      blocks: [
        {
          type: "p",
          text: "pw-lang mémorise votre choix de langue (environ un an) ; il est nécessaire au service.",
        },
        {
          type: "p",
          text: "Google AdSense, fournisseur tiers, peut déposer des témoins publicitaires et afficher des annonces personnalisées, selon ses propres politiques.",
        },
        {
          type: "ul",
          items: [
            "Confidentialité Google : https://policies.google.com/privacy",
            "Désactiver la personnalisation : https://www.google.com/settings/ads",
          ],
        },
        {
          type: "p",
          text: "Vous pouvez bloquer les témoins dans votre navigateur. Cette page tient lieu d’avis sur les témoins ; aucun bandeau de consentement distinct n’est affiché.",
        },
      ],
    },
  ],
};

const en: LegalPage = {
  title: "Legal",
  updated: "Last updated: 23 September 2026",
  intro:
    "PlaneWise (planewise.io) is a public aircraft-information website. No account is required. This page summarizes privacy, terms of use, and cookies.",
  sections: [
    {
      id: "privacy",
      title: "Privacy",
      blocks: [
        {
          type: "p",
          text: "The site processes: the registration you look up (to show the fact sheet), a language cookie (pw-lang), and ordinary hosting technical data (IP address, browser, pages viewed).",
        },
        {
          type: "p",
          text: "No account, no payment, no name or address is requested. Fact sheets and photos come from public third-party sources.",
        },
        {
          type: "p",
          text: "Google AdSense may set advertising cookies (publisher ID " +
            ADSENSE_CLIENT +
            "). See Cookies. PlaneWise does not sell your searches.",
        },
        {
          type: "p",
          text: "You may request access to or correction of your information, and withdraw consent for personalized ads through Google’s and your browser’s settings.",
        },
      ],
    },
    {
      id: "terms",
      title: "Terms of use",
      blocks: [
        {
          type: "p",
          text: "By using planewise.io you agree to these terms.",
        },
        {
          type: "p",
          text: "Fact sheets are provided “as is” from public sources that may be incomplete or wrong. Do not rely on them for operational or aviation-safety decisions.",
        },
        {
          type: "ul",
          items: [
            "Do not overload the site or bypass its technical measures.",
            "Do not imply that PlaneWise certifies an aircraft or airline.",
          ],
        },
        {
          type: "p",
          text: "The brand and interface belong to PlaneWise; photos remain the property of their authors. The site shows Google AdSense ads. Governing law: Quebec and Canada.",
        },
      ],
    },
    {
      id: "cookies",
      title: "Cookies",
      blocks: [
        {
          type: "p",
          text: "pw-lang remembers your language choice (about one year); it is needed for the service.",
        },
        {
          type: "p",
          text: "Google AdSense, a third-party vendor, may set advertising cookies and show personalized ads under its own policies.",
        },
        {
          type: "ul",
          items: [
            "Google Privacy: https://policies.google.com/privacy",
            "Turn off personalization: https://www.google.com/settings/ads",
          ],
        },
        {
          type: "p",
          text: "You can block cookies in your browser. This page is the cookie notice; no separate consent banner is shown.",
        },
      ],
    },
  ],
};

export function getLegalPage(lang: Lang): LegalPage {
  return lang === "en" ? en : fr;
}
