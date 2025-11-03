import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Plan, SubscriptionStatus } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

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
    const { paymentMethodId, priceId, plan } = body;

    if (!paymentMethodId || !priceId || !plan) {
      return NextResponse.json(
        { error: "paymentMethodId, priceId, and plan are required" },
        { status: 400 }
      );
    }

    // 3. Valider le plan
    const validPlans = ["BASIC", "PRO"];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: `Invalid plan. Must be one of: ${validPlans.join(", ")}` },
        { status: 400 }
      );
    }

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

    // 9. Confirmer le paiement de la première facture
    const invoice = stripeSubscription.latest_invoice as Stripe.Invoice;
    if (invoice.payment_intent) {
      const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
      if (
        paymentIntent.status === "requires_confirmation" ||
        paymentIntent.status === "requires_action"
      ) {
        await stripe.paymentIntents.confirm(paymentIntent.id, {
          payment_method: paymentMethodId,
        });
      }
    }

    // 10. Mettre à jour la subscription dans la base de données
    // Convertir la chaîne plan en enum Prisma
    // Convertir la chaîne plan en enum Prisma
    let planEnum: Plan;
    switch (plan) {
      case "BASIC":
        planEnum = Plan.BASIC; // BASIC plan (350 crédits)
        break;
      case "PRO":
        planEnum = Plan.PRO; // PRO plan (750 crédits)
        break;
      default:
        return NextResponse.json(
          { error: `Invalid plan: ${plan}` },
          { status: 400 }
        );
    }

    const renewsAt = new Date(stripeSubscription.current_period_end * 1000);

    await prisma.subscriptions.update({
      where: { userId: user.id },
      data: {
        plan: planEnum,
        status: SubscriptionStatus.ACTIVE,
        stripeSubId: stripeSubscription.id,
        renewsAt: renewsAt,
      },
    });

    return NextResponse.json({
      success: true,
      subscriptionId: stripeSubscription.id,
    });
  } catch (error: any) {
    console.error("Error confirming subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to confirm subscription" },
      { status: 500 }
    );
  }
}

