import type { NextConfig } from "next";

// Bundle Analyzer - Configuration conditionnelle
let withBundleAnalyzer: any = (config: NextConfig) => config;
if (process.env.ANALYZE === "true") {
  const bundleAnalyzer = require("@next/bundle-analyzer");
  withBundleAnalyzer = bundleAnalyzer({
    enabled: true,
  });
}

const nextConfig: NextConfig = {
  // Configuration Turbopack pour éviter le warning de workspace
  turbopack: {
    root: process.cwd(),
  },
  // Optimisations de performance
  experimental: {
    // Optimisation des imports pour réduire le bundle size
    // Ces packages sont automatiquement tree-shaked pour importer uniquement ce qui est utilisé
    optimizePackageImports: [
      "framer-motion", // Réduction de ~50KB via tree-shaking
      "lucide-react", // Tree-shaking automatique des icônes
      "@supabase/supabase-js", // Réduction via imports ciblés
      "@supabase/ssr", // Réduction via imports ciblés
      "react-leaflet", // Tree-shaking des composants Leaflet
      "leaflet", // Optimisation des imports Leaflet
      "aos", // Animation On Scroll - imports optimisés
    ],
  },
  // Note: swcMinify est activé par défaut dans Next.js 15, pas besoin de le spécifier
  // Note: Les scripts et prisma sont exclus du type checking via tsconfig.json
  // Exclure ioredis du bundling client (c'est un module serveur uniquement)
  serverExternalPackages: ["ioredis"],
  // Source maps - Activés uniquement en développement pour le debugging
  // En production, désactivés pour réduire la taille du bundle
  // Pour activer en production : productionBrowserSourceMaps: true
  productionBrowserSourceMaps: process.env.NODE_ENV === "development" ? false : false,
  // Webpack configuration pour optimiser le bundle
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Exclure ioredis du bundle client (module serveur uniquement)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ioredis: false,
      };

      // Exclure Next.js devtools en production pour réduire le bundle
      if (!dev) {
        // Exclure les devtools Next.js en production
        config.resolve.alias = {
          ...config.resolve.alias,
          "@next/devtools": false,
        };
      }

      // Optimisation de la minification en production
      if (!dev && config.optimization) {
        config.optimization.minimize = true;
        // Configuration avancée pour SWC minifier (déjà activé par défaut dans Next.js 15)
        // Les optimisations sont gérées automatiquement par SWC
      }
    }
    return config;
  },
  // Compression et optimisations
  compress: true,
  poweredByHeader: false,
  // Optimisation des images
  images: {
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "**.staticflickr.com",
      },
      {
        protocol: "https",
        hostname: "**.flickr.com",
      },
      {
        protocol: "https",
        hostname: "airport-data.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://js.stripe.com",
              "style-src 'self' 'unsafe-inline' https://accounts.google.com",
              "img-src 'self' data: https: *.wikimedia.org *.commons.wikimedia.org *.googleusercontent.com *.staticflickr.com *.flickr.com https://pagead2.googlesyndication.com https://*.googlesyndication.com",
              "font-src 'self' fonts.gstatic.com",
              "connect-src 'self' https://prod.api.market https://commons.wikimedia.org https://ssqqbcniphbdjttxgcug.supabase.co https://accounts.google.com https://oauth2.googleapis.com https://pagead2.googlesyndication.com https://api.stripe.com https://js.stripe.com",
              "frame-src 'self' https://accounts.google.com https://tpc.googlesyndication.com https://googleads.g.doubleclick.net https://js.stripe.com https://hooks.stripe.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
