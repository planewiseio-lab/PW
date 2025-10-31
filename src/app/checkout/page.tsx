"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planParam = searchParams.get("plan");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCheckout = async () => {
      if (!planParam) {
        setError("No plan specified. Please select a plan.");
        setLoading(false);
        return;
      }

      // Map des noms de plans vers les codes Prisma
      const planMapping: Record<string, string> = {
        basic: "BASIC",
        pro: "PRO",
        business: "BUSINESS",
      };

      const plan = planMapping[planParam.toLowerCase()];
      
      if (!plan) {
        setError(
          `Invalid plan: ${planParam}. Valid plans are: basic, pro, business`
        );
        setLoading(false);
        return;
      }

      try {
        // Appeler l'API pour créer la session Checkout
        const response = await fetch("/api/stripe/create-checkout-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ plan }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create checkout session");
        }

        const data = await response.json();

        // Rediriger vers Stripe Checkout
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("No checkout URL received from server");
        }
      } catch (err: any) {
        console.error("Error creating checkout session:", err);
        setError(err.message || "Failed to create checkout session. Please try again.");
        setLoading(false);
      }
    };

    handleCheckout();
  }, [planParam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Redirecting to Stripe Checkout...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center"
        >
          <div className="text-red-500 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => router.back()}
              className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Go Back
            </button>
            <a
              href="/credits"
              className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition"
            >
              View Credits
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}


