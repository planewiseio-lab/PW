import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const AERODATABOX_BASE_URL = process.env.API_MARKET_BASE_URL || "https://prod.api.market/api/v1/aedbx/aerodatabox";
const AERODATABOX_API_KEY =
  process.env.API_MARKET_KEY || process.env.AERODATABOX_API_KEY;

// Mapping des endpoints vers les tiers AeroDataBox
function getTier(endpoint: string): string {
  // Tier 1: Single aircraft (by tail-number, Mode-S or ID)
  if (
    endpoint.includes("/aircraft/") &&
    !endpoint.includes("/flights") &&
    !endpoint.includes("/history")
  ) {
    return "Tier 1";
  }

  // Tier 2: Airports et recherche de vols
  if (
    endpoint.includes("/airports/") ||
    endpoint.includes("/flights/search") ||
    endpoint.includes("/flights/browse") ||
    endpoint.includes("/airports/browse") ||
    endpoint.includes("/flight/") // Single flight
  ) {
    return "Tier 2";
  }

  // Tier 3: Détails spécifiques et historique des vols
  if (
    endpoint.includes("/flights/number") ||
    endpoint.includes("/aircraft/registration") ||
    (endpoint.includes("/aircraft/") && endpoint.includes("/flights")) // Historique des vols d'un avion
  ) {
    return "Tier 3";
  }

  // Tier 2 par défaut
  return "Tier 2";
}

export async function GET(request: NextRequest) {
  return handleProxy(request, "GET");
}

export async function POST(request: NextRequest) {
  return handleProxy(request, "POST");
}

async function handleProxy(request: NextRequest, method: string) {
  try {
    // Récupérer le path de l'URL
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");

    if (!endpoint) {
      return NextResponse.json(
        { error: "endpoint parameter required" },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const startTime = Date.now();

    // Appel à l'API AeroDataBox via api.market
    const response = await fetch(`${AERODATABOX_BASE_URL}${endpoint}`, {
      method,
      headers: {
        "x-magicapi-key": AERODATABOX_API_KEY!, // api.market REST API header (selon documentation)
        "x-api-market-key": AERODATABOX_API_KEY!, // Compatibilité MCP
      },
    });

    const responseTime = Date.now() - startTime;
    const statusCode = response.status;

    // Logger la requête dans Supabase (utiliser supabaseAdmin pour bypass RLS)
    try {
      console.log("[API Proxy] Logging request to api_requests:", {
        user_id: user?.id || null,
        endpoint,
        method,
        tier: getTier(endpoint),
        status_code: statusCode,
        response_time_ms: responseTime,
      });

      const { error: insertError } = await supabaseAdmin
        .from("api_requests")
        .insert({
          user_id: user?.id || null,
          endpoint,
          method,
          tier: getTier(endpoint),
          status_code: statusCode,
          response_time_ms: responseTime,
        });

      if (insertError) {
        console.error("[API Proxy] Insert error:", insertError);
      } else {
        console.log("[API Proxy] Successfully logged request to api_requests");
      }
    } catch (error) {
      console.error("[API Proxy] Failed to log request:", error);
      // Continue même si le logging échoue
    }

    // Retourner la réponse
    const data = await response.json();
    return NextResponse.json(data, { status: statusCode });
  } catch (error: any) {
    console.error("[API Proxy] Error:", error);
    return NextResponse.json(
      { error: "Proxy error", details: error.message },
      { status: 500 }
    );
  }
}
