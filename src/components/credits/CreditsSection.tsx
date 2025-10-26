"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    const fetchCreditsData = async () => {
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
        const balanceResponse = await fetch("/api/credits/balance", {
          credentials: "include",
        });
        if (!balanceResponse.ok) {
          throw new Error("Failed to fetch balance");
        }
        const { credits: balance } = await balanceResponse.json();

        // Fetch history
        const historyResponse = await fetch("/api/credits/history?limit=10", {
          credentials: "include",
        });
        if (!historyResponse.ok) {
          throw new Error("Failed to fetch history");
        }
        const history = await historyResponse.json();

        // Fetch subscription info (mock for now)
        const subscription = {
          plan: "FREE",
          status: "ACTIVE",
          renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        };

        setCreditsData({
          balance,
          history,
          subscription,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load credits data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCreditsData();
  }, []);

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
          href="/account/usage"
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

  return (
    <div className="space-y-6">
      {/* Insufficient Credits Banner */}
      {creditsData.balance === 0 && <InsufficientCreditsBanner />}

      {/* Credit Usage Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Aircraft Search Credit Usage
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Each aircraft search costs <strong>2 credits</strong>:</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li><strong>1 credit</strong> for aircraft data (registration, type, airline, etc.)</li>
                <li><strong>1 credit</strong> for aircraft images (photos from AeroDataBox)</li>
              </ul>
              <p className="mt-2 text-xs">
                This ensures you get both detailed aircraft information and high-quality images in one search.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Credit Balance Card */}
        <div className="lg:col-span-1">
          <CreditBalanceCard balance={creditsData.balance} />
        </div>

        {/* Subscription Info */}
        <div className="lg:col-span-2">
          <SubscriptionInfo subscription={creditsData.subscription} />
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
