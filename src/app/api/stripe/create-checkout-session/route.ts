import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Plan, SubscriptionStatus } from "@prisma/client";
import { randomUUID } from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as any, // Version plus récente que les types Stripe
});

// Mapping des plans aux Price IDs Stripe (à configurer dans Stripe Dashboard)
const STRIPE_PRICE_IDS: Record<string, string> = {
  BASIC: process.env.STRIPE_PRICE_ID_BASIC || "price_basic_monthly",
  PRO: process.env.STRIPE_PRICE_ID_PRO || "price_pro_monthly",
};

export async function POST(request: NextRequest) {
  try {
    // Vérifier que Prisma est initialisé
    if (!prisma) {
      console.error("Prisma client is not initialized");
      return NextResponse.json(
        { error: "Database connection error. Please check DATABASE_URL in .env.local and run 'npx prisma generate'" },
        { status: 500 }
      );
    }

    // Vérifier que Stripe est configuré
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is not configured");
      return NextResponse.json(
        { error: "Stripe secret key is not configured. Please check .env.local" },
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
    // Vérifier que le modèle subscriptions existe dans Prisma
    let subscription;
    try {
      // Vérifier que prisma.subscriptions existe
      if (!prisma.subscriptions) {
        console.error("prisma.subscriptions is undefined. Prisma client may not be properly generated.");
        return NextResponse.json(
          { error: "Database model error. Please run 'npx prisma generate' and restart the server." },
          { status: 500 }
        );
      }
      
      subscription = await prisma.subscriptions.findUnique({
        where: { userId: user.id },
      });
    } catch (dbError: any) {
      console.error("Database error when fetching subscription:", dbError);
      console.error("Error details:", {
        message: dbError.message,
        code: dbError.code,
        meta: dbError.meta,
        name: dbError.name,
        stack: dbError.stack,
      });
      
      // Si le modèle n'existe pas ou n'est pas accessible
      if (
        dbError.message?.includes("subscription") || 
        dbError.message?.includes("undefined") ||
        dbError.code === "P2001" || // Record does not exist (expected for new users)
        dbError.code === "P2025" // Record not found (expected for new users)
      ) {
        // P2001 et P2025 sont normaux si l'utilisateur n'a pas encore de subscription
        // On continue pour créer une nouvelle subscription
        subscription = null;
      } else if (
        dbError.message?.includes("Cannot read properties") ||
        dbError.message?.includes("is not a function") ||
        dbError.code === "P1001" // Cannot reach database server
      ) {
        return NextResponse.json(
          { error: "Database connection error. Please check DATABASE_URL in .env.local and ensure the database is accessible." },
          { status: 500 }
        );
      } else {
        // Autres erreurs, on les propage
        throw dbError;
      }
    }

    let customerId: string;

    if (subscription?.stripeCustomerId) {
      // Customer existant - vérifier qu'il existe toujours dans Stripe
      try {
        await stripe.customers.retrieve(subscription.stripeCustomerId);
        customerId = subscription.stripeCustomerId;
      } catch (error) {
        // Customer n'existe plus dans Stripe, en créer un nouveau
        console.warn("Stripe customer not found, creating new one");
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
          status: SubscriptionStatus.ACTIVE,
          renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stripeCustomerId: customerId,
        },
      });
    }

    // 5. Récupérer le Price ID pour le plan
    const priceId = STRIPE_PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for plan: ${plan}` },
        { status: 500 }
      );
    }

    // 6. Créer la session Checkout
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel`,
      metadata: {
        userId: user.id,
        plan: plan,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
