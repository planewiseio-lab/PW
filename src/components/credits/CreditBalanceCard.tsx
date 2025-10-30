"use client";

interface CreditBalanceCardProps {
  balance: number;
}

export function CreditBalanceCard({ balance }: CreditBalanceCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 h-full w-full flex flex-col justify-center">
      <div className="text-center">
        <div className="text-4xl font-bold text-blue-600 mb-2">
          {balance.toLocaleString()}
        </div>
        <div className="text-lg text-gray-600 mb-4">Current Credits</div>
        <div className="text-sm text-gray-500">Each action costs 1 credit</div>
      </div>
    </div>
  );
}
