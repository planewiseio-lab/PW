"use client";

import { useUserStatus } from "@/contexts/UserStatusContext";
import { AdUnitDisplay, AdUnitInArticle, AdUnitCompact } from "./AdSense";

interface AdWrapperProps {
  type?: "display" | "in-article" | "compact";
  className?: string;
  children?: React.ReactNode;
}

/**
 * Composant wrapper qui affiche les publicités uniquement pour les utilisateurs guest/subscribed
 * Ne montre PAS les pubs pour les utilisateurs avec souscription active
 */
export function AdWrapper({
  type = "display",
  className,
  children,
}: AdWrapperProps) {
  const { shouldShowAds, status } = useUserStatus();

  // Si les pubs doivent être affichées (guest ou subscribed sans souscription active)
  if (!shouldShowAds) {
    return children ? <>{children}</> : null;
  }

  // Afficher la pub
  if (type === "display") {
    return (
      <div className={className}>
        <AdUnitDisplay className="mb-6" />
        {children}
      </div>
    );
  }

  if (type === "in-article") {
    return (
      <div className={className}>
        <AdUnitInArticle className="mb-4" />
        {children}
      </div>
    );
  }

  if (type === "compact") {
    return (
      <div className={className}>
        <AdUnitCompact className="mb-4" />
        {children}
      </div>
    );
  }

  return children ? <>{children}</> : null;
}

/**
 * Composant qui affiche une publicité entre le contenu
 * Utile pour les pages d'article ou de détail
 */
export function AdSection({
  className = "",
  positionLabel = "",
}: {
  className?: string;
  positionLabel?: string;
}) {
  const { shouldShowAds } = useUserStatus();

  if (!shouldShowAds) return null;

  // Mode développement: afficher un placeholder visuel
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <div className={`flex justify-center my-8 ${className}`}>
      {isDevelopment ? (
        <div className="w-full max-w-[728px] h-[90px] bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
          <div className="text-center">
            <div className="text-blue-600 font-semibold text-lg mb-1">
              📢 PUB ADSENSE - {positionLabel}
            </div>
            <div className="text-xs text-gray-500">
              728x90 Desktop / Responsive Mobile | Visible pour Guest et
              Subscribed (pas Pro)
            </div>
          </div>
        </div>
      ) : (
        <AdUnitDisplay />
      )}
    </div>
  );
}
