import { EXAMPLE_REGISTRATIONS } from "@/lib/examples";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const examples: MetadataRoute.Sitemap = EXAMPLE_REGISTRATIONS.map((example) => ({
    url: `https://planewise.io/?q=${encodeURIComponent(example.registration)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [
    {
      url: "https://planewise.io",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
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
    ...examples,
  ];
}
