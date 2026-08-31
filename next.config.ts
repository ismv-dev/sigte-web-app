import type { NextConfig } from "next";

// Origen permitido para peticiones cross-origin desde el navegador a /api.
// La app móvil (Expo) es nativa y no aplica CORS, así que no necesita el
// comodín; los clientes web sí. Configurable con CORS_ORIGIN; por defecto el
// propio origen de la app. Usar "*" explícito solo si se acepta el riesgo.
const CORS_ORIGIN =
  process.env.CORS_ORIGIN ?? process.env.APP_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: CORS_ORIGIN },
          { key: "Vary", value: "Origin" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
