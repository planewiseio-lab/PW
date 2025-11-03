"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

export type UserStatus = "guest" | "subscribed" | "pro" | "loading";

interface UserStatusData {
  status: UserStatus;
  user: User | null;
  isAuthenticated: boolean;
  shouldShowAds: boolean;
}

/**
 * Hook pour détecter le statut de l'utilisateur (guest, subscribed, etc.)
 * et déterminer si les publicités doivent être affichées
 */
export function useUserStatus(): UserStatusData {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<UserStatus>("loading");
  const fetchingRef = useRef(false); // Empêche les appels multiples simultanés

  // Vérifier si Supabase est configuré
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isSupabaseConfigured =
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "https://your-project.supabase.co" &&
    supabaseAnonKey !== "your-anon-key-here";

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus("guest");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setUser(user);

        if (user) {
          // Vérifier si l'utilisateur a une souscription active et le plan
          // Utiliser la nouvelle table subscriptions via l'API
          // Éviter les appels multiples simultanés
          if (fetchingRef.current) return;
          fetchingRef.current = true;
          
          try {
            const subscriptionResponse = await fetch("/api/user/subscription", {
              credentials: "include",
              cache: "no-store",
            });

            if (subscriptionResponse.ok) {
              const data = await subscriptionResponse.json();
              if (data.subscription) {
                // Différencier entre PRO/BASIC (plans payants) et FREE (plan gratuit)
                // IMPORTANT: Vérifier le PLAN réel ET la date de fin de période (renewsAt)
                // Si le plan est PRO/BASIC (même avec status CANCELED) ET que renewsAt est dans le futur,
                // l'utilisateur a encore accès jusqu'à sa date de fin individuelle, donc pas de pubs
                const plan = data.subscription.plan;
                const renewsAt = data.subscription.renewsAt
                  ? new Date(data.subscription.renewsAt)
                  : null;
                const now = new Date();

                if (plan === "PRO" || plan === "BASIC") {
                  // Vérifier si la période est encore valide (renewsAt dans le futur)
                  // Chaque utilisateur a sa propre date de fin de période
                  if (renewsAt && renewsAt > now) {
                    // Plan payant (PRO ou BASIC) avec période encore valide = pas de pubs
                    // même si status est CANCELED, car l'utilisateur a encore accès jusqu'à renewsAt
                setStatus("pro");
                  } else {
                    // Plan payant mais période terminée = l'utilisateur devrait être sur FREE
                    // (normalement le webhook devrait avoir mis à jour, mais on affiche les pubs pour être sûr)
                    setStatus("subscribed");
                  }
                } else {
                  // FREE plan = shows ads
                  setStatus("subscribed");
                }
              } else {
                // Pas de souscription = shows ads
                setStatus("guest");
              }
            } else {
              // Pas de souscription = shows ads
              setStatus("guest");
            }
          } catch (subErr) {
            // Erreur API ou pas de souscription = shows ads
            console.error(
              "[useUserStatus] Error fetching subscription:",
              subErr
            );
            setStatus("guest");
          } finally {
            fetchingRef.current = false;
          }
        } else {
          setStatus("guest");
        }
      } catch (err) {
        console.error("[useUserStatus] Error getting user:", err);
        setStatus("guest");
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
        setStatus("guest");
      } else {
        setUser(session.user);

        // Vérifier la souscription après connexion
        if (session.user) {
          // Éviter les appels multiples simultanés
          if (fetchingRef.current) return;
          fetchingRef.current = true;
          
          try {
            const subscriptionResponse = await fetch("/api/user/subscription", {
              credentials: "include",
              cache: "no-store",
            });

            if (subscriptionResponse.ok) {
              const data = await subscriptionResponse.json();
              if (data.subscription) {
                // Différencier entre PRO/BASIC (plans payants) et FREE (plan gratuit)
                // IMPORTANT: Vérifier le PLAN réel ET la date de fin de période (renewsAt)
                // Si le plan est PRO/BASIC (même avec status CANCELED) ET que renewsAt est dans le futur,
                // l'utilisateur a encore accès jusqu'à sa date de fin individuelle, donc pas de pubs
                const plan = data.subscription.plan;
                const renewsAt = data.subscription.renewsAt
                  ? new Date(data.subscription.renewsAt)
                  : null;
                const now = new Date();

                if (plan === "PRO" || plan === "BASIC") {
                  // Vérifier si la période est encore valide (renewsAt dans le futur)
                  // Chaque utilisateur a sa propre date de fin de période
                  if (renewsAt && renewsAt > now) {
                    // Plan payant (PRO ou BASIC) avec période encore valide = pas de pubs
                    // même si status est CANCELED, car l'utilisateur a encore accès jusqu'à renewsAt
                setStatus("pro");
                  } else {
                    // Plan payant mais période terminée = l'utilisateur devrait être sur FREE
                    // (normalement le webhook devrait avoir mis à jour, mais on affiche les pubs pour être sûr)
                    setStatus("subscribed");
                  }
                } else {
                  // FREE plan = shows ads
                  setStatus("subscribed");
                }
              } else {
                // Pas de souscription = shows ads
                setStatus("guest");
              }
            } else {
              // Erreur API = shows ads
              setStatus("guest");
            }
          } catch (err) {
            setStatus("guest");
          } finally {
            fetchingRef.current = false;
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      fetchingRef.current = false;
    };
  }, [isSupabaseConfigured]);

  const shouldShowAds = status === "guest" || status === "subscribed";

  return {
    status: loading ? "loading" : status,
    user,
    isAuthenticated: !!user && !loading,
    shouldShowAds,
  };
}
