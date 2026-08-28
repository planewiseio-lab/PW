import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://planewise.io/sitemap.xml",
    host: "https://planewise.io",
  };
}
