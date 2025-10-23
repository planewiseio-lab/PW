import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, getUsageHistory } from "@/lib/credits";
import { CreditBalanceCard } from "@/components/credits/CreditBalanceCard";
import { UsageHistoryTable } from "@/components/credits/UsageHistoryTable";
import { SubscriptionInfo } from "@/components/credits/SubscriptionInfo";
import { InsufficientCreditsBanner } from "@/components/credits/InsufficientCreditsBanner";
import { prisma } from "@/lib/prisma";

async function getSubscriptionInfo(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  return subscription;
}

async function getUsageData(userId: string) {
  const [balance, history] = await Promise.all([
    getCreditBalance(userId),
    getUsageHistory(userId, 50),
  ]);

  return { balance, history };
}

export default async function UsagePage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Please sign in</h1>
          <p className="text-gray-600 mt-2">
            You need to be signed in to view your usage.
          </p>
        </div>
      </div>
    );
  }

  const [subscription, usageData] = await Promise.all([
    getSubscriptionInfo(user.id),
    getUsageData(user.id),
  ]);

  return (
    <div className="bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Usage & Credits</h1>
          <p className="text-gray-600 mt-1">
            Manage your credit balance and view usage history
          </p>
        </div>

        {/* Insufficient Credits Banner */}
        {usageData.balance === 0 && <InsufficientCreditsBanner />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Credit Balance Card */}
          <div className="lg:col-span-1">
            <CreditBalanceCard balance={usageData.balance} />
          </div>

          {/* Subscription Info */}
          <div className="lg:col-span-2">
            <SubscriptionInfo subscription={subscription} />
          </div>
        </div>

        {/* Usage History */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Usage History
          </h2>
          <Suspense fallback={<UsageHistorySkeleton />}>
            <UsageHistoryTable history={usageData.history} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function UsageHistorySkeleton() {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/6"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
