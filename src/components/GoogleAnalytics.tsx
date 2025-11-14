"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { useCookieConsent } from "@/hooks/useCookieConsent";

export default function GoogleAnalytics() {
  const consent = useCookieConsent();
  const [shouldLoad, setShouldLoad] = useState(false);
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  useEffect(() => {
    // Ne charger que si le consentement est accepté
    if (consent === "accepted") {
      setShouldLoad(true);
    } else if (consent === "rejected") {
      setShouldLoad(false);
    }
    // Si consent est null, on attend (banner pas encore affiché)
  }, [consent]);

  // Ne pas charger si pas de GA ID ou si pas de consentement
  if (!gaId || !shouldLoad) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            'anonymize_ip': true,
            'cookie_flags': 'SameSite=None;Secure'
          });
        `}
      </Script>
    </>
  );
}

