import { describe, expect, it, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy as middleware } from "./proxy";
import { signToken } from "./lib/auth";
import { getLprApiKey } from "./lib/env";
import {
  recordSessionFailure,
  createSessionCaptcha,
  resetRateLimitStore,
} from "./lib/rate-limit";

describe("proxy.ts (Next.js 16 Middleware) - Matriz RBAC, Rate Limiting por Sesión y Mitigación CAPTCHA (RT-02 / RQ-06 / RT-07)", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("permite el paso libre a rutas de autenticación públicas", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
    });
    const res = await middleware(req);
    expect(res.status).toBe(200); // NextResponse.next() returns 200 internally
  });

  it("bloquea con HTTP 401 cualquier API protegida si no hay sesión", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/audit/verify", {
      method: "GET",
    });
    const res = await middleware(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("No autenticado");
  });

  it("bloquea con HTTP 403 a usuarios con rol USER intentando acceder a endpoints de ADMIN", async () => {
    const userToken = await signToken({
      sub: "user-1",
      email: "conductor@usm.cl",
      name: "Conductor",
      role: "USER",
    });

    const req = new NextRequest("http://localhost:3000/api/admin/audit/verify", {
      method: "GET",
      headers: {
        authorization: `Bearer ${userToken}`,
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error).toContain("ADMIN");
  });

  it("permite el acceso a endpoints de ADMIN si la sesión tiene rol ADMIN", async () => {
    const adminToken = await signToken({
      sub: "admin-1",
      email: "admin@usm.cl",
      name: "Administrador",
      role: "ADMIN",
    });

    const req = new NextRequest("http://localhost:3000/api/admin/audit/verify", {
      method: "GET",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it("bloquea con HTTP 403 a un USER que intente cursar infracciones (POST /api/infractions)", async () => {
    const userToken = await signToken({
      sub: "user-1",
      email: "conductor@usm.cl",
      name: "Conductor",
      role: "USER",
    });

    const req = new NextRequest("http://localhost:3000/api/infractions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${userToken}`,
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(403);
  });

  it("bloquea peticiones al nodo LPR (/api/access/verify-lpr) sin credenciales válidas", async () => {
    const req = new NextRequest("http://localhost:3000/api/access/verify-lpr", {
      method: "POST",
    });

    const res = await middleware(req);
    expect(res.status).toBe(401);
  });

  it("permite peticiones al nodo LPR con la clave de servicio X-LPR-API-Key correcta", async () => {
    const apiKey = getLprApiKey();
    const req = new NextRequest("http://localhost:3000/api/access/verify-lpr", {
      method: "POST",
      headers: {
        "x-lpr-api-key": apiKey,
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  // ── Pruebas de los Requerimientos Actualizados (RT-07 / RQ-07) ───────────────────
  it("intercepta peticiones exigiendo CAPTCHA tras registrar 2 intentos fallidos consecutivos en la sesión", async () => {
    const sessionId = "session-under-attack";

    // Simular 2 intentos fallidos consecutivos sobre esta sesión en particular
    recordSessionFailure(sessionId);
    recordSessionFailure(sessionId);

    // Intento subsecuente desde dicha sesión hacia la API
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "x-session-id": sessionId,
        "x-forwarded-for": "10.200.5.50", // IP universitaria compartida
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.code).toBe("CAPTCHA_REQUIRED");
    expect(body.captchaRequired).toBe(true);
    expect(res.headers.get("X-Captcha-Required")).toBe("true");
  });

  it("garantiza que otra sesión en la misma IP no sea bloqueada (sin afección por NAT compartido)", async () => {
    const sharedIp = "10.200.5.50";
    const sessionAttacker = "session-attacker-123";
    const sessionStudent = "session-student-456";

    // Sesión atacante acumula 2 fallos consecutivos
    recordSessionFailure(sessionAttacker);
    recordSessionFailure(sessionAttacker);

    // Petición desde la sesión atacante: interceptada con CAPTCHA
    const reqAttacker = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "x-session-id": sessionAttacker,
        "x-forwarded-for": sharedIp,
      },
    });
    const resAttacker = await middleware(reqAttacker);
    expect(resAttacker.status).toBe(403);
    expect(resAttacker.headers.get("X-Captcha-Required")).toBe("true");

    // Petición desde la sesión de estudiante legítimo desde la MISMA IP: opera libremente
    const reqStudent = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "x-session-id": sessionStudent,
        "x-forwarded-for": sharedIp,
      },
    });
    const resStudent = await middleware(reqStudent);
    expect(resStudent.status).toBe(200); // Paso libre en middleware a login
    expect(resStudent.headers.get("X-Captcha-Required")).toBeNull();
  });

  it("permite el paso en middleware si la sesión interceptada envía la respuesta correcta de CAPTCHA", async () => {
    const sessionId = "session-needs-captcha-unlock";

    // Provocar 2 fallos
    recordSessionFailure(sessionId);
    recordSessionFailure(sessionId);

    // Obtener desafío CAPTCHA
    const challenge = createSessionCaptcha(sessionId);
    const match = challenge.question.match(/¿Cuánto es (\d+) \+ (\d+)\?/);
    expect(Boolean(match)).toBe(true);
    const sum = String(parseInt(match![1], 10) + parseInt(match![2], 10));

    // Enviar petición con cabeceras de resolución de CAPTCHA
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "x-session-id": sessionId,
        "x-captcha-id": challenge.challengeId,
        "x-captcha-answer": sum,
        "x-captcha-token": challenge.token,
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(200); // Desbloqueado exitosamente y permitido continuar
    expect(res.headers.get("X-Captcha-Required")).toBeNull();
  });
});
