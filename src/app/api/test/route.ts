import { NextRequest, NextResponse } from "next/server";

const AERODATABOX_API_KEY =
  process.env.AERODATABOX_API_KEY || process.env.RAPID_KEY;

export async function GET(request: NextRequest) {
  try {
    console.log("=== API Test ===");
    console.log("AeroDataBox API Key configured:", !!AERODATABOX_API_KEY);
    console.log("Environment variables:");
    console.log("- AERODATABOX_API_KEY:", !!process.env.AERODATABOX_API_KEY);
    console.log("- RAPID_KEY:", !!process.env.RAPID_KEY);

    if (!AERODATABOX_API_KEY) {
      return NextResponse.json(
        {
          error: "AeroDataBox API key not configured",
          details: {
            AERODATABOX_API_KEY: !!process.env.AERODATABOX_API_KEY,
            RAPID_KEY: !!process.env.RAPID_KEY,
          },
        },
        { status: 500 }
      );
    }

    // Test simple de l'API AeroDataBox
    const testUrl = "https://aerodatabox.p.rapidapi.com/flights/number/AC3";
    console.log("Testing AeroDataBox URL:", testUrl);

    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": AERODATABOX_API_KEY,
        "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
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
