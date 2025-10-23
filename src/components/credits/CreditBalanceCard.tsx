"use client";

interface CreditBalanceCardProps {
  balance: number;
}

export function CreditBalanceCard({ balance }: CreditBalanceCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-center">
        <div className="text-4xl font-bold text-blue-600 mb-2">
          {balance.toLocaleString()}
        </div>
        <div className="text-lg text-gray-600 mb-4">Current Credits</div>
        <div className="text-sm text-gray-500">Each action costs 1 credit</div>

        {balance === 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-800">
              <strong>No credits remaining</strong>
              <br />
              Get credits to continue using the service
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
