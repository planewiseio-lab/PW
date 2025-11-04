"use client";

import { useState, FormEvent, useEffect } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { motion } from "framer-motion";

interface PaymentFormProps {
  clientSecret: string;
  plan: string;
  priceId: string;
  customerId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export default function PaymentForm({
  clientSecret,
  plan,
  priceId,
  customerId,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Vérifier que Stripe est chargé
  useEffect(() => {
    if (!stripe) {
      console.warn("Stripe is not loaded yet");
    }
  }, [stripe]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Confirmer le SetupIntent
      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          // Ne pas rediriger automatiquement, on gère la redirection après confirmation
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: "if_required", // Rediriger seulement si nécessaire (3D Secure)
      });

      if (setupError) {
        throw new Error(setupError.message || "Setup failed");
      }

      if (!setupIntent?.payment_method) {
        throw new Error("Payment method not attached");
      }

      // Confirmer la subscription
      const response = await fetch("/api/stripe/confirm-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          paymentMethodId: setupIntent.payment_method as string,
          priceId: priceId,
          plan: plan,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to confirm subscription");
      }

      onSuccess();
    } catch (err: any) {
      console.error("Payment error:", err);
      const errorMsg = err.message || "Payment failed. Please try again.";
      setErrorMessage(errorMsg);
      onError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
        >
          {errorMessage}
        </motion.div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            Processing...
          </>
        ) : (
          `Subscribe to ${plan} Plan`
        )}
      </button>
    </form>
  );
}

