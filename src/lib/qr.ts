import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { getQrSecret } from "./env";
import type { PrismaClient } from "@prisma/client";

/**
 * Tiempo de vida estándar de credenciales QR dinámicas: 5 minutos (RT-01, RQ-05).
 */
const QR_TTL_MS = 5 * 60_000;

function getSecret(): string {
  return getQrSecret();
}

function signV1(vehicleId: string, issuedAt: number): string {
  return createHmac("sha256", getSecret())
    .update(`sigte:v1:${vehicleId}:${issuedAt}`)
    .digest("hex");
}

function signV2(vehicleId: string, issuedAt: number, jti: string, userId: string = ""): string {
  return createHmac("sha256", getSecret())
    .update(`sigte:v2:${vehicleId}:${issuedAt}:${jti}:${userId}`)
    .digest("hex");
}

export interface DynamicQrPayload {
  token: string;
  jti: string;
  vehicleId: string;
  userId?: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Genera una credencial QR dinámica efímera con identificador único (jti) (RT-01 / RQ-05).
 *   Formato: `sigte:v2:<vehicleId>:<issuedAt>:<jti>:<userId>:<sig>`
 */
export function signDynamicQr(
  vehicleId: string,
  userId: string = "",
  issuedAt: number = Date.now()
): DynamicQrPayload {
  const jti = randomUUID();
  const expiresAt = issuedAt + QR_TTL_MS;
  const sig = signV2(vehicleId, issuedAt, jti, userId);
  const token = `sigte:v2:${vehicleId}:${issuedAt}:${jti}:${userId}:${sig}`;

  return {
    token,
    jti,
    vehicleId,
    userId: userId || undefined,
    issuedAt,
    expiresAt,
  };
}

/**
 * Genera un token firmado para un vehículo (compatibilidad v1).
 */
export function signQrToken(vehicleId: string, issuedAt: number = Date.now()): string {
  const sig = signV1(vehicleId, issuedAt);
  return `sigte:v1:${vehicleId}:${issuedAt}:${sig}`;
}

export type QrVerifyResult =
  | { ok: true; vehicleId: string; issuedAt: number; jti?: string; userId?: string; version: "v1" | "v2" }
  | { ok: false; error: "invalido" | "expirado" };

/**
 * Verifica firma criptográfica (HMAC-SHA256) y vigencia temporal (TTL <= 5 min)
 * de un token QR. Soporta formatos v1 y v2.
 */
export function verifyQrToken(token: string): QrVerifyResult {
  if (!token || typeof token !== "string") {
    return { ok: false, error: "invalido" };
  }

  const parts = token.split(":");

  // Formato v2: sigte:v2:<vehicleId>:<issuedAt>:<jti>:<userId>:<sig>
  if (parts.length === 7 && parts[0] === "sigte" && parts[1] === "v2") {
    const vehicleId = parts[2];
    const issuedAt = parseInt(parts[3] ?? "", 10);
    const jti = parts[4];
    const userId = parts[5];
    const sig = parts[6];

    if (!vehicleId || !Number.isFinite(issuedAt) || !jti || !sig) {
      return { ok: false, error: "invalido" };
    }

    const expected = signV2(vehicleId, issuedAt, jti, userId);
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: "invalido" };
    }

    if (Date.now() - issuedAt > QR_TTL_MS) {
      return { ok: false, error: "expirado" };
    }

    return {
      ok: true,
      vehicleId,
      issuedAt,
      jti,
      userId: userId || undefined,
      version: "v2",
    };
  }

  // Formato v1 (legacy): sigte:v1:<vehicleId>:<issuedAt>:<sig>
  if (parts.length === 5 && parts[0] === "sigte" && parts[1] === "v1") {
    const vehicleId = parts[2];
    const issuedAt = parseInt(parts[3] ?? "", 10);
    const sig = parts[4];

    if (!vehicleId || !Number.isFinite(issuedAt) || !sig) {
      return { ok: false, error: "invalido" };
    }

    const expected = signV1(vehicleId, issuedAt);
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: "invalido" };
    }

    if (Date.now() - issuedAt > QR_TTL_MS) {
      return { ok: false, error: "expirado" };
    }

    return {
      ok: true,
      vehicleId,
      issuedAt,
      version: "v1",
    };
  }

  return { ok: false, error: "invalido" };
}

export type QrConsumptionResult =
  | { ok: true; vehicleId: string; jti: string; issuedAt: number }
  | { ok: false; error: "invalido" | "expirado" | "replay"; message: string };

/**
 * Valida criptográficamente el token y consume de forma transaccional y atómica
 * su identificador de un solo uso (jti) en la tabla `UsedNonce` de la base de datos (RT-01 / RQ-05).
 * Neutraliza ataques de repetición y colisiones en arquitecturas concurrentes serverless.
 */
export async function consumeQrToken(
  prisma: PrismaClient,
  token: string,
  context?: { ipAddress?: string }
): Promise<QrConsumptionResult> {
  const verified = verifyQrToken(token);
  if (!verified.ok) {
    return {
      ok: false,
      error: verified.error,
      message: verified.error === "expirado" ? "QR expirado (vigencia máxima 5 minutos)" : "QR inválido",
    };
  }

  // En tokens v1 que no poseen jti, generamos uno determinista a partir del token para proteger repeticiones
  const jti = verified.jti || `legacy-${createHmac("sha256", "legacy").update(token).digest("hex")}`;
  const expiresAt = new Date(verified.issuedAt + QR_TTL_MS);

  try {
    // Inserción atómica en base de datos protegida por restricción de unicidad PRIMARY KEY / UNIQUE en PostgreSQL
    await prisma.usedNonce.create({
      data: {
        jti,
        vehicleId: verified.vehicleId,
        userId: verified.userId || null,
        expiresAt,
      },
    });

    return {
      ok: true,
      vehicleId: verified.vehicleId,
      jti,
      issuedAt: verified.issuedAt,
    };
  } catch (err: unknown) {
    // Código P2002 de Prisma: Unique constraint failed on the fields: (`jti`)
    const isConflict =
      err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002";

    if (isConflict) {
      // Registro de incidente de seguridad forense (RQ-07)
      try {
        await prisma.securityEvent.create({
          data: {
            type: "REPLAY_ATTACK_DETECTED",
            severity: "HIGH",
            ipAddress: context?.ipAddress || null,
            details: JSON.stringify({
              jti,
              vehicleId: verified.vehicleId,
              timestamp: new Date().toISOString(),
              message: "Intento de reutilización de credencial efímera ya consumida",
            }),
          },
        });
      } catch {
        // Ignorar fallo secundario de log si la transacción primaria falló
      }

      return {
        ok: false,
        error: "replay",
        message: "Ataque de repetición detectado: este código QR ya fue consumido",
      };
    }

    throw err;
  }
}

export { QR_TTL_MS };
