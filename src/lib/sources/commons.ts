import { fetchJson } from "../http";
import { registrationVariants } from "../normalize";
import type { Photo } from "../types";

type CommonsPage = {
  title?: string;
  imageinfo?: Array<{
    thumburl?: string;
    url?: string;
    thumbwidth?: number;
    thumbheight?: number;
    descriptionurl?: string;
    mime?: string;
    extmetadata?: {
      Artist?: { value?: string };
      LicenseShortName?: { value?: string };
      Categories?: { value?: string };
    };
  }>;
};

type CommonsResponse = {
  query?: { pages?: Record<string, CommonsPage> };
};

function stripHtml(value?: string): string {
  if (!value) return "";
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function isImageMime(mime?: string): boolean {
  return !mime || mime.startsWith("image/");
}

export async function commonsPhotos(registration: string): Promise<Photo[]> {
  const titles = registrationVariants(registration).map(
    (variant) => `Category:${variant} (aircraft)`,
  );

  for (const title of titles) {
    const url =
      "https://commons.wikimedia.org/w/api.php?" +
      new URLSearchParams({
        action: "query",
        generator: "categorymembers",
        gcmtitle: title,
        gcmtype: "file",
        gcmlimit: "6",
        prop: "imageinfo",
        iiprop: "url|extmetadata|size|mime",
        iiurlwidth: "1600",
        format: "json",
        origin: "*",
      }).toString();

    const data = await fetchJson<CommonsResponse>(url);
    const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
    const photos: Photo[] = [];
    const seenStems = new Set<string>();

    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!info || !isImageMime(info.mime)) continue;
      const src = info.thumburl || info.url;
      const link = info.descriptionurl;
      if (!src || !link) continue;
      const stem = (page.title ?? src)
        .toLowerCase()
        .replace(/\.(jpe?g|png|gif|webp)$/i, "")
        .replace(/[^a-z0-9]+/g, "");
      if (stem && seenStems.has(stem)) continue;
      if (stem) seenStems.add(stem);
      photos.push({
        url: src,
        width: info.thumbwidth,
        height: info.thumbheight,
        link,
        photographer:
          stripHtml(info.extmetadata?.Artist?.value) || "Wikimedia Commons",
        source: "commons",
        sourceName: "Wikimedia Commons",
      });
    }

    if (photos.length) return photos;
  }

  return [];
}
