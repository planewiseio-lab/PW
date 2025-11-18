import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPaddleConfig } from "@/lib/paddle";

const PADDLE_API_URL = process.env.PADDLE_API_URL || "https://api.paddle.com";

// Mapping des plans vers les price IDs Paddle
const PLAN_PRICE_IDS: Record<string, string> = {
  BASIC: process.env.PADDLE_PRICE_ID_BASIC || "",
  PRO: process.env.PADDLE_PRICE_ID_PRO || "",
};

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

    // Lire le body
    const body = await request.json();
    const { plan } = body;

    if (!plan || !["BASIC", "PRO"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan. Must be BASIC or PRO." },
        { status: 400 }
      );
    }

    // Vérifier la configuration Paddle
    let paddleConfig;
    try {
      paddleConfig = getPaddleConfig();
    } catch (error) {
      return NextResponse.json(
        {
          error: "Paddle is not configured",
          requiresSetup: true,
        },
        { status: 500 }
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

    // Créer le checkout Paddle
    const customerId = `user_${user.id}`;
    const customerEmail = user.email || "";

    const checkoutResponse = await fetch(
      `${PADDLE_API_URL}/transactions`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${paddleConfig.apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              price_id: priceId,
              quantity: 1,
            },
          ],
          customer_id: customerId,
          customer_email: customerEmail,
          custom_data: {
            user_id: user.id,
            plan: plan,
          },
        }),
      }
    );

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text();
      console.error("Paddle checkout error:", errorText);
      return NextResponse.json(
        {
          error: "Failed to create Paddle checkout",
          details: errorText,
        },
        { status: 500 }
      );
    }

    const checkoutData = await checkoutResponse.json();

    // Retourner l'URL de checkout et l'ID de transaction
    return NextResponse.json({
      checkoutUrl: checkoutData.data?.checkout?.url || checkoutData.checkout_url,
      transactionId: checkoutData.data?.id || checkoutData.id,
      priceId: priceId,
    });
  } catch (error: any) {
    console.error("Error creating Paddle checkout:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

