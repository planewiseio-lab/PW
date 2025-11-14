"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SupabaseErrorHandler() {
  useEffect(() => {
    const supabase = createClient();

    // Intercepter les erreurs 403 au niveau global
    const handleAuthError = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (
          error &&
          (error.message.includes("403") || error.message.includes("Forbidden"))
        ) {
          console.log("403 error detected, clearing auth data...");

          // Nettoyer toutes les données d'authentification
          if (typeof window !== "undefined") {
            localStorage.clear();
            sessionStorage.clear();

            // Recharger la page pour réinitialiser l'état
            window.location.reload();
          }
        }
      } catch (err) {
        console.error("Error checking auth status:", err);
      }
    };

    // Vérifier l'état d'authentification au chargement
    handleAuthError();

    // Écouter les changements d'état d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" && !session) {
        console.log("User signed out, clearing auth data...");
        if (typeof window !== "undefined") {
          localStorage.clear();
          sessionStorage.clear();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
