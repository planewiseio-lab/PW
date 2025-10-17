import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json([], { status: 200 });

  // ⚠️ Chemin exemple : à ajuster selon l’endpoint Aerodatabox que tu utilises
  // Souvent, on interroge par immatriculation :
  const upstreamUrl = `${
    process.env.AIRREG_API_BASE
  }/aircraft/registration/${encodeURIComponent(q)}`;

  try {
    const r = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "X-RapidAPI-Key": process.env.AIRREG_API_KEY as string,
        "X-RapidAPI-Host": process.env.AIRREG_API_HOST as string,
      },
    });

    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json(
        {
          error: "Upstream error",
          status: r.status,
          detail: text,
          url: upstreamUrl,
        },
        { status: 502 }
      );
    }

    const upstream = await r.json();
    const items = normalize(upstream);
    return NextResponse.json(items, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function normalize(u: any) {
  const list = Array.isArray(u) ? u : u?.items || u?.data || [u];
  return (list || [])
    .map((x: any) => ({
      id:
        x.id ||
        x.registration ||
        x.reg ||
        x.tailNumber ||
        String(Math.random()),
      registration: x.registration || x.reg || x.tailNumber || "",
      type: x.type || x.aircraftType || x.model || "",
      operator: x.operator || x.owner || x.airline || "",
    }))
    .filter((r: any) => r.registration);
}
