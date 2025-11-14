"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

export type UserStatus = "guest" | "subscribed" | "pro" | "loading";

interface SubscriptionData {
  plan: string;
  status: string;
  renewsAt: string;
}

interface UserStatusData {
  status: UserStatus;
  user: User | null;
  isAuthenticated: boolean;
  shouldShowAds: boolean;
  subscription: SubscriptionData | null;
  isLoading: boolean;
}

interface UserStatusContextType extends UserStatusData {
  refreshSubscription: () => Promise<void>;
}

const UserStatusContext = createContext<UserStatusContextType | undefined>(undefined);

export function UserStatusProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<UserStatus>("loading");
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const fetchingRef = useRef(false);
  const subscriptionRef = useRef<any>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const hasLoadedSubscriptionRef = useRef(false); // Track si on a déjà chargé la subscription
  const lastUserIdRef = useRef<string | null>(null); // Track le dernier userId pour éviter les fetches répétés
  const CACHE_DURATION = 5000; // Cache de 5 secondes pour éviter les appels multiples rapides

  // Vérifier si Supabase est configuré
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isSupabaseConfigured =
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "https://your-project.supabase.co" &&
    supabaseAnonKey !== "your-anon-key-here";

  // Fonction helper pour récupérer et mettre à jour la subscription
  const fetchAndUpdateSubscription = async (userId: string | null, forceRefresh = false) => {
    if (!userId) {
      setSubscription(null);
      setStatus("guest");
      return;
    }

    // Éviter les appels multiples simultanés
    if (fetchingRef.current) {
      console.log("[UserStatusProvider] Fetch already in progress, skipping...");
      return;
    }

    // Éviter les appels trop fréquents (cache de 5 secondes) sauf si forceRefresh
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTimeRef.current < CACHE_DURATION) {
      console.log("[UserStatusProvider] Recent fetch detected, using cache...");
      return;
    }

    fetchingRef.current = true;
    lastFetchTimeRef.current = now;

    try {
      console.log("[UserStatusProvider] 🔄 Fetching subscription...", {
        userId,
        forceRefresh,
        hasLoaded: hasLoadedSubscriptionRef.current,
        timeSinceLastFetch: Date.now() - lastFetchTimeRef.current,
      });
      
      const subscriptionResponse = await fetch("/api/user/subscription", {
        credentials: "include",
        cache: "no-store",
      });

      if (subscriptionResponse.ok) {
        const data = await subscriptionResponse.json();
        if (data.subscription) {
          // Stocker l'objet subscription complet
          setSubscription(data.subscription);
          hasLoadedSubscriptionRef.current = true; // Marquer comme chargé
          
          const plan = data.subscription.plan;
          const renewsAt = data.subscription.renewsAt
            ? new Date(data.subscription.renewsAt)
            : null;
          const now = new Date();

          if (plan === "PRO" || plan === "BASIC") {
            setStatus(renewsAt && renewsAt > now ? "pro" : "subscribed");
          } else {
            setStatus("subscribed");
          }
        } else {
          setSubscription(null);
          hasLoadedSubscriptionRef.current = true; // Même si null, on a vérifié
          setStatus("guest");
        }
      } else {
        setSubscription(null);
        hasLoadedSubscriptionRef.current = true; // Même si erreur, on a tenté
        setStatus("guest");
      }
    } catch (err) {
      console.error("[UserStatusProvider] Error fetching subscription:", err);
      setSubscription(null);
      hasLoadedSubscriptionRef.current = true; // Même si erreur, on a tenté
      setStatus("guest");
    } finally {
      fetchingRef.current = false;
    }
  };

  // Fonction pour forcer le refresh de la subscription (exposée via le contexte)
  const refreshSubscription = async () => {
    if (user) {
      // Bypasser le cache pour un refresh forcé
      await fetchAndUpdateSubscription(user.id, true);
    }
  };

  // Fonction helper pour créer une subscription Supabase
  const createAuthSubscription = (supabaseClient: ReturnType<typeof createClient>) => {
    return supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log("[UserStatusProvider] Auth event:", event, "hasLoaded:", hasLoadedSubscriptionRef.current);
      
      // Ignorer l'événement INITIAL_SESSION si on a déjà chargé les données
      // Cela évite les appels multiples au chargement
      if (event === "INITIAL_SESSION") {
        if (hasLoadedSubscriptionRef.current) {
          console.log("[UserStatusProvider] Ignoring INITIAL_SESSION, subscription already loaded");
          return;
        }
        // Si c'est le premier INITIAL_SESSION et qu'on n'a pas encore chargé, on charge
        // Mais seulement si on n'est pas déjà en train de charger
        if (fetchingRef.current) {
          console.log("[UserStatusProvider] Already fetching, ignoring INITIAL_SESSION");
          return;
        }
      }

      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
        setSubscription(null);
        setStatus("guest");
        lastFetchTimeRef.current = 0; // Reset cache on sign out
        hasLoadedSubscriptionRef.current = false; // Reset flag
        lastUserIdRef.current = null; // Reset userId
      } else {
        const newUserId = session.user?.id || null;
        
        // Ignorer SIGNED_IN si c'est le même utilisateur et qu'on a déjà chargé
        // Cela évite les fetches répétés pour le même utilisateur
        if (event === "SIGNED_IN" && hasLoadedSubscriptionRef.current && lastUserIdRef.current === newUserId) {
          console.log("[UserStatusProvider] Ignoring SIGNED_IN, same user already loaded");
          setUser(session.user);
          return;
        }

        setUser(session.user);

        if (session.user) {
          // Ne fetch que si :
          // 1. C'est INITIAL_SESSION et on n'a pas encore chargé
          // 2. C'est un autre événement (SIGNED_IN avec nouvel utilisateur, TOKEN_REFRESHED, etc.)
          // 3. C'est un nouvel utilisateur
          const isNewUser = lastUserIdRef.current !== newUserId;
          const shouldFetch = 
            (event === "INITIAL_SESSION" && !hasLoadedSubscriptionRef.current) ||
            (event !== "INITIAL_SESSION" && (isNewUser || !hasLoadedSubscriptionRef.current));
          
          if (shouldFetch) {
            lastUserIdRef.current = newUserId;
            await fetchAndUpdateSubscription(session.user.id);
          }
        }
      }
    });
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus("guest");
      setLoading(false);
      return;
    }

    // Déferrer le chargement de Supabase sur mobile pour améliorer le TBT
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const delay = isMobile ? 2000 : 0; // Délai de 2s sur mobile pour permettre le rendu initial

    // Définir les handlers au niveau du useEffect pour qu'ils soient accessibles dans le nettoyage
    const handlePageHide = () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };

    // Suspendre les WebSockets quand la page n'est pas visible pour permettre le bfcache
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Suspendre la subscription quand la page est cachée
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        }
      } else if (document.visibilityState === "visible") {
        // Réactiver la subscription quand la page redevient visible
        // Ne pas refetch la subscription si on a déjà les données récentes
        if (!subscriptionRef.current && isSupabaseConfigured) {
          const supabaseClient = createClient();
          const { data: { subscription: newSubscription } } = createAuthSubscription(supabaseClient);
          subscriptionRef.current = newSubscription;
          // Ne pas refetch automatiquement - on attend un événement auth réel
        }
      }
    };

    // Réactiver la subscription lors du pageshow (retour du bfcache)
    const handlePageShow = () => {
      if (!subscriptionRef.current && isSupabaseConfigured) {
        const supabaseClient = createClient();
        const { data: { subscription: newSubscription } } = createAuthSubscription(supabaseClient);
        subscriptionRef.current = newSubscription;
        // Ne pas refetch automatiquement - on attend un événement auth réel
      }
    };

    const timeoutId = setTimeout(() => {
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
            // Mettre à jour lastUserIdRef avant de fetch
            lastUserIdRef.current = user.id;
            // Récupérer la subscription (utilise la fonction helper réutilisable)
            await fetchAndUpdateSubscription(user.id);
          } else {
            setSubscription(null);
            setStatus("guest");
            hasLoadedSubscriptionRef.current = true; // Marquer comme chargé même si pas d'utilisateur
            lastUserIdRef.current = null;
          }
        } catch (err) {
          console.error("[UserStatusProvider] Error getting user:", err);
          setStatus("guest");
          hasLoadedSubscriptionRef.current = true; // Marquer comme chargé même en cas d'erreur
        } finally {
          setLoading(false);
          fetchingRef.current = false;
        }
      };

      // Charger l'utilisateur d'abord (cela va marquer hasLoadedSubscriptionRef)
      // Attendre que getUser finisse avant de créer la subscription
      // Cela évite que INITIAL_SESSION se déclenche avant que getUser ne finisse
      getUser().then(() => {
        // Créer la subscription initiale APRÈS getUser
        // INITIAL_SESSION sera ignoré car hasLoadedSubscriptionRef sera déjà true
        if (!subscriptionRef.current) {
          const { data: { subscription } } = createAuthSubscription(supabase);
          subscriptionRef.current = subscription;
        }
      });

      // Écouter les événements pour gérer le bfcache
      window.addEventListener("pagehide", handlePageHide);
      window.addEventListener("pageshow", handlePageShow);
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }, delay);

    // Nettoyage du useEffect
    return () => {
      clearTimeout(timeoutId);
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      fetchingRef.current = false;
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isSupabaseConfigured]);

  const shouldShowAds = status === "guest" || status === "subscribed";

  const value: UserStatusContextType = {
    status: loading ? "loading" : status,
    user,
    isAuthenticated: !!user && !loading,
    shouldShowAds,
    subscription,
    isLoading: loading,
    refreshSubscription,
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
      subscription: null,
      isLoading: false,
    };
  }
  const { refreshSubscription, ...rest } = context;
  return rest;
}

// Hook pour accéder à la fonction de refresh (utile pour les composants qui ont besoin de forcer un refresh)
export function useRefreshSubscription() {
  const context = useContext(UserStatusContext);
  if (context === undefined) {
    return async () => {};
  }
  return context.refreshSubscription;
}

