import type { Metadata } from "next";

// Fonction pour générer les métadonnées SEO dynamiques
export async function generateMetadata({
  params,
}: {
  params: Promise<{ reg: string }>;
}): Promise<Metadata> {
  const { reg } = await params;
  const registration = decodeURIComponent(reg).toUpperCase();

  return {
    metadataBase: new URL("https://plane-wise.com"),
    title: `Aircraft ${registration} - Registration Details & Photos`,
    description: `Complete aircraft information for ${registration}. View registration details, aircraft photos, flight history, specifications, and operator information on PlaneWise aviation platform.`,
    keywords: [
      `aircraft ${registration}`,
      `${registration} registration`,
      `${registration} photos`,
      `${registration} details`,
      "aircraft registration lookup",
      "aviation database",
      "aircraft specifications",
      "flight history",
    ],
    openGraph: {
      title: `Aircraft ${registration} - Registration Details`,
      description: `View complete aircraft information for ${registration} including photos, specifications, and flight history.`,
      type: "website",
      images: [
        {
          url: `/Assets/airplane.jpg`,
          width: 1200,
          height: 630,
          alt: `Aircraft ${registration} - PlaneWise`,
        },
      ],
    },
    twitter: {
      title: `Aircraft ${registration} - Registration Details`,
      description: `View complete aircraft information for ${registration} including photos, specifications, and flight history.`,
      images: [`/Assets/airplane.jpg`],
    },
    alternates: {
      canonical: `https://plane-wise.com/aircraft/${registration}`,
    },
  };
}

export default function AircraftLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
