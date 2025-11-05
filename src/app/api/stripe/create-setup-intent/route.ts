import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Plan } from "@prisma/client";
import { randomUUID } from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as any, // Version plus récente que les types Stripe
});

// Mapping des plans aux Price IDs Stripe
const STRIPE_PRICE_IDS: Record<string, string> = {
  BASIC: process.env.STRIPE_PRICE_ID_BASIC || "price_basic_monthly",
  PRO: process.env.STRIPE_PRICE_ID_PRO || "price_pro_monthly",
};

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

    // 2. Récupérer le plan depuis le body
    const body = await request.json();
    const { plan } = body;

    if (!plan) {
      return NextResponse.json(
        { error: "Plan is required" },
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

    // 4. Récupérer ou créer le customer Stripe
    let subscription = await prisma.subscriptions.findUnique({
      where: { userId: user.id },
    });

    let customerId: string;

    if (subscription?.stripeCustomerId) {
      // Customer existant - vérifier qu'il existe toujours dans Stripe
      try {
        await stripe.customers.retrieve(subscription.stripeCustomerId);
        customerId = subscription.stripeCustomerId;
      } catch (error) {
        // Customer n'existe plus dans Stripe, en créer un nouveau
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;

        // Mettre à jour la subscription
        await prisma.subscriptions.update({
          where: { userId: user.id },
          data: { stripeCustomerId: customerId },
        });
      }
    } else {
      // Créer un nouveau customer Stripe
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: {
          userId: user.id,
        },
      });

      customerId = customer.id;

      // Mettre à jour ou créer la subscription avec le customer ID
      await prisma.subscriptions.upsert({
        where: { userId: user.id },
        update: {
          stripeCustomerId: customerId,
        },
        create: {
          id: randomUUID(),
          userId: user.id,
          plan: Plan.FREE,
          status: "ACTIVE",
          renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stripeCustomerId: customerId,
        },
      });
    }

    // 5. Créer un SetupIntent pour sauvegarder la méthode de paiement
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      metadata: {
        userId: user.id,
        plan: plan,
      },
    });

    // 6. Récupérer le Price ID pour le plan
    const priceId = STRIPE_PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for plan: ${plan}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: customerId,
      priceId: priceId,
      plan: plan,
    });
  } catch (error: any) {
    console.error("Error creating setup intent:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create setup intent" },
      { status: 500 }
    );
  }
}

