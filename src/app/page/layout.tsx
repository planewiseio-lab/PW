import type { Metadata } from "next";

// Métadonnées SEO pour la page d'accueil
export const metadata: Metadata = {
  title: "PlaneWise - Aviation Data & Flight Tracking Platform",
  description:
    "Professional aviation data platform for aircraft registration lookup, flight tracking, airport information, and real-time flight status. Track flights, find aircraft details, and access comprehensive aviation database.",
  keywords: [
    "aviation data",
    "flight tracking",
    "aircraft registration",
    "airport information",
    "flight status",
    "aircraft lookup",
    "aviation database",
    "flight tracker",
    "aircraft photos",
    "flight history",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "PlaneWise - Aviation Data & Flight Tracking Platform",
    description:
      "Professional aviation data platform for aircraft registration lookup, flight tracking, and airport information.",
    type: "website",
    url: "https://plane-wise.com",
    images: [
      {
        url: "/Assets/airplane.jpg",
        width: 1200,
        height: 630,
        alt: "PlaneWise Aviation Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PlaneWise - Aviation Data & Flight Tracking Platform",
    description:
      "Professional aviation data platform for aircraft registration lookup, flight tracking, and airport information.",
    images: ["/Assets/airplane.jpg"],
  },
  alternates: {
    canonical: "https://plane-wise.com",
  },
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

