"use client";

import { useEffect } from "react";

export default function HeadLinks() {
  useEffect(() => {
    // Preconnect pour les domaines critiques (API et images) - Amélioration LCP
    const preconnectLinks = [
      { href: "https://prod.api.market", crossOrigin: "anonymous" },
      { href: "https://api.market", crossOrigin: "anonymous" },
      { href: "https://commons.wikimedia.org", crossOrigin: "anonymous" },
      { href: "https://upload.wikimedia.org", crossOrigin: "anonymous" },
      { href: "https://staticflickr.com", crossOrigin: "anonymous" },
    ];

    // DNS prefetch pour les autres domaines
    const dnsPrefetchLinks = [
      "https://prod.api.market",
      "https://api.market",
      "https://commons.wikimedia.org",
      "https://upload.wikimedia.org",
      "https://staticflickr.com",
      "https://farm5.staticflickr.com",
      "https://farm66.staticflickr.com",
      "https://www.googletagmanager.com",
    ];

    // Ajouter les preconnect links
    preconnectLinks.forEach(({ href, crossOrigin }) => {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = href;
      if (crossOrigin) {
        link.crossOrigin = crossOrigin;
      }
      document.head.appendChild(link);
    });

    // Ajouter les dns-prefetch links
    dnsPrefetchLinks.forEach((href) => {
      const link = document.createElement("link");
      link.rel = "dns-prefetch";
      link.href = href;
      document.head.appendChild(link);
    });

    // Cleanup function (optionnel, car ces liens peuvent rester)
    return () => {
      // Les liens peuvent rester dans le head, pas besoin de cleanup
    };
  }, []);

  return null;
}

