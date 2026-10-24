import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { jwtVerify } from "jose";
import { getJwtSecret, getLprApiKey, getBlindIndexSalt } from "@/lib/env";
import { isValidVersion } from "@/lib/versions";
import {
  checkRateLimit,
  isCaptchaRequired,
  recordSessionFailure,
  resetSessionFailures,
  verifyAndConsumeCaptcha,
  type RateLimitTier,
} from "@/lib/rate-limit";

function getSecretBytes(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}

const ISSUER = process.env.JWT_ISSUER ?? "sigte.local";
const AUDIENCE = process.env.JWT_AUDIENCE ?? "sigte.app";

const PROTECTED_UI = [
  { section: "admin", roles: ["ADMIN"] },
  { section: "guard", roles: ["GUARD", "ADMIN"] },
  { section: "user", roles: ["USER", "GUARD", "ADMIN"] },
];

const PUBLIC_API_ROUTES = [
  "/api/auth/captcha",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

/**
 * Identifica y resuelve unívocamente la sesión de usuario para la aplicación de rate-limiting (RT-07).
 * El cálculo se basa exclusivamente en la sesión activa (header, cookie, sub o hash de token),
 * evitando el bloqueo indiscriminado por IP compartida en la red institucional.
 */
export function resolveSessionId(req: NextRequest, verifiedSub?: string | null): string {
  // 1. Identificador de sesión explícito enviado en cabecera
  const headerSessionId = req.headers.get("x-session-id");
  if (headerSessionId && headerSessionId.trim()) {
    return headerSessionId.trim();
  }

  // 2. Cookie de sesión dedicada (sigte_session_id)
  const cookieSessionId = req.cookies.get("sigte_session_id")?.value;
  if (cookieSessionId && cookieSessionId.trim()) {
    return cookieSessionId.trim();
  }

  // 3. Sujeto autenticado verificado (sub de JWT)
  if (verifiedSub) {
    return `usr_${verifiedSub}`;
  }

  // 4. Token de sesión (Authorization: Bearer o Cookie sigte_session)
  const bearer = req.headers.get("authorization");
  const rawToken = bearer?.startsWith("Bearer ")
    ? bearer.slice(7)
    : req.cookies.get("sigte_session")?.value;

  if (rawToken && rawToken.trim()) {
    const salt = getBlindIndexSalt();
    return `sess_${createHmac("sha256", salt).update(rawToken).digest("hex").slice(0, 16)}`;
  }

  // 5. Fallback a huella cliente anónima
  const salt = getBlindIndexSalt();
  const ua = req.headers.get("user-agent") || "anonymous_client";
  return `guest_${createHmac("sha256", salt).update(ua).digest("hex").slice(0, 16)}`;
}

async function verifyToken(req: NextRequest) {
  const bearer = req.headers.get("authorization");
  let token: string | undefined;

  if (bearer?.startsWith("Bearer ")) {
    token = bearer.slice(7);
  } else {
    token = req.cookies.get("sigte_session")?.value;
  }

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretBytes(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload;
  } catch {
    return null;
  }
}

/**
 * Next.js 16 Proxy / Middleware (RT-02 / RQ-06 / RT-07 / RQ-07).
 *
 * Aplica limitación de tasa y mitigación interactiva basada en CAPTCHA exclusivamente
 * por sesión (sessionId), identificando la sesión que se intenta comprometer y bloqueando
 * su automatización tras 2 intentos fallidos consecutivos sin afectar a otros usuarios de la misma IP.
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 1. Recursos estáticos y Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Control Perimetral y Limitación de Tasa por Sesión (RT-07)
  if (pathname.startsWith("/api")) {
    // 2.1 Identificación estricta de la sesión
    const tokenPayload = await verifyToken(req);
    const sessionId = resolveSessionId(req, tokenPayload?.sub as string | undefined);

    // Endpoint de servicio de CAPTCHA es siempre accesible para permitir resolución
    if (pathname.startsWith("/api/auth/captcha")) {
      return NextResponse.next();
    }

    // 2.2 Verificación de mitigación interactiva (CAPTCHA tras 2 intentos fallidos consecutivos)
    if (isCaptchaRequired(sessionId)) {
      const captchaId =
        req.headers.get("x-captcha-id") || req.nextUrl.searchParams.get("captchaId");
      const captchaAnswer =
        req.headers.get("x-captcha-answer") || req.nextUrl.searchParams.get("captchaAnswer");
      const captchaToken =
        req.headers.get("x-captcha-token") || req.nextUrl.searchParams.get("captchaToken");

      if (captchaId && captchaAnswer) {
        const isValid = verifyAndConsumeCaptcha(
          sessionId,
          captchaId,
          captchaAnswer,
          captchaToken
        );
        if (!isValid) {
          return NextResponse.json(
            {
              error: "Desafío CAPTCHA incorrecto o expirado. Resuelve el desafío para continuar.",
              code: "CAPTCHA_REQUIRED",
              captchaRequired: true,
              sessionId,
            },
            {
              status: 403,
              headers: {
                "X-Captcha-Required": "true",
                "X-Session-Id": sessionId,
              },
            }
          );
        }
        // CAPTCHA resuelto con éxito, continúa con la petición normal
      } else {
        // Interceptar petición: se exige CAPTCHA por 2 o más fallos consecutivos en esta sesión
        return NextResponse.json(
          {
            error: "Se requiere validación de CAPTCHA tras 2 intentos fallidos consecutivos en la sesión",
            code: "CAPTCHA_REQUIRED",
            captchaRequired: true,
            sessionId,
          },
          {
            status: 403,
            headers: {
              "X-Captcha-Required": "true",
              "X-Session-Id": sessionId,
            },
          }
        );
      }
    }

    // 2.3 Limitación de tasa contextual por sesión (no por IP)
    let tier: RateLimitTier = "DEFAULT";
    if (pathname.startsWith("/api/auth/login")) {
      tier = "AUTH";
    } else if (pathname.includes("/qr")) {
      tier = "QR";
    } else if (pathname.startsWith("/api/access/verify-")) {
      tier = "PERIMETER";
    }

    const rateResult = checkRateLimit(sessionId, tier);
    if (!rateResult.allowed) {
      if (rateResult.captchaRequired) {
        return NextResponse.json(
          {
            error: "Se requiere validación de CAPTCHA tras 2 intentos fallidos consecutivos en la sesión",
            code: "CAPTCHA_REQUIRED",
            captchaRequired: true,
            sessionId,
          },
          {
            status: 403,
            headers: {
              "X-Captcha-Required": "true",
              "X-Session-Id": sessionId,
            },
          }
        );
      }

      return NextResponse.json(
        {
          error: "Demasiadas solicitudes en la sesión actual. Límite de tasa excedido.",
          code: "TOO_MANY_REQUESTS",
          retryAfter: rateResult.resetSeconds,
          sessionId,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateResult.resetSeconds),
            "X-RateLimit-Limit": String(rateResult.limit),
            "X-RateLimit-Remaining": "0",
            "X-Session-Id": sessionId,
          },
        }
      );
    }

    // Endpoints públicos de autenticación
    if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // Endpoint LPR perimetral (autenticación por API Key institucional o sesión)
    if (pathname === "/api/access/verify-lpr") {
      const apiKey = req.headers.get("x-lpr-api-key");
      const expectedKey = getLprApiKey();
      if (apiKey && apiKey === expectedKey) {
        return NextResponse.next();
      }
      if (tokenPayload && (tokenPayload.role === "GUARD" || tokenPayload.role === "ADMIN")) {
        return NextResponse.next();
      }
      recordSessionFailure(sessionId);
      return NextResponse.json(
        { error: "Autenticación requerida para nodo LPR (X-LPR-API-Key inválida)" },
        { status: 401 }
      );
    }

    // Verificación de sesión en APIs protegidas (RBAC)
    if (!tokenPayload) {
      recordSessionFailure(sessionId);
      return NextResponse.json(
        { error: "No autenticado", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userRole = tokenPayload.role as string;

    // Rutas exclusivas de administración (/api/admin/*)
    if (pathname.startsWith("/api/admin")) {
      if (userRole !== "ADMIN") {
        recordSessionFailure(sessionId);
        return NextResponse.json(
          { error: `Acceso denegado: se requiere rol ADMIN (rol actual: ${userRole})`, code: "FORBIDDEN" },
          { status: 403 }
        );
      }
    }

    // Rutas operativas de fiscalización
    if (
      pathname.startsWith("/api/violations") ||
      pathname.startsWith("/api/infractions")
    ) {
      if (req.method === "POST" && userRole === "USER") {
        recordSessionFailure(sessionId);
        return NextResponse.json(
          { error: "Solo el personal de seguridad puede cursar infracciones", code: "FORBIDDEN" },
          { status: 403 }
        );
      }
    }

    return NextResponse.next();
  }

  // 3. Rutas Web UI
  if (pathname === "/") {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];

  // Si no tiene versión, redirigir a /v3
  if (!isValidVersion(firstSegment)) {
    const targetUrl = req.nextUrl.clone();
    targetUrl.pathname = `/v3${pathname}`;
    targetUrl.search = search;
    return NextResponse.redirect(targetUrl);
  }

  const version = firstSegment;
  const section = segments[1];

  const match = PROTECTED_UI.find((p) => p.section === section);
  if (!match) {
    return NextResponse.next();
  }

  const payload = await verifyToken(req);
  if (!payload) {
    const url = req.nextUrl.clone();
    url.pathname = `/${version}/login`;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (!match.roles.includes(payload.role as string)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${version}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export { proxy as middleware };

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
