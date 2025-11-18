"use client";

import { useEffect } from "react";

export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Cacher SearchHeader et les pubs (garder header et footer du layout principal)
    const searchHeader = document.querySelector("aside");
    const ads = document.querySelectorAll("[data-position-label]");

    if (searchHeader) searchHeader.style.display = "none";
    ads.forEach((ad) => ((ad as HTMLElement).style.display = "none"));

    return () => {
      if (searchHeader) searchHeader.style.display = "";
      ads.forEach((ad) => ((ad as HTMLElement).style.display = ""));
    };
  }, []);

  return <>{children}</>;
}

