"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUserStatus } from "@/contexts/UserStatusContext";
import { CreditBalanceCard } from "./CreditBalanceCard";
import { UsageHistoryTable } from "./UsageHistoryTable";
import { SubscriptionInfo } from "./SubscriptionInfo";
import { InsufficientCreditsBanner } from "./InsufficientCreditsBanner";

interface CreditsData {
  balance: number;
  history: {
    items: any[];
    nextCursor: string | null;
  };
  subscription: any;
  isFreeUser?: boolean;
  quotas?: any;
  renewsAt?: Date | string;
}

export function CreditsSection() {
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const fetchingRef = useRef(false); // Empêche les appels multiples simultanés
  const lastFetchTimeRef = useRef<number>(0);
  const currentFetchPromiseRef = useRef<Promise<void> | null>(null); // Promise partagée pour les appels simultanés
  const CACHE_DURATION = 5000; // Cache de 5 secondes pour éviter les appels multiples rapides (augmenté pour gérer le double-render initial)
  const { subscription: contextSubscription, isLoading: contextLoading } = useUserStatus(); // Récupérer subscription depuis le contexte
  
  // Utiliser des refs pour stocker les valeurs actuelles (évite les dépendances)
  const contextSubscriptionRef = useRef(contextSubscription);
  const contextLoadingRef = useRef(contextLoading);
  
  // Mettre à jour les refs quand les valeurs changent
  useEffect(() => {
    contextSubscriptionRef.current = contextSubscription;
    contextLoadingRef.current = contextLoading;
  }, [contextSubscription, contextLoading]);

  // Extract fetch logic to a reusable function with useCallback
  // NE PAS inclure contextSubscription dans les dépendances pour éviter les re-créations
  const fetchCreditsData = useCallback(async (showLoading = true, forceRefresh = false) => {
    const callId = Math.random().toString(36).slice(2, 9);
    const now = Date.now();
    const timeSinceLastFetch = lastFetchTimeRef.current > 0 ? now - lastFetchTimeRef.current : 0;
    
    console.log(`[Credits] fetchCreditsData called [${callId}]`, {
      showLoading,
      forceRefresh,
      isFetching: fetchingRef.current,
      hasPromise: !!currentFetchPromiseRef.current,
      timeSinceLastFetch: `${timeSinceLastFetch}ms`,
      cacheValid: timeSinceLastFetch < CACHE_DURATION,
    });

    // Si un fetch est déjà en cours, retourner la même Promise (déduplication)
    if (currentFetchPromiseRef.current) {
      console.log(`[Credits] [${callId}] Fetch already in progress, reusing existing promise...`);
      return currentFetchPromiseRef.current;
    }

    // Vérifier si un fetch est en cours (même si la Promise n'est pas encore créée)
    // Cette vérification doit être AVANT de définir fetchingRef pour éviter les race conditions
    if (fetchingRef.current) {
      console.log(`[Credits] [${callId}] Fetch flag already set, checking for existing promise...`);
      // Si une Promise existe déjà, la réutiliser
      if (currentFetchPromiseRef.current) {
        console.log(`[Credits] [${callId}] Reusing existing promise`);
        return currentFetchPromiseRef.current;
      }
      // Sinon, attendre un peu que la Promise soit créée
      return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 20; // 20 * 50ms = 1 seconde max
        const checkInterval = setInterval(() => {
          attempts++;
          if (currentFetchPromiseRef.current) {
            clearInterval(checkInterval);
            console.log(`[Credits] [${callId}] Found existing promise after ${attempts * 50}ms`);
            resolve(currentFetchPromiseRef.current);
          } else if (!fetchingRef.current || attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.log(`[Credits] [${callId}] No promise found, giving up`);
            resolve(Promise.resolve());
          }
        }, 50);
      });
    }

    // Éviter les appels trop fréquents (cache de 5 secondes) sauf si forceRefresh
    if (!forceRefresh && timeSinceLastFetch > 0 && timeSinceLastFetch < CACHE_DURATION) {
      console.log(`[Credits] [${callId}] Recent fetch detected (${timeSinceLastFetch}ms ago, cache valid for ${CACHE_DURATION - timeSinceLastFetch}ms more), using cache...`);
      return Promise.resolve();
    }

    console.log(`[Credits] [${callId}] Starting new fetch... (last fetch was ${timeSinceLastFetch}ms ago)`);
    
    // CRITIQUE: Définir les flags AVANT de créer la Promise pour bloquer les appels simultanés
    fetchingRef.current = true;
    lastFetchTimeRef.current = now;
    
    // Créer une Promise partagée pour dédupliquer les appels simultanés
    // CRITIQUE: La stocker IMMÉDIATEMENT dans la ref pour que les appels suivants puissent la réutiliser
    let resolvePromise: (value: void | PromiseLike<void>) => void;
    const fetchPromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    
    // Stocker la Promise IMMÉDIATEMENT pour bloquer les appels simultanés
    currentFetchPromiseRef.current = fetchPromise;
    
    // Maintenant exécuter le fetch asynchrone
    (async () => {
    
    // Lire les valeurs actuelles depuis les refs (toujours à jour)
    const currentSubscription = contextSubscriptionRef.current;
    const currentLoading = contextLoadingRef.current;

    if (showLoading) {
      setLoading(true);
      setError(null);
    }

      // Safety guard: force-resolve skeleton after 3s
      let didTimeout = false;
      const safetyTimer = setTimeout(() => {
        didTimeout = true;
        setLoading(false);
      }, 3000);

      const abortControllers: AbortController[] = [];
      const withTimeout = (ms: number) => {
        const ac = new AbortController();
        abortControllers.push(ac);
        const t = setTimeout(() => ac.abort(), ms);
        return { signal: ac.signal, clear: () => clearTimeout(t) };
      };

      try {
        const supabase = createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setError("Please sign in to view your credits");
          setLoading(false);
          fetchingRef.current = false;
          return;
        }

        // Attendre un peu que le contexte charge la subscription si elle est en cours de chargement
        // Cela évite de faire un fetch alors que le contexte va charger les données
        if (currentLoading) {
          console.log("[Credits] Context still loading, waiting a bit...");
          // Attendre max 1 seconde que le contexte charge
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Fetch balance
        let balance = 0;
        let isFreeUser = false;
        let quotas: CreditsData["quotas"] = undefined;
        let renewsAt: CreditsData["renewsAt"] = undefined;
        
        // Utiliser subscription depuis le contexte si disponible
        // Ne PAS faire de fallback API ici - le contexte gère déjà la récupération
        // Si subscription n'est pas disponible, c'est qu'il n'y en a pas ou qu'elle est en cours de chargement
        let subscription = null;
        if (currentSubscription) {
          // Utiliser les données du contexte (pas besoin d'appel API)
          subscription = {
            plan: currentSubscription.plan,
            status: currentSubscription.status,
            renewsAt: new Date(currentSubscription.renewsAt),
          };
        }
        // Pas de fallback API - on attend que le contexte charge les données
        // Cela évite les appels API dupliqués
        
        console.log(`[Credits] [${callId}] 🔄 Fetching credits data...`, {
          hasSubscription: !!currentSubscription,
          isLoading: currentLoading,
          forceRefresh,
        });
        
        // Paralléliser les 2 requêtes indépendantes (balance et history)
        // Plus besoin de récupérer subscription ici car on l'a depuis le contexte
        const [balanceResult, historyResult] = await Promise.allSettled([
          // Balance request
          (async () => {
            try {
              const tt = withTimeout(3000);
              const response = await fetch("/api/credits/balance", {
                credentials: "include",
                cache: "no-store",
                signal: tt.signal,
              });
              tt.clear();
              if (response.ok) {
                return await response.json();
              }
              console.warn("Failed to fetch balance:", response.status);
              return null;
            } catch (err) {
              console.warn("Error fetching balance:", err);
              return null;
            }
          })(),
          // History request
          (async () => {
            try {
              const tt = withTimeout(3000);
              const response = await fetch("/api/credits/history?limit=10", {
                credentials: "include",
                cache: "no-store",
                signal: tt.signal,
              });
              tt.clear();
              if (response.ok) {
                return await response.json();
              }
              console.warn("Failed to fetch history:", response.status);
              return { items: [], nextCursor: null };
            } catch (err) {
              console.warn("Error fetching history:", err);
              return { items: [], nextCursor: null };
            }
          })(),
        ]);

        // Traiter les résultats
        if (balanceResult.status === "fulfilled" && balanceResult.value) {
          const data = balanceResult.value;
          balance = data.credits || 0;
          isFreeUser = data.isFreeUser || false;
          quotas = data.quotas;
          renewsAt = data.renewsAt;
        }

        const history = historyResult.status === "fulfilled" && historyResult.value
          ? historyResult.value
          : { items: [], nextCursor: null };

        setCreditsData({
          balance,
          history,
          subscription,
          isFreeUser,
          quotas,
          renewsAt,
        });
      } catch (err) {
        console.error("Error in fetchCreditsData:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load credits data"
        );
      } finally {
        // Always clear skeleton unless safety timer already did
        if (!didTimeout && showLoading) setLoading(false);
        clearTimeout(safetyTimer);
        console.log(`[Credits] [${callId}] Fetch completed, resetting flag`);
        fetchingRef.current = false; // Réinitialiser le flag
        currentFetchPromiseRef.current = null; // Réinitialiser la Promise partagée
        // Résoudre la Promise pour que les appels en attente puissent continuer
        resolvePromise!();
      }
    })();
    
    // Attendre la fin du fetch
    await fetchPromise;
  }, []); // Pas de dépendances - fonction stable, on lit contextSubscription directement dans le corps

  // Force refresh when component mounts or pathname changes to /credits
  useEffect(() => {
    // Reset state when pathname changes (navigation)
    setLoading(true);
    setCreditsData(null);
    setError(null);
    fetchingRef.current = false; // Réinitialiser le flag lors du changement de route
    lastFetchTimeRef.current = 0; // Reset cache on route change - FORCE refresh

    // Attendre un peu que le contexte se charge avant de faire le fetch initial
    // Cela évite les appels API inutiles si le contexte charge rapidement
    // Forcer le rafraîchissement à chaque ouverture de la page /credits
    const timer = setTimeout(() => {
      fetchCreditsData(true, true); // forceRefresh = true pour toujours rafraîchir
    }, 200); // Petit délai pour laisser le contexte se charger

    return () => {
      clearTimeout(timer);
      // Abort any in-flight requests on unmount
      fetchingRef.current = false; // Réinitialiser le flag lors du démontage
    };
  }, [pathname]); // Seulement pathname - fetchCreditsData est stable

  // Force refresh when component mounts (even if pathname doesn't change)
  // Cela garantit que les données sont toujours à jour quand on arrive sur /credits
  useEffect(() => {
    // Forcer le rafraîchissement au montage du composant
    const timer = setTimeout(() => {
      // Vérifier qu'on est bien sur la page /credits
      if (pathname === "/credits") {
        console.log("[Credits] Component mounted on /credits, forcing refresh...");
        // Réinitialiser le cache pour forcer le rafraîchissement
        lastFetchTimeRef.current = 0;
        fetchCreditsData(true, true); // forceRefresh = true
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [pathname]); // Se déclencher aussi si pathname change vers /credits

  // Mettre à jour les données quand contextSubscription change (après le chargement initial)
  useEffect(() => {
    if (!contextLoading) {
      setCreditsData(prev => {
        if (!prev) return prev;
        
        if (contextSubscription) {
          // Mettre à jour uniquement la subscription dans creditsData si elle a changé
          const updatedSubscription = {
            plan: contextSubscription.plan,
            status: contextSubscription.status,
            renewsAt: new Date(contextSubscription.renewsAt),
          };
          
          // Vérifier si la subscription a réellement changé
          const currentPlan = prev.subscription?.plan;
          const currentStatus = prev.subscription?.status;
          const currentRenewsAt = prev.subscription?.renewsAt?.getTime();
          const updatedRenewsAt = updatedSubscription.renewsAt.getTime();
          
          if (
            currentPlan !== updatedSubscription.plan || 
            currentStatus !== updatedSubscription.status ||
            currentRenewsAt !== updatedRenewsAt
          ) {
            return {
              ...prev,
              subscription: updatedSubscription,
            };
          }
        } else if (prev.subscription) {
          // Si le contexte indique qu'il n'y a plus de subscription, mettre à jour
          return {
            ...prev,
            subscription: null,
          };
        }
        
        return prev; // Pas de changement
      });
    }
  }, [contextSubscription, contextLoading]); // Retirer creditsData des dépendances pour éviter les boucles

  // Auto-refresh when window regains focus (user comes back from another tab/window)
  useEffect(() => {
    let focusTimeout: NodeJS.Timeout;
    const handleFocus = () => {
      // Debounce pour éviter les appels multiples rapides
      clearTimeout(focusTimeout);
      focusTimeout = setTimeout(() => {
        // Vérifier le cache avant de refresh
        const now = Date.now();
        if (now - lastFetchTimeRef.current < CACHE_DURATION) {
          console.log("[Credits] Window focused but cache still valid, skipping refresh");
          return;
        }
        
        if (fetchingRef.current) {
          console.log("[Credits] Fetch in progress, skipping focus refresh");
          return;
        }
        console.log("[Credits] Window focused, refreshing credits data...");
        fetchCreditsData(false, false); // Don't show loading spinner, respect cache
      }, 500); // Debounce de 500ms
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      clearTimeout(focusTimeout);
      window.removeEventListener("focus", handleFocus);
    };
  }, []); // Pas de dépendances - fetchCreditsData est stable

  // Listen for custom credit update events
  useEffect(() => {
    let updateTimeout: NodeJS.Timeout;
    const handleCreditUpdate = () => {
      // Debounce pour éviter les appels multiples rapides
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        if (fetchingRef.current) {
          console.log("[Credits] Fetch in progress, skipping credit update refresh");
          return;
        }
        console.log("[Credits] Credit update event received, refreshing...");
        fetchCreditsData(false, true); // Don't show loading spinner, force refresh (important pour crédits)
      }, 300); // Debounce de 300ms
    };

    window.addEventListener("credits:updated", handleCreditUpdate);
    return () => {
      clearTimeout(updateTimeout);
      window.removeEventListener("credits:updated", handleCreditUpdate);
    };
  }, []); // Pas de dépendances - fetchCreditsData est stable

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="lg:col-span-2 h-32 bg-gray-200 rounded"></div>
          </div>
          <div className="mt-6 h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">
          <svg
            className="w-12 h-12 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <p className="text-red-600 mb-4">{error}</p>
        <a
          href="/credits"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          View Full Credits Page
        </a>
      </div>
    );
  }

  if (!creditsData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No credits data available</p>
      </div>
    );
  }

  // Déterminer si on doit afficher le message d'upgrade
  const shouldShowUpgradeMessage =
    creditsData.balance < 10 && // Crédits bas (moins de 10)
    creditsData.subscription?.plan !== "PRO" && // Pas déjà sur le plan PRO
    creditsData.subscription?.plan !== "BASIC"; // Pas déjà sur le plan BASIC

  return (
    <div className="space-y-6">
      {/* Insufficient Credits Banner - Only show for paid users, not Free users */}
      {creditsData.balance === 0 && !creditsData.isFreeUser && <InsufficientCreditsBanner />}

      {/* Message discret d'upgrade si crédits bas et pas PRO */}
      {shouldShowUpgradeMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-sm text-gray-700">
            Need more credits?{" "}
            <Link
              href="/account-settings?tab=subscription"
              className="text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Upgrade to Pro
            </Link>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Subscription Info - Now on the left */}
        <div className="lg:col-span-1 flex">
          <SubscriptionInfo subscription={creditsData.subscription} />
        </div>

        {/* Credit Balance Card / Daily Quotas - Now on the right with more space */}
        <div className="lg:col-span-2 flex">
          <CreditBalanceCard 
            balance={creditsData.balance} 
            isFreeUser={creditsData.isFreeUser}
            renewsAt={creditsData.renewsAt || creditsData.subscription?.renewsAt}
            status={creditsData.subscription?.status}
          />
        </div>
      </div>

      {/* Usage History */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Usage
        </h3>
        <UsageHistoryTable history={creditsData.history} />
      </div>
    </div>
  );
}
