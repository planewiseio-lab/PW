"use client";

import { useState } from "react";
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
          <button className="w-full bg-[#178cf2] text-white py-2 px-4 rounded-lg font-semibold hover:brightness-110 transition">
            Subscribe to {selectedPlan}
          </button>
        </motion.div>
      )}
    </div>
  );
}
