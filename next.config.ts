import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration Turbopack pour éviter le warning de workspace
  turbopack: {
    root: process.cwd(),
  },
  // Optimisations de performance
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
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
    domains: ["commons.wikimedia.org", "upload.wikimedia.org"],
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: *.wikimedia.org *.commons.wikimedia.org",
              "font-src 'self' fonts.gstatic.com",
              "connect-src 'self' https://aerodatabox.p.rapidapi.com https://commons.wikimedia.org",
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
