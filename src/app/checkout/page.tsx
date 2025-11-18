"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "@/components/LazyMotion";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Script from "next/script";

// Mapping des plans pour l'affichage
const PLAN_DETAILS: Record<
  string,
  { name: string; price: string; credits: string; features: string[] }
> = {
  BASIC: {
    name: "Basic",
    price: "$10",
    credits: "350 credits/month",
    features: [
      "Aircraft lookup",
      "Flight history",
      "Airport information",
      "Basic specs & photos",
      "Community support",
    ],
  },
  PRO: {
    name: "Pro",
    price: "$15",
    credits: "750 credits/month",
    features: [
      "Everything in Basic",
      "Priority processing",
      "Advanced features",
      "Community support",
    ],
  },
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planParam = searchParams.get("plan");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<{
    plan: string;
    status: string;
    renewsAt?: string;
  } | null>(null);

  useEffect(() => {
    const initializeCheckout = async () => {
      if (!planParam) {
        setError("No plan specified. Please select a plan.");
        setLoading(false);
        return;
      }

      // Vérifier l'authentification d'abord
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          // Rediriger automatiquement vers /auth avec le redirect
          const redirectUrl = `/checkout?plan=${planParam}`;
          router.replace(`/auth?redirect=${encodeURIComponent(redirectUrl)}`);
          return;
        }

        // Récupérer l'abonnement actuel de l'utilisateur
        try {
          const subscriptionResponse = await fetch("/api/user/subscription", {
            credentials: "include",
            cache: "no-store",
          });
          if (subscriptionResponse.ok) {
            const subscriptionData = await subscriptionResponse.json();
            if (subscriptionData.subscription) {
              setCurrentSubscription(subscriptionData.subscription);
            }
          }
        } catch (subErr) {
          console.error("Error fetching current subscription:", subErr);
        }
      } catch (authErr) {
        // En cas d'erreur de vérification auth, rediriger vers auth quand même
        console.warn("Auth check failed, redirecting to auth:", authErr);
        const redirectUrl = `/checkout?plan=${planParam}`;
        router.replace(`/auth?redirect=${encodeURIComponent(redirectUrl)}`);
        return;
      }

      // Map des noms de plans vers les codes Prisma
      const planMapping: Record<string, string> = {
        basic: "BASIC",
        pro: "PRO",
      };

      const planCode = planMapping[planParam.toLowerCase()];

      if (!planCode) {
        setError(
          `Invalid plan: ${planParam}. Valid plans are: basic, pro`
        );
        setLoading(false);
        return;
      }

      setPlan(planCode);

      try {
        // Appeler l'API pour créer le checkout Paddle
        const response = await fetch("/api/paddle/create-checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ plan: planCode }),
        });

        if (!response.ok) {
          const errorData = await response.json();

          // Vérifier si c'est une erreur d'authentification
          if (
            response.status === 401 ||
            errorData.error === "Authentication required"
          ) {
            const redirectUrl = `/checkout?plan=${planParam}`;
            router.replace(`/auth?redirect=${encodeURIComponent(redirectUrl)}`);
            return;
          }

          // Afficher un message d'erreur plus détaillé
          const errorMessage = errorData.error || "Failed to create checkout";
          console.error("Checkout error:", errorMessage);
          throw new Error(errorMessage);
        }

        const data = await response.json();

        if (!data.checkoutUrl || !data.transactionId) {
          throw new Error("No checkout data received from server");
        }

        setCheckoutUrl(data.checkoutUrl);
        setCheckoutId(data.transactionId);
        if (data.priceId) {
          setVariantId(data.priceId);
        }
        console.log("[Checkout] Using URL:", data.checkoutUrl);
        setLoading(false);
      } catch (err: any) {
        console.error("Error creating checkout:", err);

        // Vérifier si c'est une erreur d'authentification
        if (
          err.message === "Authentication required" ||
          err.message?.includes("Authentication")
        ) {
          const redirectUrl = `/checkout?plan=${planParam}`;
          router.replace(`/auth?redirect=${encodeURIComponent(redirectUrl)}`);
          return;
        }

        setError(err.message || "Failed to initialize checkout. Please try again.");
        setLoading(false);
      }
    };

    initializeCheckout();
  }, [planParam, router]);

  // Éviter les appels multiples et l'initialisation multiple
  const checkoutInitialized = useRef(false);

  // Détecter si on est en développement (localhost)
  const isDevelopment = typeof window !== "undefined" && 
    (window.location.hostname === "localhost" || 
     window.location.hostname === "127.0.0.1" ||
     window.location.hostname.includes("localhost"));

  // Afficher le checkout : iframe en production, redirection en développement
  useEffect(() => {
    if (checkoutUrl && !loading && !checkoutInitialized.current) {
      checkoutInitialized.current = true;
      
      // En développement, rediriger directement (Paddle bloque localhost dans les iframes)
      if (isDevelopment) {
        console.log("[Paddle] Development mode detected, redirecting to checkout URL:", checkoutUrl);
        // Petit délai pour permettre à l'utilisateur de voir la page
        setTimeout(() => {
          window.location.href = checkoutUrl;
        }, 500);
        return;
      }
      
      // En production, utiliser un iframe inline
      const initCheckout = () => {
        const container = document.getElementById("paddle-checkout-container");
        if (!container) {
          console.warn("[Paddle] Checkout container not found, retrying...");
          setTimeout(initCheckout, 100);
          return;
        }
        
        // Vérifier si le checkout n'est pas déjà initialisé
        if (container.querySelector("iframe")) {
          console.log("[Paddle] Checkout already initialized in container");
          return;
        }
        
        // Créer l'iframe directement avec l'URL de checkout
        console.log("[Paddle] Creating inline checkout iframe with URL:", checkoutUrl);
        const iframe = document.createElement("iframe");
        iframe.src = checkoutUrl;
        iframe.style.width = "100%";
        iframe.style.minHeight = "650px";
        iframe.style.border = "none";
        iframe.style.backgroundColor = "transparent";
        iframe.setAttribute("allow", "payment");
        iframe.setAttribute("title", "Paddle Checkout");
        iframe.setAttribute("loading", "eager");
        
        // Gérer le redirection après paiement
        iframe.onload = () => {
          console.log("[Paddle] Checkout iframe loaded");
        };
        
        container.appendChild(iframe);
        console.log("[Paddle] Checkout iframe created successfully");
      };
      
      // Démarrer l'initialisation
      initCheckout();
    }
  }, [checkoutUrl, loading, isDevelopment]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Preparing checkout...</p>
          <p className="text-gray-500 text-sm mt-2">Loading secure payment form</p>
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

  if (!plan) {
    return null;
  }

  const planDetails = PLAN_DETAILS[plan];

  // Calculer si on doit afficher l'avertissement
  const shouldShowWarning =
    currentSubscription &&
    (currentSubscription.plan === "BASIC" ||
      currentSubscription.plan === "PRO") &&
    (currentSubscription.status === "ACTIVE" ||
      currentSubscription.status === "CANCELED") &&
    currentSubscription.renewsAt &&
    new Date(currentSubscription.renewsAt) > new Date();

  const isSamePlan = currentSubscription?.plan === plan;


  return (
    <>
      {/* Charger le script Paddle.js */}
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={() => {
          // Initialiser Paddle.js après le chargement du script
          const paddleToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
          if (paddleToken && (window as any).Paddle) {
            (window as any).Paddle.Initialize({
              token: paddleToken,
            });
            console.log("[Paddle] Script loaded and initialized");
          } else {
            console.warn("[Paddle] Client token not configured or Paddle not available");
          }
        }}
      />
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link
              href="/credits"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1"
            >
              ← Back to Credits
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Plan Summary */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {planDetails.name} Plan
              </h2>
              <div className="mb-6">
                <div className="text-4xl font-extrabold text-gray-900">
                  {planDetails.price}
                  <span className="text-lg font-medium text-gray-500">/mo</span>
                </div>
                <p className="text-gray-600 mt-2">{planDetails.credits}</p>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  What's included:
                </h3>
                <ul className="space-y-3">
                  {planDetails.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Checkout Info */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Checkout Information
              </h2>

              {/* Avertissement si l'utilisateur a déjà un plan actif ou canceled */}
              {shouldShowWarning && currentSubscription && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-yellow-50 border-2 border-yellow-400 text-yellow-800 px-4 py-4 rounded-lg mb-6"
                >
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
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
                  <div>
                    <h3 className="font-semibold text-yellow-900 mb-1">
                      {isSamePlan
                        ? "Important: You Already Have This Plan"
                        : "Important: Plan Change Warning"}
                    </h3>
                    <p className="text-sm text-yellow-800">
                      You currently have a{" "}
                      <strong>{currentSubscription.plan}</strong> plan
                      {currentSubscription.status === "CANCELED"
                        ? " (canceled, but still active until period end)"
                        : " (active)"}
                      . If you proceed with this subscription:
                    </p>
                    <ul className="text-sm text-yellow-800 mt-2 space-y-1 list-disc list-inside">
                      {isSamePlan ? (
                        <>
                          <li>
                            You are trying to subscribe to the same plan you
                            already have. This will{" "}
                            <strong>restart your subscription</strong> and
                            reset your billing cycle.
                          </li>
                          <li>
                            Your remaining credits will be <strong>replaced</strong> with the credits offered by the package
                          </li>
                        </>
                      ) : (
                        <>
                          <li>
                            Your current <strong>{currentSubscription.plan}</strong>{" "}
                            plan will be <strong>replaced</strong> immediately
                          </li>
                          <li>
                            Your credit balance will be <strong>replaced</strong> with the credits offered by the selected plan
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
                </motion.div>
              )}

              {/* Conteneur pour le checkout inline (production) ou message de redirection (développement) */}
              <div className="mb-6">
                {checkoutUrl && isDevelopment ? (
                  <div className="bg-blue-50 border-2 border-blue-200 text-blue-800 px-6 py-8 rounded-lg text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold mb-2">Redirecting to secure checkout...</h3>
                    <p className="text-sm text-blue-700">
                      In development mode, we redirect to Paddle's secure checkout page.
                      <br />
                      In production, the checkout will be embedded directly on this page.
                    </p>
                  </div>
                ) : (
                  <>
                    <div 
                      id="paddle-checkout-container" 
                      className="w-full min-h-[650px] bg-white rounded-lg border border-gray-200 overflow-hidden"
                      style={{ minHeight: "650px" }}
                    />
                    {!checkoutUrl && !loading && (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="ml-3 text-gray-600">Preparing secure checkout...</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Your payment is secure and encrypted. We never store your card
                  details.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
