"use client";

import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Cacher uniquement SearchHeader et pubs (garder header et footer)
    const searchHeader = document.querySelector("aside");
    const ads = document.querySelectorAll("[data-position-label]");

    if (searchHeader) searchHeader.style.display = "none";
    ads.forEach((ad) => ((ad as HTMLElement).style.display = "none"));

    return () => {
      if (searchHeader) searchHeader.style.display = "";
      ads.forEach((ad) => ((ad as HTMLElement).style.display = ""));
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="py-8">{children}</div>
    </div>
  );
}
