import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  experimental: { cpus: 1, optimizeCss: false },
  output: "standalone",
  poweredByHeader: false,
  // Deshabilitar preload de CSS del layout
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Eliminar preload de CSS en producción
      config.plugins = config.plugins || [];
    }
    return config;
  },
  // Cabeceras de seguridad base para despliegue sin Nginx delante.
  // NOTA: la CSP estricta con nonce por petición se inyecta en middleware.ts
  // (aquí sólo queda un respaldo endurecido, sin eval dinámico).
  async headers() {
    const allowIframe = process.env.ALLOW_IFRAME_PREVIEW === "1";
    const frameAncestors = allowIframe ? "frame-ancestors *;" : "frame-ancestors 'self';";
    const baseHeaders = [
      ...(allowIframe ? [] : [{ key: "X-Frame-Options", value: "SAMEORIGIN" }]),
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
    ];
    return [
      {
        source: "/:path*",
        headers: baseHeaders,
      },
      {
        source: "/api/media/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; style-src 'unsafe-inline'; sandbox",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
