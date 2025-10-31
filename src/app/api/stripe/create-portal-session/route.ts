import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
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

    // Récupérer l'abonnement de l'utilisateur
    const subscription = await prisma.subscriptions.findUnique({
      where: { userId: user.id },
    });

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // Créer une session pour le Customer Portal Stripe
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${baseUrl}/account-settings?tab=subscription`,
      });

      return NextResponse.json({
        url: portalSession.url,
      });
    } catch (portalError: any) {
      // Vérifier si c'est une erreur de configuration du Customer Portal
      if (
        portalError.message?.includes("configuration") ||
        portalError.message?.includes("default configuration") ||
        portalError.code === "resource_missing"
      ) {
        console.error("Stripe Customer Portal not configured:", portalError);
        return NextResponse.json(
          {
            error:
              "Stripe Customer Portal is not configured. Please configure it in your Stripe Dashboard: https://dashboard.stripe.com/test/settings/billing/portal (for test mode) or https://dashboard.stripe.com/settings/billing/portal (for live mode).",
            requiresSetup: true,
          },
          { status: 503 }
        );
      }
      throw portalError; // Re-throw other errors
    }
  } catch (error: any) {
    console.error("Error creating portal session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create portal session" },
      { status: 500 }
    );
  }
}

