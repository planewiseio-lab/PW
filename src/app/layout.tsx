import type { Metadata } from "next";
import { Comfortaa, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { AdSenseScript } from "@/components/AdSenseScript";
import { getLang } from "@/lib/lang";
import { ADSENSE_CLIENT } from "@/lib/adsense";
import { homeSeo, localeFor, SITE_URL } from "@/lib/seo";
import "./globals.css";

const sans = Comfortaa({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const home = homeSeo(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: home.title,
      template: "%s · PlaneWise",
    },
    description: home.description,
    applicationName: "PlaneWise",
    authors: [{ name: "PlaneWise", url: SITE_URL }],
    keywords: [
      "immatriculation avion",
      "aircraft registration",
      "tail number",
      "aviation",
      "PlaneWise",
    ],
    openGraph: {
      type: "website",
      locale: localeFor(lang),
      url: SITE_URL,
      siteName: "PlaneWise",
      title: home.title,
      description: home.description,
    },
    twitter: {
      card: "summary_large_image",
      title: home.title,
      description: home.description,
    },
    robots: { index: true, follow: true },
    other: {
      "google-adsense-account": ADSENSE_CLIENT,
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();
  return (
    <html
      lang={lang}
      className={`${sans.variable} ${sans.className} ${mono.variable} h-full antialiased`}
    >
      <body>
        <AdSenseScript />
        <AppShell lang={lang}>{children}</AppShell>
      </body>
    </html>
  );
}
