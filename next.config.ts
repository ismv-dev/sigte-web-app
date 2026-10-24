import type { NextConfig } from "next";

// Origen permitido para peticiones cross-origin desde el navegador a /api.
const CORS_ORIGIN = process.env.CORS_ORIGIN;

const isWindows = process.platform === "win32";

const securityHeaders = [
  // Mitigación de Clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Mitigación de MIME-sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Privacidad de Referrer
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Control estricto de APIs del navegador
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  // Enforzamiento estricto de HTTPS (HSTS - RT-08)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // X-XSS-Protection legado
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Content Security Policy (CSP - RT-07)
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: !isWindows || process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", "prisma"],
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ["192.168.100.4", "localhost:3000", "127.0.0.1:3000"],

  async redirects() {
    return [
      { source: "/login", destination: "/v3/login", permanent: false },
      { source: "/register", destination: "/v3/register", permanent: false },
      { source: "/forgot-password", destination: "/v3/forgot-password", permanent: false },
      { source: "/reset-password", destination: "/v3/reset-password", permanent: false },
      { source: "/user", destination: "/v3/user", permanent: false },
      { source: "/user/:path*", destination: "/v3/user/:path*", permanent: false },
      { source: "/guard", destination: "/v3/guard", permanent: false },
      { source: "/guard/:path*", destination: "/v3/guard/:path*", permanent: false },
      { source: "/admin", destination: "/v3/admin", permanent: false },
      { source: "/admin/:path*", destination: "/v3/admin/:path*", permanent: false },
    ];
  },

  async headers() {
    const apiHeaders: { key: string; value: string }[] = [
      { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
      { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-LPR-API-Key" },
    ];
    if (CORS_ORIGIN) {
      apiHeaders.unshift({ key: "Access-Control-Allow-Origin", value: CORS_ORIGIN });
      apiHeaders.push({ key: "Vary", value: "Origin" });
    }

    return [
      {
        source: "/api/:path*",
        headers: apiHeaders,
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
