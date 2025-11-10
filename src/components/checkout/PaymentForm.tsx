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

// Fonction pour traduire les messages d'erreur Stripe en anglais
function translateStripeError(message: string): string {
  const translations: Record<string, string> = {
    // Erreurs de carte
    "Votre carte a été refusée.": "Your card was declined.",
    "Votre carte a expiré.": "Your card has expired.",
    "Le numéro de carte est incorrect.": "Your card number is incorrect.",
    "Le code de sécurité est incorrect.": "Your card's security code is incorrect.",
    "Votre code postal est incorrect.": "Your postal code is incorrect.",
    "Votre carte n'a pas assez de fonds.": "Your card has insufficient funds.",
    "Votre carte a été refusée. Veuillez contacter votre banque pour plus d'informations.": "Your card was declined. Please contact your bank for more information.",
    "Une erreur s'est produite lors du traitement de votre carte. Veuillez réessayer.": "An error occurred while processing your card. Please try again.",
    "Cette carte n'est pas prise en charge.": "This card is not supported.",
    "Le format de la date d'expiration est incorrect.": "The expiration date format is incorrect.",
    "Le format du code de sécurité est incorrect.": "The security code format is incorrect.",
    "Le format du numéro de carte est incorrect.": "The card number format is incorrect.",
    // Erreurs générales
    "Échec de la configuration.": "Setup failed.",
    "Le mode de paiement n'a pas été attaché.": "Payment method not attached.",
    "Le paiement a échoué. Veuillez réessayer.": "Payment failed. Please try again.",
    "Échec de la confirmation de l'abonnement.": "Failed to confirm subscription.",
  };

  // Chercher une traduction exacte
  if (translations[message]) {
    return translations[message];
  }

  // Chercher des traductions partielles (pour les messages qui varient)
  for (const [french, english] of Object.entries(translations)) {
    if (message.toLowerCase().includes(french.toLowerCase().substring(0, 20))) {
      return english;
    }
  }

  // Si le message contient des mots-clés français, essayer de le traduire
  if (message.includes("refusée") || message.includes("refusé")) {
    return "Your card was declined. Please try a different payment method.";
  }
  if (message.includes("expiré") || message.includes("expirée")) {
    return "Your card has expired. Please use a different card.";
  }
  if (message.includes("incorrect")) {
    return "Your card information is incorrect. Please check and try again.";
  }
  if (message.includes("fonds insuffisants") || message.includes("insuffisant")) {
    return "Your card has insufficient funds. Please try a different payment method.";
  }
  if (message.includes("erreur")) {
    return "An error occurred while processing your payment. Please try again.";
  }

  // Retourner le message original s'il est déjà en anglais ou non reconnu
  return message;
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
        const translatedError = translateStripeError(setupError.message || "Setup failed");
        throw new Error(translatedError);
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
        const translatedError = translateStripeError(errorData.error || "Failed to confirm subscription");
        throw new Error(translatedError);
      }

      onSuccess();
    } catch (err: any) {
      console.error("Payment error:", err);
      const errorMsg = translateStripeError(err.message || "Payment failed. Please try again.");
      setErrorMessage(errorMsg);
      // Ne pas appeler onError pour éviter la duplication d'affichage
      // onError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border-2 border-red-400 text-red-800 px-4 py-4 rounded-lg text-sm font-medium flex items-start gap-3"
          role="alert"
        >
          <svg
            className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="flex-1">
            <p className="font-semibold mb-1">Payment Failed</p>
            <p>{errorMessage}</p>
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-gray-900 text-white py-3 px-6 rounded-lg hover:bg-black transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

