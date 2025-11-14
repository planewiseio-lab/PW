import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const API_MARKET_KEY = process.env.API_MARKET_KEY || process.env.AIRREG_API_KEY;
const API_MARKET_USAGE_URL = "https://prod.api.market/api/v1/user/usage/";

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier si l'utilisateur est admin
    const isAdmin =
      user.user_metadata?.role === "admin" ||
      user.app_metadata?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Vérifier la clé API
    if (!API_MARKET_KEY) {
      return NextResponse.json(
        { error: "API_MARKET_KEY not configured" },
        { status: 500 }
      );
    }

    // Appeler l'API API.market Usage
    const response = await fetch(API_MARKET_USAGE_URL, {
      method: "GET",
      headers: {
        "x-magicapi-key": API_MARKET_KEY,
        "accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[API Market Usage] Error:", response.status, errorText);
      return NextResponse.json(
        {
          error: "Failed to fetch usage data",
          status: response.status,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API Market Usage] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

