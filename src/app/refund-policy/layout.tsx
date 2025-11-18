"use client";

import { useEffect } from "react";

export default function RefundPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Cacher les publicités (garder header et footer du layout principal)
    const ads = document.querySelectorAll("[data-position-label]");

    ads.forEach((ad) => ((ad as HTMLElement).style.display = "none"));

    return () => {
      ads.forEach((ad) => ((ad as HTMLElement).style.display = ""));
    };
  }, []);

  return <>{children}</>;
}

