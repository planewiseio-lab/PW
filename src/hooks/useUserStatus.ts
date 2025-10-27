"use client";

import { useState, useEffect } from "react";
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
          try {
            const { data: subscription, error: subError } = await supabase
              .from("user_subscriptions")
              .select("status, plan")
              .eq("user_id", user.id)
              .eq("status", "active")
              .maybeSingle();

            if (!subError && subscription && subscription.status === "active") {
              // Différencier entre "pro" (plan premium) et "subscribed" (plan basique)
              if (
                subscription.plan === "pro" ||
                subscription.plan === "premium"
              ) {
                setStatus("pro");
              } else {
                setStatus("subscribed");
              }
            } else {
              // Utilisateur connecté mais pas de souscription active = shows ads
              setStatus("guest");
            }
          } catch (subErr) {
            // Table inexistante ou pas de souscription = shows ads
            console.log(
              "[useUserStatus] No subscription table or error:",
              subErr
            );
            setStatus("guest");
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
          try {
            const { data: subscriptionData, error: subErr } = await supabase
              .from("user_subscriptions")
              .select("status, plan")
              .eq("user_id", session.user.id)
              .eq("status", "active")
              .maybeSingle();

            if (
              !subErr &&
              subscriptionData &&
              subscriptionData.status === "active"
            ) {
              // Différencier entre "pro" (plan premium) et "subscribed" (plan basique)
              if (
                subscriptionData.plan === "pro" ||
                subscriptionData.plan === "premium"
              ) {
                setStatus("pro");
              } else {
                setStatus("subscribed");
              }
            } else {
              setStatus("guest");
            }
          } catch (err) {
            setStatus("guest");
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [isSupabaseConfigured]);

  const shouldShowAds = status === "guest" || status === "subscribed";

  return {
    status: loading ? "loading" : status,
    user,
    isAuthenticated: !!user && !loading,
    shouldShowAds,
  };
}
