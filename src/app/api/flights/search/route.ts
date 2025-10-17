import { NextRequest, NextResponse } from "next/server";

const AERODATABOX_API_KEY =
  process.env.AERODATABOX_API_KEY || process.env.RAPID_KEY;
const AERODATABOX_BASE_URL = "https://aerodatabox.p.rapidapi.com";

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
        "X-RapidAPI-Key": AERODATABOX_API_KEY,
        "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
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
