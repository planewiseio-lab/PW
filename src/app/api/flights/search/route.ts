import { NextRequest, NextResponse } from "next/server";

const AERODATABOX_API_KEY =
  process.env.API_MARKET_KEY || process.env.AERODATABOX_API_KEY;
const AERODATABOX_BASE_URL = process.env.API_MARKET_BASE_URL || "https://prod.api.market/api/v1/aedbx/aerodatabox";

export async function GET(request: NextRequest) {
  try {
    if (!AERODATABOX_API_KEY) {
      return NextResponse.json(
        { error: "AeroDataBox API key not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const term = searchParams.get("term");

    if (!term) {
      return NextResponse.json(
        { error: "Search term is required" },
        { status: 400 }
      );
    }

    const apiUrl = `${AERODATABOX_BASE_URL}/flights/search/term?term=${encodeURIComponent(
      term
    )}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "x-magicapi-key": AERODATABOX_API_KEY, // api.market REST API header (selon documentation)
        "x-api-market-key": AERODATABOX_API_KEY, // Compatibilité MCP
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("AeroDataBox search API error:", errorData);
      return NextResponse.json(
        { error: "Failed to search flights" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Flight search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
