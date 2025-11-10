import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Plan, SubscriptionStatus } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as any, // Version plus récente que les types Stripe
});

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

export async function POST(request: NextRequest) {
  try {
    // Vérifier que Prisma est initialisé
    if (!prisma) {
      return NextResponse.json(
        { error: "Database connection error" },
        { status: 500 }
      );
    }

    // Vérifier que Stripe est configuré
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe secret key is not configured" },
        { status: 500 }
      );
    }

    // 1. Vérifier l'authentification
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Récupérer les données depuis le body
    const body = await request.json();
    const { paymentMethodId, priceId, plan: planRaw } = body;

    console.log(`[Confirm Subscription] Received request:`, {
      paymentMethodId: paymentMethodId ? "present" : "missing",
      priceId,
      planRaw,
    });

    if (!paymentMethodId || !priceId || !planRaw) {
      return NextResponse.json(
        { error: "paymentMethodId, priceId, and plan are required" },
        { status: 400 }
      );
    }

    // Normaliser le plan en majuscules
    const plan = planRaw.toUpperCase().trim();

    // 3. Valider le plan
    const validPlans = ["BASIC", "PRO"];
    if (!validPlans.includes(plan)) {
      console.error(`[Confirm Subscription] Invalid plan: "${planRaw}" (normalized: "${plan}")`);
      return NextResponse.json(
        { error: `Invalid plan. Must be one of: ${validPlans.join(", ")}` },
        { status: 400 }
      );
    }

    console.log(`[Confirm Subscription] Valid plan: ${plan}`);

    // 4. Récupérer la subscription existante
    let subscription = await prisma.subscriptions.findUnique({
      where: { userId: user.id },
    });

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: "Stripe customer not found" },
        { status: 400 }
      );
    }

    // 5. Attacher la méthode de paiement au customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: subscription.stripeCustomerId,
    });

    // 6. Définir comme méthode de paiement par défaut
    await stripe.customers.update(subscription.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // 7. Annuler l'abonnement existant si actif
    if (subscription.stripeSubId) {
      try {
        await stripe.subscriptions.cancel(subscription.stripeSubId);
      } catch (error: any) {
        // Ignorer l'erreur si l'abonnement n'existe plus (404) - c'est normal
        if (error?.statusCode !== 404 && error?.code !== 'resource_missing') {
          console.warn("Error canceling existing subscription:", error);
        }
      }
    }

    // 8. Créer la nouvelle subscription avec la méthode de paiement
    const stripeSubscription = await stripe.subscriptions.create({
      customer: subscription.stripeCustomerId,
      items: [
        {
          price: priceId,
        },
      ],
      default_payment_method: paymentMethodId,
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        userId: user.id,
        plan: plan,
      },
    });

    // 9. Confirmer le paiement de la première facture et vérifier le statut
    const invoice = stripeSubscription.latest_invoice as Stripe.Invoice;
    let paymentSucceeded = false;
    let paymentError: string | null = null;

    if (invoice.payment_intent) {
      const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
      
      // Confirmer le PaymentIntent si nécessaire
      if (
        paymentIntent.status === "requires_confirmation" ||
        paymentIntent.status === "requires_action"
      ) {
        try {
          const confirmedPaymentIntent = await stripe.paymentIntents.confirm(paymentIntent.id, {
            payment_method: paymentMethodId,
          });
          
          // Attendre un peu et récupérer le PaymentIntent mis à jour pour vérifier le statut final
          // (parfois le statut change après confirmation)
          await new Promise(resolve => setTimeout(resolve, 1000));
          const updatedPaymentIntent = await stripe.paymentIntents.retrieve(paymentIntent.id);
          
          // Vérifier le statut après confirmation
          if (updatedPaymentIntent.status === "succeeded") {
            paymentSucceeded = true;
          } else {
            const rawError = updatedPaymentIntent.last_payment_error?.message || 
                          `Payment failed with status: ${updatedPaymentIntent.status}`;
            paymentError = translateStripeError(rawError);
          }
        } catch (confirmError: any) {
          const rawError = confirmError.message || "Failed to confirm payment";
          paymentError = translateStripeError(rawError);
        }
      } else if (paymentIntent.status === "succeeded") {
        // Le paiement a déjà réussi
        paymentSucceeded = true;
      } else {
        // Le paiement a échoué ou est dans un état d'erreur
        const rawError = paymentIntent.last_payment_error?.message || 
                      `Payment failed with status: ${paymentIntent.status}`;
        paymentError = translateStripeError(rawError);
      }
    } else {
      // Pas de PaymentIntent, vérifier le statut de l'invoice
      const refreshedInvoice = await stripe.invoices.retrieve(invoice.id);
      if (refreshedInvoice.status === "paid") {
        paymentSucceeded = true;
      } else {
        paymentError = `Invoice status: ${refreshedInvoice.status}`;
      }
    }

    // 10. Si le paiement a échoué, annuler l'abonnement Stripe et retourner une erreur
    if (!paymentSucceeded) {
      console.error(`[Confirm Subscription] Payment failed for subscription ${stripeSubscription.id}:`, paymentError);
      
      // Annuler l'abonnement Stripe créé
      try {
        await stripe.subscriptions.cancel(stripeSubscription.id);
        console.log(`[Confirm Subscription] Canceled failed subscription ${stripeSubscription.id}`);
      } catch (cancelError) {
        console.error(`[Confirm Subscription] Error canceling failed subscription:`, cancelError);
      }

      // Traduire le message d'erreur en anglais avant de le retourner
      const translatedError = translateStripeError(
        paymentError || "Payment failed. Your card was declined or the payment could not be processed. Please try again with a different payment method."
      );

      return NextResponse.json(
        { 
          error: translatedError
        },
        { status: 402 } // 402 Payment Required
      );
    }

    // 11. Vérifier que l'abonnement Stripe est bien actif
    const refreshedSubscription = await stripe.subscriptions.retrieve(stripeSubscription.id);
    if (refreshedSubscription.status !== "active" && refreshedSubscription.status !== "trialing") {
      console.error(`[Confirm Subscription] Subscription ${stripeSubscription.id} is not active: ${refreshedSubscription.status}`);
      
      // Annuler l'abonnement Stripe
      try {
        await stripe.subscriptions.cancel(stripeSubscription.id);
      } catch (cancelError) {
        console.error(`[Confirm Subscription] Error canceling subscription:`, cancelError);
      }

      return NextResponse.json(
        { 
          error: translateStripeError(`Subscription status is ${refreshedSubscription.status}. Payment may have failed. Please try again.`)
        },
        { status: 402 }
      );
    }

    // 12. Mettre à jour la subscription dans la base de données (seulement si le paiement a réussi)
    // Convertir la chaîne plan en enum Prisma
    console.log(`[Confirm Subscription] Converting plan string to enum:`, {
      plan,
      planType: typeof plan,
      PlanEnum: Plan,
      PlanBASIC: Plan.BASIC,
      PlanPRO: Plan.PRO,
      PlanFREE: Plan.FREE,
    });

    // Déterminer le plan enum directement
    let planEnum: Plan;
    if (plan === "BASIC") {
      planEnum = Plan.BASIC;
      console.log(`[Confirm Subscription] Mapped to Plan.BASIC: ${planEnum}`);
    } else if (plan === "PRO") {
      planEnum = Plan.PRO;
      console.log(`[Confirm Subscription] Mapped to Plan.PRO: ${planEnum}`);
    } else {
      console.error(`[Confirm Subscription] Invalid plan: "${plan}"`);
      return NextResponse.json(
        { error: `Invalid plan: ${plan}` },
        { status: 400 }
      );
    }

    // Vérifier que planEnum est bien défini
    if (planEnum === undefined || planEnum === null) {
      console.error(`[Confirm Subscription] planEnum is undefined after mapping!`);
      return NextResponse.json(
        { error: `Failed to map plan: ${plan}` },
        { status: 500 }
      );
    }

    console.log(`[Confirm Subscription] planEnum value:`, {
      planEnum,
      planEnumString: String(planEnum),
      planEnumType: typeof planEnum,
      equalsBASIC: planEnum === Plan.BASIC,
      equalsPRO: planEnum === Plan.PRO,
    });

    const renewsAt = new Date(refreshedSubscription.current_period_end * 1000);

    console.log(`[Confirm Subscription] Payment succeeded. Updating subscription for user ${user.id}:`, {
      plan: planEnum,
      planString: String(planEnum),
      status: SubscriptionStatus.ACTIVE,
      stripeSubId: refreshedSubscription.id,
      renewsAt: renewsAt.toISOString(),
    });

    const updatedSubscription = await prisma.subscriptions.update({
      where: { userId: user.id },
      data: {
        plan: planEnum,
        status: SubscriptionStatus.ACTIVE,
        stripeSubId: refreshedSubscription.id,
        renewsAt: renewsAt,
      },
    });

    console.log(`[Confirm Subscription] Subscription updated successfully:`, {
      userId: updatedSubscription.userId,
      plan: updatedSubscription.plan,
      status: updatedSubscription.status,
    });

    // 13. Attribuer les crédits initiaux (au lieu d'attendre le webhook)
    // Cela garantit que les crédits sont attribués immédiatement après un paiement réussi
    try {
      const { grantCredits } = await import("@/lib/credits");
      const maxCreditsByPlan = {
        [Plan.PRO]: 750,
        [Plan.BASIC]: 350,
      };
      const maxCredits = maxCreditsByPlan[planEnum];
      
      if (maxCredits) {
        const currentBalance = await prisma.credit_balances.findUnique({
          where: { userId: user.id },
          select: { credits: true },
        });
        const currentCredits = currentBalance?.credits ?? 0;
        const creditsToAdd = Math.max(0, maxCredits - currentCredits);

        if (creditsToAdd > 0) {
          await grantCredits(
            user.id,
            creditsToAdd,
            "MONTHLY_TOPUP",
            {
              stripeSubscriptionId: refreshedSubscription.id,
              stripeCustomerId: subscription.stripeCustomerId,
              plan: planEnum,
              reason: "initial_subscription_credits",
              currentCredits,
              maxCredits,
              creditsAdded: creditsToAdd,
            }
          );
          console.log(
            `[Confirm Subscription] Granted ${creditsToAdd} initial credits to user ${user.id} for ${planEnum} plan`
          );
        }
      }
    } catch (creditError) {
      // Log l'erreur mais ne fait pas échouer la requête
      // Les crédits seront attribués par le webhook si nécessaire
      console.error(`[Confirm Subscription] Error granting initial credits:`, creditError);
    }

    return NextResponse.json({
      success: true,
      subscriptionId: refreshedSubscription.id,
    });
  } catch (error: any) {
    console.error("Error confirming subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to confirm subscription" },
      { status: 500 }
    );
  }
}

