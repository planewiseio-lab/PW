import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://plane-wise.com";

  // Aéroports populaires à inclure dans le sitemap
  const popularAirports = [
    "CYYZ", // Toronto Pearson
    "CYUL", // Montreal
    "CYVR", // Vancouver
    "KJFK", // New York JFK
    "KLAX", // Los Angeles
    "KORD", // Chicago O'Hare
    "KDFW", // Dallas
    "EGLL", // London Heathrow
    "LFPG", // Paris CDG
    "EDDF", // Frankfurt
    "EHAM", // Amsterdam
    "LEMD", // Madrid
    "OMDB", // Dubai
    "RJTT", // Tokyo Haneda
    "ZSPD", // Shanghai Pudong
  ];

  // Pages statiques
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about-us`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/refund-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.2,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.2,
    },
  ];

  // Pages d'aéroports populaires
  const airportPages = popularAirports.map((icao) => ({
    url: `${baseUrl}/airport/${icao}`,
    lastModified: new Date(),
    changeFrequency: "hourly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...airportPages];
}
