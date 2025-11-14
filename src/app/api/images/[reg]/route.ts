import { NextResponse } from "next/server";

const COMMONS = "https://commons.wikimedia.org/w/api.php";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ reg: string }> }
) {
  const { reg } = await ctx.params;
  if (!reg) {
    return NextResponse.json({ images: [] }, { status: 400 });
  }

  // Exemple de requête : on cherche dans l’espace Fichier (namespace=6)
  // on limite à ~30 fichiers, on récupère l’URL originale + une vignette large.
  const search = `("${reg}" OR ${reg.replace(
    "-",
    ""
  )}) (aircraft OR airplane OR aeroplane)`;
  const qs = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*", // ok même côté serveur
    prop: "imageinfo",
    generator: "search",
    gsrsearch: search,
    gsrnamespace: "6", // File:
    gsrlimit: "30",
    iiprop: "url|dimensions",
    iiurlwidth: "1600",
    uselang: "en",
  });

  const url = `${COMMONS}?${qs.toString()}`;
  try {
    const r = await fetch(url, { next: { revalidate: 60 * 60 * 24 } }); // cache 24h
    const j = await r.json();

    const pages = j?.query?.pages || {};
    const images: Array<{ full: string; thumb: string; title: string }> = [];

    for (const p of Object.values<any>(pages)) {
      const ii = p?.imageinfo?.[0];
      if (!ii) continue;
      const full = ii.url as string;
      const thumb = (ii.thumburl as string) || full; // si jamais pas de vignette, on réutilise l’original
      if (full) images.push({ full, thumb, title: p.title });
    }

    // déduplication simple
    const uniq = Array.from(new Map(images.map((i) => [i.full, i])).values());

    return NextResponse.json(
      { images: uniq },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=43200",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { images: [], error: e?.message || "commons_failed" },
      { status: 200 }
    );
  }
}
