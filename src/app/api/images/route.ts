import { NextResponse } from "next/server";
import { env } from "@/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AERODATABOX_HOST = "aerodatabox.p.rapidapi.com";
const AERODATABOX_API_KEY = env.aerodatabox.apiKey;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ images: [] });
  }

  if (!AERODATABOX_API_KEY) {
    return NextResponse.json({ images: [] });
  }

  try {
    const url = `https://${AERODATABOX_HOST}/aircrafts/reg/${encodeURIComponent(
      query
    )}/image/beta`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s max

    const response = await fetch(url, {
      headers: {
        "X-RapidAPI-Host": AERODATABOX_HOST,
        "X-RapidAPI-Key": AERODATABOX_API_KEY,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ images: [] });
    }

    const data = await response.json();

    if (!data || !data.url) {
      return NextResponse.json({ images: [] });
    }

    return NextResponse.json({
      images: [
        {
          url: data.url,
          original: data.url,
          source: "AeroDataBox",
          author: data.author || "AeroDataBox",
          title: data.title || `${query} Aircraft Image`,
        },
      ],
    });
  } catch (error) {
    return NextResponse.json({ images: [] });
  }
}
