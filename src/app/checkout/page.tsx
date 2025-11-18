"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "@/components/LazyMotion";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Script from "next/script";

// Déclaration globale pour Paddle
declare global {
  interface Window {
    Paddle: any;
  }
}

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

// Les price IDs seront récupérés depuis l'API serveur

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planParam = searchParams.get("plan");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [paddleReady, setPaddleReady] = useState(false);
  const [priceId, setPriceId] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<{
    plan: string;
    status: string;
    renewsAt?: string;
  } | null>(null);

  // Initialiser Paddle.js et vérifier l'authentification
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
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !authUser) {
          // Rediriger automatiquement vers /auth avec le redirect
          const redirectUrl = `/checkout?plan=${planParam}`;
          router.replace(`/auth?redirect=${encodeURIComponent(redirectUrl)}`);
          return;
        }

        setUser(authUser);

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

      // Récupérer le price ID depuis l'API serveur
      // Utiliser un cache de session pour éviter les appels répétés
      const cacheKey = `paddle_price_id_${planCode}`;
      const cachedPriceId = sessionStorage.getItem(cacheKey);
      
      if (cachedPriceId) {
        console.log(`[Checkout] Using cached price ID for ${planCode}`);
        setPriceId(cachedPriceId);
        setLoading(false);
        return;
      }

      try {
        const priceIdResponse = await fetch(
          `/api/paddle/price-ids?plan=${planCode}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!priceIdResponse.ok) {
          const errorData = await priceIdResponse.json();
          setError(
            errorData.error ||
              `Failed to get price ID for plan ${planCode}. Please contact support.`
          );
          setLoading(false);
          return;
        }

        const priceIdData = await priceIdResponse.json();
        if (!priceIdData.priceId) {
          setError(
            `Paddle price ID not configured for plan ${planCode}. Please contact support.`
          );
          setLoading(false);
          return;
        }

        // Mettre en cache pour cette session
        sessionStorage.setItem(cacheKey, priceIdData.priceId);
        setPriceId(priceIdData.priceId);
        setLoading(false);
      } catch (priceIdErr) {
        console.error("Error fetching price ID:", priceIdErr);
        setError("Failed to initialize checkout. Please try again.");
        setLoading(false);
      }
    };

    initializeCheckout();
  }, [planParam, router]);

  // Initialiser le checkout inline quand Paddle est prêt
  const initializeInlineCheckout = () => {
    if (!plan || !priceId || !paddleReady || !window.Paddle) {
      console.warn("[Paddle] Not ready yet", { 
        plan, 
        priceId: !!priceId, 
        paddleReady, 
        paddle: !!window.Paddle 
      });
      return;
    }

    // Vérifier que le conteneur existe
    const container = document.getElementById("paddle-inline-checkout");
    if (!container) {
      console.warn("[Paddle] Checkout container not found, retrying...");
      setTimeout(initializeInlineCheckout, 100);
      return;
    }

    // Vérifier si le checkout n'est pas déjà initialisé
    if (container.querySelector("iframe") || container.querySelector("[data-paddle-checkout]")) {
      console.log("[Paddle] Checkout already initialized");
      return;
    }

    try {
      // Préparer les items pour le checkout
      const items = [
        {
          priceId: priceId, // Utiliser le priceId depuis l'état
          quantity: 1,
        },
      ];

      // Préparer les informations client si disponibles
      const customer: any = {};
      if (user?.email) {
        customer.email = user.email;
      }

      console.log("[Paddle Checkout] Initializing inline checkout", {
        items,
        customer: customer.email ? "***" : "none",
        frameTarget: "paddle-inline-checkout",
      });

      // Ouvrir le checkout inline dans le conteneur
      window.Paddle.Checkout.open({
        items,
        ...(Object.keys(customer).length > 0 ? { customer } : {}),
        settings: {
          displayMode: "inline",
          frameTarget: "paddle-inline-checkout",
          frameInitialHeight: 650,
          frameStyle: "width:100%; min-width:312px; background-color: transparent; border: none;",
        },
      });
    } catch (err: any) {
      console.error("[Paddle Checkout] Error initializing inline checkout:", err);
      setError(err.message || "Failed to initialize checkout. Please try again.");
    }
  };

  // Initialiser automatiquement le checkout inline quand tout est prêt
  useEffect(() => {
    if (!loading && plan && priceId && paddleReady && user && window.Paddle) {
      // Petit délai pour s'assurer que le DOM est prêt
      const timer = setTimeout(() => {
        initializeInlineCheckout();
      }, 500);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, plan, priceId, paddleReady, user]);

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
          const paddleEnvironment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || "production";
          
          if (!paddleToken) {
            console.error("[Paddle] Client token not configured");
            setError("Paddle is not configured. Please contact support.");
            return;
          }

          if (!window.Paddle) {
            console.error("[Paddle] Paddle object not available");
            setError("Failed to load Paddle. Please refresh the page.");
            return;
          }

          // Définir l'environnement si sandbox
          if (paddleEnvironment === "sandbox") {
            window.Paddle.Environment.set("sandbox");
          }

          // Initialiser Paddle avec le token
          window.Paddle.Initialize({
            token: paddleToken,
            eventCallback: (data: any) => {
              console.log("[Paddle] Event:", data);
              
              // Gérer les événements de succès
              if (data.name === "checkout.completed") {
                console.log("[Paddle] Checkout completed:", data);
                // Rediriger vers la page de succès
                router.push(`/checkout/success?transaction_id=${data.data?.transaction_id || ""}`);
              }
              
              // Gérer les erreurs
              if (data.name === "checkout.error") {
                console.error("[Paddle] Checkout error:", data);
                setError(data.data?.message || "An error occurred during checkout");
              }
            },
          });
          
          console.log("[Paddle] Script loaded and initialized");
          setPaddleReady(true);
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

              {/* Conteneur pour le checkout inline */}
              <div className="mb-6">
                {!paddleReady && !error && (
                  <div className="bg-blue-50 border-2 border-blue-200 text-blue-800 px-6 py-8 rounded-lg text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold mb-2">Preparing secure checkout...</h3>
                    <p className="text-sm text-blue-700">
                      Loading payment form...
                    </p>
                  </div>
                )}
                {paddleReady && !error && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div 
                      id="paddle-inline-checkout" 
                      className="w-full min-h-[650px]"
                      style={{ minHeight: "650px" }}
                    />
                  </div>
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
