import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { AdminUserSearch } from "@/components/admin/AdminUserSearch";
import { AdminCreditManagement } from "@/components/admin/AdminCreditManagement";
import { prisma } from "@/lib/prisma";

async function getAdminUser(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const creditBalance = await prisma.creditBalance.findUnique({
    where: { userId },
  });

  const creditLedger = await prisma.creditLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return {
    subscription,
    creditBalance,
    creditLedger,
  };
}

export default async function AdminCreditsPage() {
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
        </div>
      </div>
    );
  }

  // Check if user is admin
  const isAdmin =
    user.user_metadata?.role === "admin" || user.app_metadata?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600 mt-2">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Credit Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage user credits and view audit trails
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Search */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Search User
            </h2>
            <Suspense
              fallback={
                <div className="animate-pulse h-32 bg-gray-200 rounded"></div>
              }
            >
              <AdminUserSearch />
            </Suspense>
          </div>

          {/* Credit Management */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Credit Operations
            </h2>
            <Suspense
              fallback={
                <div className="animate-pulse h-32 bg-gray-200 rounded"></div>
              }
            >
              <AdminCreditManagement />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
