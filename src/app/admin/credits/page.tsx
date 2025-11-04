import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { AdminUserSearch } from "@/components/admin/AdminUserSearch";
import { AdminCreditManagement } from "@/components/admin/AdminCreditManagement";
import { prisma } from "@/lib/prisma";
import { AdminCreditsClient } from "./AdminCreditsClient";
import { verifyAdmin } from "@/lib/security/verifyAdmin";

async function getAdminUser(userId: string) {
  const subscription = await prisma.subscriptions.findUnique({
    where: { userId },
  });

  const creditBalance = await prisma.credit_balances.findUnique({
    where: { userId },
  });

  const creditLedger = await prisma.credit_ledger.findMany({
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

  // Vérification sécurisée de l'admin (double vérification : métadonnées + whitelist)
  const isAdmin = verifyAdmin(user);

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
    <div className="min-h-screen bg-white py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Credit Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage user credits and view audit trails
          </p>
        </div>

        <AdminCreditsClient />
      </div>
    </div>
  );
}
