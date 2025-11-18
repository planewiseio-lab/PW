import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mapping des plans vers les price IDs Paddle (côté serveur)
const PLAN_PRICE_IDS: Record<string, string> = {
  BASIC: process.env.PADDLE_PRICE_ID_BASIC || "",
  PRO: process.env.PADDLE_PRICE_ID_PRO || "",
};

export async function GET(request: NextRequest) {
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

    // Récupérer le plan depuis les query params
    const { searchParams } = new URL(request.url);
    const plan = searchParams.get("plan");

    if (!plan || !["BASIC", "PRO"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan. Must be BASIC or PRO." },
        { status: 400 }
      );
    }

    const priceId = PLAN_PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json(
        {
          error: `Paddle price ID not configured for plan ${plan}`,
          requiresSetup: true,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      plan,
      priceId,
    });
  } catch (error: any) {
    console.error("Error getting Paddle price ID:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

