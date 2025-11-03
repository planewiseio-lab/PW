import { NextRequest, NextResponse } from "next/server";

const AERODATABOX_API_KEY =
  process.env.API_MARKET_KEY || process.env.AERODATABOX_API_KEY;
const AERODATABOX_BASE_URL = process.env.API_MARKET_BASE_URL || "https://prod.api.market/api/v1/aedbx/aerodatabox";

export async function GET(request: NextRequest) {
  try {
    console.log("=== API Test ===");
    console.log("AeroDataBox API Key configured:", !!AERODATABOX_API_KEY);
    console.log("Environment variables:");
    console.log("- API_MARKET_KEY:", !!process.env.API_MARKET_KEY);
    console.log("- AERODATABOX_API_KEY:", !!process.env.AERODATABOX_API_KEY);

    if (!AERODATABOX_API_KEY) {
      return NextResponse.json(
        {
          error: "AeroDataBox API key not configured",
          details: {
            API_MARKET_KEY: !!process.env.API_MARKET_KEY,
            AERODATABOX_API_KEY: !!process.env.AERODATABOX_API_KEY,
          },
        },
        { status: 500 }
      );
    }

    // Test simple de l'API AeroDataBox
    const testUrl = `${AERODATABOX_BASE_URL}/flights/number/AC3`;
    console.log("Testing AeroDataBox URL:", testUrl);

    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        "x-magicapi-key": AERODATABOX_API_KEY, // api.market REST API header (selon documentation)
        "x-api-market-key": AERODATABOX_API_KEY, // Compatibilité MCP
      },
    });

    console.log("AeroDataBox response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AeroDataBox API error:", errorText);
      return NextResponse.json(
        {
          error: "AeroDataBox API error",
          status: response.status,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("AeroDataBox API success:", data);

    return NextResponse.json({
      success: true,
      data: data,
      apiKey: "configured",
      url: testUrl,
    });
  } catch (error) {
    console.error("Test API error:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
