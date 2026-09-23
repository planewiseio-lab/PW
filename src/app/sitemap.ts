import { SEED_REGISTRATIONS } from "@/lib/seed";
import { AIRLINES } from "@/lib/airlines";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const fiches: MetadataRoute.Sitemap = SEED_REGISTRATIONS.map(
    (registration) => ({
      url: `https://planewise.io/${encodeURIComponent(registration)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }),
  );

  const airlines: MetadataRoute.Sitemap = [
    {
      url: "https://planewise.io/airlines",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...AIRLINES.map((airline) => ({
      url: `https://planewise.io/airlines/${airline.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];

  return [
    {
      url: "https://planewise.io",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...airlines,
    {
      url: "https://planewise.io/legal",
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://planewise.io/contact",
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...fiches,
  ];
}
