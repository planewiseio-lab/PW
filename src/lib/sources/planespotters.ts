import { fetchJson } from "../http";
import type { Photo } from "../types";

type PlanespottersResponse = {
  photos?: Array<{
    thumbnail_large?: { src?: string; size?: { width?: number; height?: number } };
    thumbnail?: { src?: string; size?: { width?: number; height?: number } };
    link?: string;
    photographer?: string;
  }>;
  error?: string;
};

function parsePhotos(data: PlanespottersResponse | null): Photo[] {
  if (!data || data.error || !Array.isArray(data.photos)) return [];
  const photos: Photo[] = [];
  for (const item of data.photos) {
    const large = item.thumbnail_large;
    const small = item.thumbnail;
    const url = large?.src ?? small?.src;
    if (!url || !item.link) continue;
    photos.push({
      url,
      width: large?.size?.width ?? small?.size?.width,
      height: large?.size?.height ?? small?.size?.height,
      link: item.link,
      photographer: item.photographer?.trim() || "Planespotters.net",
      source: "planespotters",
      sourceName: "Planespotters.net",
    });
  }
  return photos;
}

export async function planespottersByReg(registration: string): Promise<Photo[]> {
  const data = await fetchJson<PlanespottersResponse>(
    `https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(registration)}`,
  );
  return parsePhotos(data);
}

export async function planespottersByHex(hex: string): Promise<Photo[]> {
  const data = await fetchJson<PlanespottersResponse>(
    `https://api.planespotters.net/pub/photos/hex/${encodeURIComponent(hex)}`,
  );
  return parsePhotos(data);
}
