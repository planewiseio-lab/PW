"use client";

import { useEffect } from "react";

export default function UserDeletedHandler() {
  useEffect(() => {
    // Vérifier si l'utilisateur a été supprimé au chargement
    if (typeof window !== "undefined") {
      const userDeleted = localStorage.getItem("user-deleted");
      if (userDeleted === "true") {
        console.log("User was deleted, clearing flag and reloading...");
        localStorage.removeItem("user-deleted");
        // Recharger immédiatement
        window.location.reload();
      }
    }
  }, []);

  return null;
}
