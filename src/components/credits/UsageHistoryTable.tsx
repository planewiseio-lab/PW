"use client";

import { CreditReason, ActionType } from "@prisma/client";

interface UsageHistoryItem {
  id: string;
  delta: number;
  reason: CreditReason;
  actionType: ActionType | null;
  refId: string | null;
  metadata: any;
  createdAt: Date;
}

interface UsageHistoryTableProps {
  history: {
    items: UsageHistoryItem[];
    nextCursor: string | null;
  };
}

export function UsageHistoryTable({ history }: UsageHistoryTableProps) {
  const { items, nextCursor } = history;

  const reasonLabels = {
    ACTION: "Action",
    MONTHLY_TOPUP: "Monthly Top-up",
    MANUAL_ADJUST: "Manual Adjustment",
    PURCHASE: "Purchase",
    REFUND: "Refund",
    ADMIN_FIX: "Admin Fix",
  };

  const actionTypeLabels = {
    AIRCRAFT_LOOKUP: "Aircraft Data",
    AIRCRAFT_IMAGES: "Aircraft Images",
    VIEW_FLIGHT_HISTORY: "Flight History",
    BROWSE_FLIGHT: "Browse Flight",
    BROWSE_AIRPORT: "Browse Airport",
    UNKNOWN: "Unknown",
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">No usage history</div>
          <div className="text-sm">Your usage history will appear here</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Change
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reference
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`font-medium ${
                      item.delta > 0 
                        ? "text-green-600" 
                        : item.delta < 0 
                        ? "text-red-600" 
                        : "text-gray-500"
                    }`}
                  >
                    {item.delta > 0 ? "+" : ""}
                    {item.delta === 0 ? "0" : item.delta}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {reasonLabels[item.reason]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.actionType ? (
                    <div>
                      <div>{actionTypeLabels[item.actionType]}</div>
                      {item.metadata?.actionSubType && (
                        <div className="text-xs text-gray-500">
                          ({item.metadata.actionSubType.replace('AIRCRAFT_', '').toLowerCase()})
                        </div>
                      )}
                      {item.delta === 0 && item.metadata?.quotaType && (
                        <div className="text-xs text-blue-500 mt-1">
                          Quota: {item.metadata.quotaType === "aircraft" ? "Aircraft Lookup" : "General"}
                        </div>
                      )}
                    </div>
                  ) : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.refId || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
