import { NextResponse } from "next/server";
import { fetchCommonsImagesByRegistration } from "@/lib/commonsImages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 5;

  if (!query) {
    return NextResponse.json({ images: [] });
  }

  try {
    const commonsImages = await fetchCommonsImagesByRegistration(query, limit);

    // Transform to the expected format
    const images = commonsImages.map((img) => ({
      url: img.thumb, // Thumbnail (300px) for grid
      original: img.url, // Full-size (1024px) for main image
      source: "Wikimedia Commons",
      author: img.author,
      photographer: img.author,
      title: `${query} Aircraft Image`,
      link: img.page,
      license: img.license,
      license_url: img.license_url,
    }));

    console.log(
      `[GET /api/images] Returning ${images.length} Commons images for ${query}`
    );
    return NextResponse.json({ images });
  } catch (error) {
    console.error("[GET /api/images] Error:", error);
    return NextResponse.json({ images: [] });
  }
}
