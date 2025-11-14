"use client";

import { useEffect } from "react";
import { disableSupabase } from "@/lib/disable-supabase";

export default function AuthErrorHandler() {
  useEffect(() => {
    // Intercepter les erreurs de fetch pour les requêtes Supabase
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        // Si erreur 403 sur une requête Supabase auth, désactiver complètement Supabase
        if (
          response.status === 403 &&
          args[0] &&
          typeof args[0] === "string" &&
          args[0].includes("supabase.co/auth")
        ) {
          console.log("403 error detected, disabling Supabase completely...");
          disableSupabase();
          // Recharger immédiatement pour éviter le spam
          window.location.reload();
        }

        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null; // Ce composant ne rend rien
}
