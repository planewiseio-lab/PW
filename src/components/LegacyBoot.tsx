"use client";
import { useEffect } from "react";

export default function LegacyBoot() {
  useEffect(() => {
    // Chemin RELATIF correct : components → ../legacy/app.js
    // @ts-ignore (on ignore le typage du fichier JS legacy)
    import("../legacy/app.js").catch((err) =>
      console.error("Legacy load failed:", err)
    );
  }, []);
  return null;
}
