"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

interface AdSenseProps {
  adSlot: string;
  adFormat?: "auto" | "horizontal" | "vertical" | "rectangle";
  style?: React.CSSProperties;
  responsive?: boolean;
  className?: string;
}

/**
 * Composant Google AdSense
 *
 * Props:
 * - adSlot: L'ID du format de publicité (ex: "1234567890")
 * - adFormat: Format de la publicité (auto par défaut)
 * - style: Styles CSS personnalisés
 * - responsive: Si true, la pub s'adapte automatiquement
 */
export default function AdSense({
  adSlot,
  adFormat = "auto",
  style,
  responsive = true,
  className,
}: AdSenseProps) {
  const [isClient, setIsClient] = useState(false);
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;
  const isDevelopment = process.env.NODE_ENV === "development";

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!adsenseId) {
    console.warn("[AdSense] NEXT_PUBLIC_ADSENSE_ID not configured");
    return null;
  }

  // En développement, le placeholder est géré par AdSection
  if (isDevelopment) return null;

  if (!isClient) return null;

  return (
    <>
      <Script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
        crossOrigin="anonymous"
        strategy="lazyOnload"
      />
      <div className={className} style={style}>
        <ins
          className="adsbygoogle"
          style={{ display: "block", ...style }}
          data-ad-client={adsenseId}
          data-ad-slot={adSlot}
          data-ad-format={adFormat}
          data-full-width-responsive={responsive ? "true" : "false"}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                (adsbygoogle = window.adsbygoogle || []).push({});
              } catch (e) {
                console.error('[AdSense] Failed to push ad:', e);
              }
            `,
          }}
        />
      </div>
    </>
  );
}

/**
 * Composant pour afficher une publicité display rectangulaire standard
 */
export function AdUnitDisplay({ className }: { className?: string }) {
  return (
    <div className={`flex justify-center my-8 ${className || ""}`}>
      <AdSense
        adSlot={process.env.NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT || ""}
        adFormat="auto"
        responsive={true}
        className="min-h-[250px] w-full max-w-[728px]"
      />
    </div>
  );
}

/**
 * Composant pour afficher une publicité in-article (pour les pages de contenu)
 */
export function AdUnitInArticle({ className }: { className?: string }) {
  return (
    <div className={`flex justify-center my-6 ${className || ""}`}>
      <AdSense
        adSlot={process.env.NEXT_PUBLIC_ADSENSE_IN_ARTICLE_SLOT || ""}
        adFormat="fluid"
        responsive={true}
        className="min-h-[90px] w-full"
      />
    </div>
  );
}

/**
 * Composant pour afficher une publicité sidebar (pour les pages avec sidebar)
 */
export function AdUnitSidebar({ className }: { className?: string }) {
  return (
    <div className={`sticky top-4 ${className || ""}`}>
      <AdSense
        adSlot={process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT || ""}
        adFormat="auto"
        responsive={true}
        style={{ display: "block", width: "100%", minHeight: "250px" }}
      />
    </div>
  );
}

/**
 * Composant pour afficher une publicité compacte (pour les pages mobiles)
 */
export function AdUnitCompact({ className }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className || ""}`}>
      <AdSense
        adSlot={process.env.NEXT_PUBLIC_ADSENSE_COMPACT_SLOT || ""}
        adFormat="auto"
        responsive={true}
        className="min-h-[100px] w-full"
      />
    </div>
  );
}
