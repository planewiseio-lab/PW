import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration Turbopack pour éviter le warning de workspace
  turbopack: {
    root: process.cwd(),
  },
  // Optimisations de performance
  experimental: {
    optimizePackageImports: ["framer-motion"], // lucide-react retiré temporairement pour éviter les problèmes de cache HMR avec Turbopack
  },
  // Exclure ioredis du bundling client (c'est un module serveur uniquement)
  serverExternalPackages: ["ioredis"],
  // Webpack configuration pour exclure ioredis du bundle client
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclure ioredis du bundle client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ioredis: false,
      };
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
    domains: [
      "commons.wikimedia.org",
      "upload.wikimedia.org",
      "farm5.staticflickr.com",
      "farm66.staticflickr.com",
      "staticflickr.com",
    ],
  },
  async headers() {
    return [
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

export default nextConfig;
