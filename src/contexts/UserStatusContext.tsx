"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

export type UserStatus = "guest" | "subscribed" | "pro" | "loading";

interface UserStatusData {
  status: UserStatus;
  user: User | null;
  isAuthenticated: boolean;
  shouldShowAds: boolean;
}

interface UserStatusContextType extends UserStatusData {
  isLoading: boolean;
}

const UserStatusContext = createContext<UserStatusContextType | undefined>(undefined);

export function UserStatusProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<UserStatus>("loading");
  const fetchingRef = useRef(false);
  const subscriptionRef = useRef<any>(null);

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
      // Éviter les appels multiples simultanés
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setUser(user);

        if (user) {
          // Vérifier si l'utilisateur a une souscription active et le plan
          try {
            const subscriptionResponse = await fetch("/api/user/subscription", {
              credentials: "include",
              cache: "no-store",
            });

            if (subscriptionResponse.ok) {
              const data = await subscriptionResponse.json();
              if (data.subscription) {
                const plan = data.subscription.plan;
                const renewsAt = data.subscription.renewsAt
                  ? new Date(data.subscription.renewsAt)
                  : null;
                const now = new Date();

                if (plan === "PRO" || plan === "BASIC") {
                  if (renewsAt && renewsAt > now) {
                    setStatus("pro");
                  } else {
                    setStatus("subscribed");
                  }
                } else {
                  setStatus("subscribed");
                }
              } else {
                setStatus("guest");
              }
            } else {
              setStatus("guest");
            }
          } catch (subErr) {
            console.error("[UserStatusProvider] Error fetching subscription:", subErr);
            setStatus("guest");
          }
        } else {
          setStatus("guest");
        }
      } catch (err) {
        console.error("[UserStatusProvider] Error getting user:", err);
        setStatus("guest");
      } finally {
        setLoading(false);
        fetchingRef.current = false;
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
                const plan = data.subscription.plan;
                const renewsAt = data.subscription.renewsAt
                  ? new Date(data.subscription.renewsAt)
                  : null;
                const now = new Date();

                if (plan === "PRO" || plan === "BASIC") {
                  if (renewsAt && renewsAt > now) {
                    setStatus("pro");
                  } else {
                    setStatus("subscribed");
                  }
                } else {
                  setStatus("subscribed");
                }
              } else {
                setStatus("guest");
              }
            } else {
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

    subscriptionRef.current = subscription;

    return () => {
      subscription.unsubscribe();
      fetchingRef.current = false;
    };
  }, [isSupabaseConfigured]);

  const shouldShowAds = status === "guest" || status === "subscribed";

  const value: UserStatusContextType = {
    status: loading ? "loading" : status,
    user,
    isAuthenticated: !!user && !loading,
    shouldShowAds,
    isLoading: loading,
  };

  return (
    <UserStatusContext.Provider value={value}>
      {children}
    </UserStatusContext.Provider>
  );
}

export function useUserStatus(): UserStatusData {
  const context = useContext(UserStatusContext);
  if (context === undefined) {
    // Fallback si le contexte n'est pas disponible (ne devrait jamais arriver)
    console.warn("useUserStatus must be used within UserStatusProvider");
    return {
      status: "guest",
      user: null,
      isAuthenticated: false,
      shouldShowAds: true,
    };
  }
  const { isLoading, ...rest } = context;
  return rest;
}

