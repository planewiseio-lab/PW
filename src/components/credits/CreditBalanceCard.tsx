"use client";

interface CreditBalanceCardProps {
  balance: number;
  isFreeUser?: boolean;
  renewsAt?: Date | string;
  status?: string;
}

export function CreditBalanceCard({ balance, isFreeUser, renewsAt, status }: CreditBalanceCardProps) {
  // Pour tous les utilisateurs (FREE inclus), afficher les crédits avec la date de renouvellement
  const renewsAtDate = renewsAt ? new Date(renewsAt) : null;
  const isCanceled = status === "CANCELED" || status === "Canceled";

  return (
    <div className="bg-white rounded-lg shadow p-6 h-full w-full flex flex-col justify-center">
      <div className="text-center">
        <div className="text-4xl font-bold text-blue-600 mb-2">
          {balance.toLocaleString()}
        </div>
        <div className="text-lg text-gray-600 mb-4">Current Credits</div>
        <div className="text-sm text-gray-500 mb-4">Credit costs vary by action type</div>
        
        {renewsAtDate && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-1">
              {isCanceled ? "Ends on" : "Renews on"}
            </div>
            <div className="text-sm font-medium text-gray-900">
              {renewsAtDate.toLocaleDateString("en-CA", {
                timeZone: "America/Toronto",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
