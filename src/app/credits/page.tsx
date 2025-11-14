"use client";

import { CreditsSection } from "@/components/credits/CreditsSection";

export default function CreditsPage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Credits & Usage</h1>
          <p className="text-gray-600 mt-1">
            Manage your credit balance and view usage history
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Learn{" "}
            <a
              href="/about-us#credit-usage"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              how credits are used
            </a>
          </p>
        </div>

        <CreditsSection />
      </div>
    </div>
  );
}
