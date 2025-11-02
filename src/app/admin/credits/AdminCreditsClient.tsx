"use client";

import { useState, Suspense } from "react";
import { AdminUserSearch } from "@/components/admin/AdminUserSearch";
import { AdminCreditManagement } from "@/components/admin/AdminCreditManagement";
import { AllUsersSection } from "@/components/admin/AllUsersSection";

export function AdminCreditsClient() {
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
  };

  return (
    <div className="space-y-8">
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
            <AdminUserSearch onUserSelect={handleUserSelect} />
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
            <AdminCreditManagement selectedUserId={selectedUserId} />
          </Suspense>
        </div>
      </div>

      {/* All Users Section with Filters */}
      <AllUsersSection />
    </div>
  );
}
