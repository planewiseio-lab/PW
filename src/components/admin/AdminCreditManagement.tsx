"use client";

import { useState } from "react";

export function AdminCreditManagement() {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("MANUAL_ADJUST");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGrantCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !amount) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/credits/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amount: parseInt(amount),
          reason,
          metadata: { note, adminAction: true },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(`Successfully granted ${amount} credits to user ${userId}`);
        setUserId("");
        setAmount("");
        setNote("");
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleGrantCredits} className="space-y-4">
        <div>
          <label
            htmlFor="userId"
            className="block text-sm font-medium text-gray-700"
          >
            User ID
          </label>
          <input
            type="text"
            id="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="User ID"
            required
          />
        </div>

        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-gray-700"
          >
            Amount
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="100"
            required
            min="1"
          />
        </div>

        <div>
          <label
            htmlFor="reason"
            className="block text-sm font-medium text-gray-700"
          >
            Reason
          </label>
          <select
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="MANUAL_ADJUST">Manual Adjustment</option>
            <option value="MONTHLY_TOPUP">Monthly Top-up</option>
            <option value="PURCHASE">Purchase</option>
            <option value="REFUND">Refund</option>
            <option value="ADMIN_FIX">Admin Fix</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="note"
            className="block text-sm font-medium text-gray-700"
          >
            Note
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            rows={3}
            placeholder="Optional note about this credit adjustment"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {isLoading ? "Processing..." : "Grant Credits"}
        </button>
      </form>

      {result && (
        <div
          className={`mt-4 p-3 rounded-md ${
            result.startsWith("Successfully")
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {result}
        </div>
      )}
    </div>
  );
}
