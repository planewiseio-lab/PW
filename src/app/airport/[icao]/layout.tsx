import type { Metadata } from "next";

// Fonction pour générer les métadonnées SEO dynamiques
export async function generateMetadata({
  params,
}: {
  params: Promise<{ icao: string }>;
}): Promise<Metadata> {
  const { icao } = await params;
  const airportCode = decodeURIComponent(icao).toUpperCase();

  return {
    metadataBase: new URL("https://plane-wise.com"),
    title: `${airportCode} Airport - Departures & Arrivals Board`,
    description: `Live airport board for ${airportCode}. View real-time departures and arrivals, flight schedules, gate information, and airport status updates on PlaneWise aviation platform.`,
    keywords: [
      `${airportCode} airport`,
      `${airportCode} departures`,
      `${airportCode} arrivals`,
      `${airportCode} flight board`,
      "airport information",
      "flight schedules",
      "departure board",
      "arrival board",
      "airport status",
    ],
    openGraph: {
      title: `${airportCode} Airport - Departures & Arrivals Board`,
      description: `View live departures and arrivals for ${airportCode} airport with real-time flight information and schedules.`,
      type: "website",
      images: [
        {
          url: `/Assets/airport.jpg`,
          width: 1200,
          height: 630,
          alt: `${airportCode} Airport Board - PlaneWise`,
        },
      ],
    },
    twitter: {
      title: `${airportCode} Airport - Departures & Arrivals Board`,
      description: `View live departures and arrivals for ${airportCode} airport with real-time flight information and schedules.`,
      images: [`/Assets/airport.jpg`],
    },
    alternates: {
      canonical: `https://plane-wise.com/airport/${airportCode}`,
    },
  };
}

export default function AirportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
