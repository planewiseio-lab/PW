import type { Metadata } from "next";

// Fonction pour générer les métadonnées SEO dynamiques
export async function generateMetadata({
  params,
}: {
  params: Promise<{ flight: string }>;
}): Promise<Metadata> {
  const { flight } = await params;
  const flightNumber = decodeURIComponent(flight).toUpperCase();

  return {
    metadataBase: new URL("https://plane-wise.com"),
    title: `Flight ${flightNumber} - Live Status & Details`,
    description: `Track flight ${flightNumber} in real-time. View flight status, departure/arrival times, aircraft details, route information, and live updates on PlaneWise aviation platform.`,
    keywords: [
      `flight ${flightNumber}`,
      `${flightNumber} status`,
      `${flightNumber} tracking`,
      `${flightNumber} details`,
      "flight tracking",
      "flight status",
      "live flight updates",
      "aviation tracking",
    ],
    openGraph: {
      title: `Flight ${flightNumber} - Live Status & Details`,
      description: `Track flight ${flightNumber} in real-time with live updates, status, and detailed information.`,
      type: "website",
      images: [
        {
          url: `/Assets/flight.jpg`,
          width: 1200,
          height: 630,
          alt: `Flight ${flightNumber} Tracking - PlaneWise`,
        },
      ],
    },
    twitter: {
      title: `Flight ${flightNumber} - Live Status & Details`,
      description: `Track flight ${flightNumber} in real-time with live updates, status, and detailed information.`,
      images: [`/Assets/flight.jpg`],
    },
    alternates: {
      canonical: `https://plane-wise.com/flight/${flightNumber}`,
    },
  };
}

export default function FlightLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
