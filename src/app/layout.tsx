import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AdSenseScript } from "@/components/AdSenseScript";
import { getLang } from "@/lib/lang";
import { ADSENSE_CLIENT } from "@/lib/adsense";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const title = "PlaneWise";
const description =
  "Look up an aircraft by registration — specs, age, and a photo of that airframe. planewise.io";

export const metadata: Metadata = {
  metadataBase: new URL("https://planewise.io"),
  title: {
    default: title,
    template: "%s · PlaneWise",
  },
  description,
  applicationName: "PlaneWise",
  authors: [{ name: "PlaneWise", url: "https://planewise.io" }],
  keywords: [
    "avion",
    "immatriculation",
    "tail number",
    "aircraft registration",
    "PlaneWise",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://planewise.io",
    siteName: "PlaneWise",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: { index: true, follow: true },
  other: {
    "google-adsense-account": ADSENSE_CLIENT,
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();
  return (
    <html
      lang={lang}
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AdSenseScript />
        <div className="app-shell">
          <SiteHeader lang={lang} />
          {children}
          <SiteFooter lang={lang} />
        </div>
      </body>
    </html>
  );
}
