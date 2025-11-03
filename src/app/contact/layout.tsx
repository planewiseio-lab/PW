import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us - PlaneWise",
  description:
    "Contact PlaneWise for questions, support, or partnership inquiries. We're here to help with your aviation data needs.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Contact Us - PlaneWise",
    description:
      "Contact PlaneWise for questions, support, or partnership inquiries. We're here to help with your aviation data needs.",
    type: "website",
    url: "https://plane-wise.com/contact",
    images: [
      {
        url: "/Assets/airplane.jpg",
        width: 1200,
        height: 630,
        alt: "PlaneWise Contact",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us - PlaneWise",
    description:
      "Contact PlaneWise for questions, support, or partnership inquiries. We're here to help with your aviation data needs.",
  },
  alternates: {
    canonical: "https://plane-wise.com/contact",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

