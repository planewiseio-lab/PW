"use client";

import { Plan, SubscriptionStatus } from "@prisma/client";

interface SubscriptionInfoProps {
  subscription: {
    plan: Plan;
    status: SubscriptionStatus;
    renewsAt: Date;
  } | null;
}

export function SubscriptionInfo({ subscription }: SubscriptionInfoProps) {
  // Vérifier si l'abonnement est null ou si c'est un plan FREE sans date de renouvellement valide
  const isActiveSubscription = subscription && (
    subscription.plan !== Plan.FREE || 
    (subscription.renewsAt && new Date(subscription.renewsAt) > new Date())
  );
  
  // Vérifier si l'abonnement est canceled mais encore actif (renewsAt dans le futur)
  const isCanceledButActive = subscription && 
    subscription.status === SubscriptionStatus.CANCELED &&
    subscription.renewsAt &&
    new Date(subscription.renewsAt) > new Date();
  
  if (!isActiveSubscription && !isCanceledButActive) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-full w-full flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Subscription
        </h3>
        <div className="text-gray-500">No active subscription</div>
      </div>
    );
  }

  const planLabels = {
    FREE: "Free",
    PRO: "Pro",
    BASIC: "Basic",
  };

  const statusLabels = {
    ACTIVE: "Active",
    PAST_DUE: "Past Due",
    CANCELED: "Canceled",
  };

  const statusColors = {
    ACTIVE: "text-green-600 bg-green-100",
    PAST_DUE: "text-yellow-600 bg-yellow-100",
    CANCELED: "text-red-600 bg-red-100",
  };

  const isFreePlan = subscription.plan === Plan.FREE;

  return (
    <div className="bg-white rounded-lg shadow p-6 h-full w-full flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h3>

      <div className={`grid grid-cols-1 ${isFreePlan ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4`}>
        <div>
          <div className="text-sm text-gray-500">Plan</div>
          <div className="font-medium text-gray-900">
            {planLabels[subscription.plan]}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500">Status</div>
          <div className="flex items-center">
            <span
              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                statusColors[subscription.status]
              }`}
            >
              {statusLabels[subscription.status]}
            </span>
          </div>
        </div>

          <div>
            <div className="text-sm text-gray-500">
              {subscription.status === SubscriptionStatus.CANCELED ? "Ends on" : "Renews on"}
            </div>
            <div className="font-medium text-gray-900">
              {new Date(subscription.renewsAt).toLocaleDateString("en-CA", {
                timeZone: "America/Toronto",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })}
            </div>
          </div>
      </div>
    </div>
  );
}
