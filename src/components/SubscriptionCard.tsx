"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface Plan {
  name: string;
  price: string;
  description: string;
  features: string[];
  requests: string;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for getting started",
    features: [
      "Basic aircraft lookup",
      "Basic specs & photos",
      "5 requests per day",
      "Community support",
    ],
    requests: "5 requests/day",
  },
  {
    name: "Basic",
    price: "$9.99",
    description: "For aviation enthusiasts",
    features: [
      "Everything in Free",
      "7-day detailed flight history",
      "Detailed airport flight board",
      "500 requests per month",
      "Email support",
    ],
    requests: "500 requests/month",
    popular: true,
  },
  {
    name: "Pro",
    price: "$19.99",
    description: "For professionals",
    features: [
      "Everything in Basic",
      "30-day detailed flight history",
      "Real-time flight tracking",
      "Advanced analytics",
      "2500 requests per month",
      "Priority support",
      "API access",
    ],
    requests: "2500 requests/month",
  },
];

export default function SubscriptionCard() {
  const [selectedPlan, setSelectedPlan] = useState<string>("Basic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Mapping des noms de plans aux plans Prisma
  const planMapping: Record<string, string> = {
    Free: "FREE",
    Basic: "BASIC",
    Pro: "PRO",
  };

  const handleSubscribe = async () => {
    if (selectedPlan === "Free") {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const plan = planMapping[selectedPlan];
      if (!plan) {
        throw new Error(`Invalid plan: ${selectedPlan}`);
      }

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
        throw new Error("No checkout URL received");
      }
    } catch (err: any) {
      console.error("Error creating checkout session:", err);
      setError(err.message || "Failed to create checkout session. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Upgrade Your Plan
      </h3>

      <div className="space-y-4">
        {plans.map((plan) => (
          <motion.div
            key={plan.name}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedPlan === plan.name
                ? "border-[#178cf2] bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            } ${plan.popular ? "ring-2 ring-[#178cf2] ring-opacity-20" : ""}`}
            onClick={() => setSelectedPlan(plan.name)}
          >
            {plan.popular && (
              <div className="absolute -top-2 left-4">
                <span className="bg-[#178cf2] text-white text-xs font-semibold px-2 py-1 rounded-full">
                  Popular
                </span>
              </div>
            )}

            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">{plan.name}</h4>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {plan.price}
                </div>
                <div className="text-sm text-gray-500">/month</div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">{plan.description}</p>

            <div className="space-y-1 mb-4">
              {plan.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center text-sm text-gray-700"
                >
                  <span className="text-green-500 mr-2">✓</span>
                  {feature}
                </div>
              ))}
            </div>

            <div className="text-xs text-gray-500 mb-3">{plan.requests}</div>

            <button
              className={`w-full py-2 px-4 rounded-lg font-semibold transition ${
                selectedPlan === plan.name
                  ? "bg-[#178cf2] text-white hover:brightness-110"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {plan.name === "Free" ? "Current Plan" : "Select Plan"}
            </button>
          </motion.div>
        ))}
      </div>

      {selectedPlan !== "Free" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-gray-50 rounded-lg"
        >
          <h4 className="font-semibold text-gray-900 mb-2">Payment</h4>
          <p className="text-sm text-gray-600 mb-4">
            Secure payment processing with Stripe
          </p>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-[#178cf2] text-white py-2 px-4 rounded-lg font-semibold hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Creating checkout session...
              </>
            ) : (
              `Subscribe to ${selectedPlan}`
            )}
          </button>
        </motion.div>
      )}
    </div>
  );
}
