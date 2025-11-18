import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us - PlaneWise",
  description:
    "Learn about credit usage and security for PlaneWise aviation data platform.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "About Us - PlaneWise",
    description:
      "Learn about credit usage and security for PlaneWise aviation data platform.",
    type: "website",
    url: "https://plane-wise.com/about-us",
    images: [
      {
        url: "/Assets/airplane.jpg",
        width: 1200,
        height: 630,
        alt: "PlaneWise About Us",
      },
    ],
  },
  alternates: {
    canonical: "https://plane-wise.com/about-us",
  },
};

export default function AboutUsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

