import type { Lang } from "@/lib/i18n";

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
  updated: "Dernière mise à jour : 2 septembre 2026",
  intro:
    "PlaneWise est un site public d’information sur les aéronefs, exploité sous le nom PlaneWise à l’adresse planewise.io. Aucun compte n’est requis. Cette page décrit la confidentialité, les conditions d’utilisation et les témoins (cookies) liés à la publicité. Nous n’indiquons pas d’adresse postale, de numéro d’entreprise ni de responsable nommé. Les demandes, y compris celles relatives à la confidentialité, peuvent être envoyées depuis /contact ou à info@planewise.io.",
  sections: [
    {
      id: "privacy",
      title: "Confidentialité",
      blocks: [
        {
          type: "p",
          text: "Cette politique vise à expliquer, en termes clairs, quelles informations le site peut traiter, à quelles fins, et quels droits vous pouvez exercer. Elle s’inspire des principes de la Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE / PIPEDA) et de la Loi sur la protection des renseignements personnels dans le secteur privé du Québec (y compris les exigences modernisées souvent appelées Loi 25).",
        },
        {
          type: "h3",
          text: "Qui est responsable",
        },
        {
          type: "p",
          text: "Le site est exploité par PlaneWise (planewise.io). Aucune autre identité corporative, adresse postale ou numéro d’entreprise n’est publié ici. Les demandes relatives à la confidentialité peuvent être envoyées depuis /contact ou à info@planewise.io.",
        },
        {
          type: "h3",
          text: "Quelles informations",
        },
        {
          type: "ul",
          items: [
            "Les immatriculations que vous saisissez dans le champ de recherche, afin d’afficher la fiche correspondante.",
            "Un témoin de langue (pw-lang) pour retenir FR ou ENG.",
            "Des données techniques habituelles d’un site web (par exemple, journalisation côté hébergeur : adresse IP, navigateur, pages consultées), utilisées pour faire fonctionner et sécuriser le service.",
            "Des données collectées par Google AdSense (voir la section Cookies), y compris des témoins de publicité et des identifiants publicitaires. Les publicités sont fournies par Google AdSense et des témoins publicitaires peuvent être déposés.",
          ],
        },
        {
          type: "p",
          text: "PlaneWise ne crée pas de compte utilisateur, n’accepte pas de paiement et ne demande pas de nom, d’adresse ou de carte bancaire. Les fiches d’aéronefs et les photos affichées proviennent de sources publiques tierces ; les crédits photographes restent sur les images.",
        },
        {
          type: "h3",
          text: "Fins et consentement",
        },
        {
          type: "p",
          text: "Nous utilisons ces informations pour fournir la recherche, mémoriser la langue, afficher des publicités (y compris des publicités personnalisées via Google) et assurer le fonctionnement du site. Le témoin de langue est nécessaire au service. Les témoins publicitaires de Google sont des témoins de tiers. Vous pouvez les refuser ou les limiter via les paramètres de votre navigateur et les réglages publicitaires de Google. Continuer à utiliser le site après avoir pris connaissance de cette page vaut, pour les fins décrites ici, un consentement dans la mesure prévue par le droit applicable ; vous pouvez retirer ce consentement pour la publicité personnalisée via les outils de Google et de votre navigateur.",
        },
        {
          type: "h3",
          text: "Tiers et transferts",
        },
        {
          type: "p",
          text: "Les sources de données et de photos d’aéronefs sont consultées pour composer la fiche. PlaneWise ne revend pas vos recherches à des courtiers en données. Les publicités sont fournies par Google AdSense ; voir la section Cookies.",
        },
        {
          type: "h3",
          text: "Conservation, incidents et droits",
        },
        {
          type: "p",
          text: "Les recherches ne sont pas associées à un compte. Les journaux d’hébergement, s’ils existent, sont conservés le temps raisonnable nécessaire au fonctionnement et à la sécurité. En cas d’incident de confidentialité présentant un risque de préjudice sérieux, les avis prévus par le droit applicable seront donnés dans la mesure où nous disposons des moyens de vous joindre. Vous pouvez demander l’accès aux renseignements personnels que nous détiendrions sur vous, leur rectification, ou le retrait du consentement pour les traitements non essentiels, sous réserve des exceptions légales. PlaneWise ne publie pas de responsable de la protection des renseignements personnels nommé ; toute demande doit être envoyée via /contact ou info@planewise.io.",
        },
        {
          type: "p",
          text: "Le site n’est pas destiné à collecter sciemment des renseignements auprès d’enfants. Si vous croyez qu’un mineur a fourni des renseignements, contactez-nous via /contact ou info@planewise.io.",
        },
      ],
    },
    {
      id: "terms",
      title: "Conditions d’utilisation",
      blocks: [
        {
          type: "p",
          text: "En utilisant planewise.io, vous acceptez les présentes conditions. Si vous n’êtes pas d’accord, n’utilisez pas le site.",
        },
        {
          type: "h3",
          text: "Le service",
        },
        {
          type: "p",
          text: "PlaneWise permet de consulter une fiche informative à partir d’une immatriculation d’aéronef (données publiques et photographies créditée). Le service est fourni gratuitement, sans compte et sans paiement. PlaneWise n’est pas affilié aux compagnies aériennes, aux autorités d’aviation civile, ni aux titulaires d’immatriculation.",
        },
        {
          type: "h3",
          text: "Exactitude",
        },
        {
          type: "p",
          text: "Les informations sont présentées « telles quelles », à partir de sources publiques qui peuvent être incomplètes, en retard ou erronées. Ne vous fiez pas au site pour des décisions opérationnelles, juridiques, d’assurance ou de sécurité aérienne. PlaneWise ne garantit ni la disponibilité continue du site, ni l’exactitude des fiches ou des photos.",
        },
        {
          type: "h3",
          text: "Usage acceptable",
        },
        {
          type: "ul",
          items: [
            "N’utilisez pas le site d’une façon qui surcharge, perturbe ou contourne les mesures techniques.",
            "N’utilisez pas les contenus pour faire croire que PlaneWise certifie un aéronef ou une compagnie.",
            "Respectez les crédits photographiques affichés sur les images.",
          ],
        },
        {
          type: "h3",
          text: "Propriété intellectuelle",
        },
        {
          type: "p",
          text: "La marque, le logo et l’interface PlaneWise appartiennent à PlaneWise. Les photographies restent la propriété de leurs auteurs et sources, indiqués sur les visuels. Les données d’aéronefs restent soumises aux conditions des sources d’origine.",
        },
        {
          type: "h3",
          text: "Publicité",
        },
        {
          type: "p",
          text: "Le site affiche des publicités Google AdSense. Les publicités sont fournies par Google et peuvent être personnalisées. Voir la section Cookies.",
        },
        {
          type: "h3",
          text: "Droit applicable",
        },
        {
          type: "p",
          text: "Dans la mesure permise, ces conditions sont régies par les lois applicables au Québec et les lois fédérales du Canada qui s’y appliquent. Si une disposition est invalide, les autres demeurent en vigueur. PlaneWise peut mettre à jour cette page ; la date en tête de page fait foi.",
        },
      ],
    },
    {
      id: "cookies",
      title: "Cookies et publicité",
      blocks: [
        {
          type: "p",
          text: "Cette section décrit les témoins et technologies similaires utilisés sur planewise.io. Les publicités sont fournies par Google AdSense et des témoins publicitaires peuvent être déposés.",
        },
        {
          type: "h3",
          text: "Témoins que nous déposons",
        },
        {
          type: "ul",
          items: [
            "pw-lang : mémorise le choix FR ou ENG (durée d’environ un an, SameSite=Lax). Il est nécessaire pour afficher le site dans la langue choisie.",
          ],
        },
        {
          type: "h3",
          text: "Témoins et publicités de tiers (Google AdSense)",
        },
        {
          type: "p",
          text: "Nous utilisons Google AdSense pour diffuser des annonces. Google, en tant que fournisseur tiers, peut déposer des témoins (y compris des témoins publicitaires) sur votre appareil, collecter des identifiants et des données de navigation, et afficher des publicités personnalisées ou contextuelles. Ces traitements sont régis par les politiques de Google. Google peut utiliser des témoins pour personnaliser les annonces selon vos visites sur ce site et d’autres sites.",
        },
        {
          type: "ul",
          items: [
            "Politique de confidentialité de Google : https://policies.google.com/privacy",
            "Publicité et témoins Google : https://policies.google.com/technologies/ads",
            "Comment Google utilise les données des sites partenaires : https://policies.google.com/technologies/partner-sites",
            "Paramètres des annonces Google (désactiver la personnalisation) : https://www.google.com/settings/ads",
          ],
        },
        {
          type: "h3",
          text: "Comment contrôler",
        },
        {
          type: "p",
          text: "Vous pouvez supprimer ou bloquer les témoins dans votre navigateur. Bloquer tous les témoins peut empêcher la mémorisation de la langue. Pour les publicités personnalisées, utilisez les paramètres Google ci-dessus et, le cas échéant, les outils de votre plateforme. Le site ne propose pas actuellement de bandeau de consentement distinct : cette page constitue l’avis relatif aux témoins et à la publicité.",
        },
      ],
    },
  ],
};

const en: LegalPage = {
  title: "Legal",
  updated: "Last updated: 2 September 2026",
  intro:
    "PlaneWise is a public aircraft-information website operated as PlaneWise at planewise.io. No account is required. This page covers privacy, terms of use, and cookies related to advertising. We do not list a postal address, business number, or named officer. Privacy and other requests may be sent through /contact or to info@planewise.io.",
  sections: [
    {
      id: "privacy",
      title: "Privacy",
      blocks: [
        {
          type: "p",
          text: "This policy explains, in plain language, what information the site may process, for what purposes, and what rights you may have. It is informed by the Personal Information Protection and Electronic Documents Act (PIPEDA) and Quebec’s Act respecting the protection of personal information in the private sector (including the modernized requirements often called Law 25).",
        },
        {
          type: "h3",
          text: "Who is responsible",
        },
        {
          type: "p",
          text: "The site is operated by PlaneWise (planewise.io). No other corporate identity, postal address, or business number is published here. Privacy requests may be sent through /contact or to info@planewise.io.",
        },
        {
          type: "h3",
          text: "What we process",
        },
        {
          type: "ul",
          items: [
            "Aircraft registrations you type into search, so we can show that airframe’s fact sheet.",
            "A language cookie (pw-lang) to remember FR or ENG.",
            "Ordinary website technical data (for example host logs: IP address, browser, pages viewed) used to operate and secure the service.",
            "Data collected by Google AdSense (see Cookies), including advertising cookies and ad identifiers. Ads are provided by Google AdSense and advertising cookies may be set.",
          ],
        },
        {
          type: "p",
          text: "PlaneWise does not create user accounts, take payments, or ask for your name, address, or card details. Aircraft fact sheets and photos come from public third-party sources; photographer credits stay on the images.",
        },
        {
          type: "h3",
          text: "Purposes and consent",
        },
        {
          type: "p",
          text: "We use this information to provide lookup, remember language, show ads (including personalized ads via Google), and keep the site running. The language cookie is needed for the service. Google’s advertising cookies are third-party cookies. You can refuse or limit them through your browser and Google’s ad settings. Continuing to use the site after reading this page is consent for the purposes described here to the extent applicable law allows; you may withdraw consent for personalized ads through Google’s tools and your browser.",
        },
        {
          type: "h3",
          text: "Third parties and transfers",
        },
        {
          type: "p",
          text: "Aircraft data and photo sources are queried to build the fact sheet. PlaneWise does not sell your searches to data brokers. Ads are provided by Google AdSense; see the Cookies section.",
        },
        {
          type: "h3",
          text: "Retention, incidents, and rights",
        },
        {
          type: "p",
          text: "Lookups are not tied to an account. Hosting logs, if any, are kept only as reasonably needed for operations and security. If a confidentiality incident presents a risk of serious harm, notices required by applicable law will be given to the extent we have a way to reach you. You may request access to personal information we hold about you, correction, or withdrawal of consent for non-essential processing, subject to legal exceptions. PlaneWise does not publish a named privacy officer; send requests through /contact or info@planewise.io.",
        },
        {
          type: "p",
          text: "The site is not intended to knowingly collect information from children. If you believe a minor provided information, contact us through /contact or info@planewise.io.",
        },
      ],
    },
    {
      id: "terms",
      title: "Terms of use",
      blocks: [
        {
          type: "p",
          text: "By using planewise.io you agree to these terms. If you do not agree, do not use the site.",
        },
        {
          type: "h3",
          text: "The service",
        },
        {
          type: "p",
          text: "PlaneWise lets you look up an informational fact sheet from an aircraft registration (public data and credited photographs). The service is free, with no account and no payment. PlaneWise is not affiliated with airlines, civil-aviation authorities, or registration holders.",
        },
        {
          type: "h3",
          text: "Accuracy",
        },
        {
          type: "p",
          text: "Information is provided “as is” from public sources that may be incomplete, late, or wrong. Do not rely on the site for operational, legal, insurance, or aviation-safety decisions. PlaneWise does not warrant uninterrupted availability or the accuracy of fact sheets or photos.",
        },
        {
          type: "h3",
          text: "Acceptable use",
        },
        {
          type: "ul",
          items: [
            "Do not use the site in a way that overloads, disrupts, or bypasses technical measures.",
            "Do not use the content to imply that PlaneWise certifies an aircraft or airline.",
            "Respect photographer credits shown on the images.",
          ],
        },
        {
          type: "h3",
          text: "Intellectual property",
        },
        {
          type: "p",
          text: "The PlaneWise name, logo, and interface belong to PlaneWise. Photographs remain the property of their authors and sources, as credited on the visuals. Aircraft data remains subject to the terms of the original sources.",
        },
        {
          type: "h3",
          text: "Advertising",
        },
        {
          type: "p",
          text: "The site displays Google AdSense ads. Ads are served by Google and may be personalized. See the Cookies section.",
        },
        {
          type: "h3",
          text: "Governing law",
        },
        {
          type: "p",
          text: "To the extent permitted, these terms are governed by the laws applicable in Quebec and the federal laws of Canada applicable therein. If a provision is invalid, the rest remains in force. PlaneWise may update this page; the date at the top applies.",
        },
      ],
    },
    {
      id: "cookies",
      title: "Cookies and ads",
      blocks: [
        {
          type: "p",
          text: "This section describes cookies and similar technologies on planewise.io. Ads are provided by Google AdSense and advertising cookies may be set.",
        },
        {
          type: "h3",
          text: "Cookies we set",
        },
        {
          type: "ul",
          items: [
            "pw-lang: remembers FR or ENG (about one year, SameSite=Lax). It is needed to show the site in the language you chose.",
          ],
        },
        {
          type: "h3",
          text: "Third-party cookies and ads (Google AdSense)",
        },
        {
          type: "p",
          text: "We use Google AdSense to show ads. Google, as a third-party vendor, may set cookies (including advertising cookies) on your device, collect identifiers and browsing data, and show personalized or contextual ads. Those processes are governed by Google’s policies. Google may use cookies to personalize ads based on your visits to this site and other sites.",
        },
        {
          type: "ul",
          items: [
            "Google Privacy Policy: https://policies.google.com/privacy",
            "Google advertising and cookies: https://policies.google.com/technologies/ads",
            "How Google uses information from partner sites: https://policies.google.com/technologies/partner-sites",
            "Google Ads Settings (turn off personalization): https://www.google.com/settings/ads",
          ],
        },
        {
          type: "h3",
          text: "How to control cookies",
        },
        {
          type: "p",
          text: "You can delete or block cookies in your browser. Blocking all cookies may stop the site from remembering language. For personalized ads, use Google’s settings above and any tools on your device. The site does not currently show a separate consent banner: this page is the notice for cookies and advertising.",
        },
      ],
    },
  ],
};

export function getLegalPage(lang: Lang): LegalPage {
  return lang === "en" ? en : fr;
}
