"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
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
}

export function CreditsSection() {
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  // Extract fetch logic to a reusable function with useCallback
  const fetchCreditsData = useCallback(async (showLoading = true) => {
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
          return;
        }

        // Fetch balance
        let balance = 0;
        let isFreeUser = false;
        let quotas: CreditsData["quotas"] = undefined;
        try {
          const tt = withTimeout(3000);
          const balanceResponse = await fetch("/api/credits/balance", {
            credentials: "include",
            cache: "no-store",
            signal: tt.signal,
          });
          tt.clear();
          if (balanceResponse.ok) {
            const data = await balanceResponse.json();
            balance = data.credits || 0;
            isFreeUser = data.isFreeUser || false;
            quotas = data.quotas;
          } else {
            console.warn("Failed to fetch balance:", balanceResponse.status);
          }
        } catch (err) {
          console.warn("Error fetching balance:", err);
        }

        // Fetch history
        let history = { items: [], nextCursor: null };
        try {
          const tt = withTimeout(3000);
          const historyResponse = await fetch("/api/credits/history?limit=10", {
            credentials: "include",
            cache: "no-store",
            signal: tt.signal,
          });
          tt.clear();
          if (historyResponse.ok) {
            history = await historyResponse.json();
          } else {
            console.warn("Failed to fetch history:", historyResponse.status);
          }
        } catch (err) {
          console.warn("Error fetching history:", err);
        }

      // Fetch subscription info
      let subscription = null;
      try {
        const tt = withTimeout(3000);
        const subscriptionResponse = await fetch("/api/user/subscription", {
          credentials: "include",
          cache: "no-store",
          signal: tt.signal,
        });
        tt.clear();
        if (subscriptionResponse.ok) {
          const data = await subscriptionResponse.json();
          if (data.subscription) {
            subscription = {
              plan: data.subscription.plan,
              status: data.subscription.status,
              renewsAt: new Date(data.subscription.renewsAt),
            };
          }
        } else {
          console.warn("Failed to fetch subscription:", subscriptionResponse.status);
        }
      } catch (err) {
        console.warn("Error fetching subscription:", err);
      }

        setCreditsData({
          balance,
          history,
          subscription,
          isFreeUser,
          quotas,
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
      }
  }, []); // No dependencies - function is stable

  useEffect(() => {
    // Reset state when pathname changes (navigation)
    setLoading(true);
    setCreditsData(null);
    setError(null);

    // Initial fetch
    fetchCreditsData();

    return () => {
      // Abort any in-flight requests on unmount
      // Note: abortControllers is closed over inside fetchCreditsData, but
      // we ensure individual requests time out via their own timers.
    };
  }, [pathname, fetchCreditsData]); // Re-run when pathname changes (navigation)

  // Auto-refresh when window regains focus (user comes back from another tab/window)
  useEffect(() => {
    const handleFocus = () => {
      console.log("[Credits] Window focused, refreshing credits data...");
      fetchCreditsData(false); // Don't show loading spinner on auto-refresh
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchCreditsData]); // Include fetchCreditsData as dependency

  // Listen for custom credit update events
  useEffect(() => {
    const handleCreditUpdate = () => {
      console.log("[Credits] Credit update event received, refreshing...");
      fetchCreditsData(false); // Don't show loading spinner on event-based refresh
    };

    window.addEventListener("credits:updated", handleCreditUpdate);
    return () => {
      window.removeEventListener("credits:updated", handleCreditUpdate);
    };
  }, [fetchCreditsData]); // Include fetchCreditsData as dependency

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
    creditsData.subscription?.plan !== "BUSINESS"; // Pas déjà sur le plan BUSINESS

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
            quotas={creditsData.quotas}
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
