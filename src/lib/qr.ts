import { createHmac, timingSafeEqual } from "crypto";
import { requireSecret } from "./env";

/**
 * QR de acceso firmado.
 *
 * Formato del token: `sigte:v1:<vehicleId>:<issuedAt>:<sig>`
 *   - issuedAt: epoch ms en que se emitió.
 *   - sig: HMAC-SHA256 (hex) de `sigte:v1:<vehicleId>:<issuedAt>` con el secreto.
 *
 * La firma evita que un QR sea falsificado y la marca de tiempo permite
 * expirarlo. El secreto sale de QR_SECRET / JWT_SECRET (fallback dev).
 */
const SECRET =
  process.env.QR_SECRET ?? requireSecret("JWT_SECRET", "dev-secret");

const QR_TTL_MS = 5 * 60_000; // 5 minutos

function sign(vehicleId: string, issuedAt: number): string {
  return createHmac("sha256", SECRET)
    .update(`sigte:v1:${vehicleId}:${issuedAt}`)
    .digest("hex");
}

/** Genera un token firmado para un vehículo. */
export function signQrToken(vehicleId: string, issuedAt: number = Date.now()): string {
  const sig = sign(vehicleId, issuedAt);
  return `sigte:v1:${vehicleId}:${issuedAt}:${sig}`;
}

export type QrVerifyResult =
  | { ok: true; vehicleId: string; issuedAt: number }
  | { ok: false; error: "invalido" | "expirado" };

/**
 * Verifica firma y vigencia de un token QR.
 * Devuelve el vehicleId si es válido, o un error tipado.
 */
export function verifyQrToken(token: string): QrVerifyResult {
  const parts = token.split(":");
  // sigte : v1 : vehicleId : issuedAt : sig
  if (parts.length !== 5 || parts[0] !== "sigte" || parts[1] !== "v1") {
    return { ok: false, error: "invalido" };
  }
  const vehicleId = parts[2];
  const issuedAt = parseInt(parts[3] ?? "", 10);
  const sig = parts[4];
  if (!vehicleId || !Number.isFinite(issuedAt) || !sig) {
    return { ok: false, error: "invalido" };
  }

  const expected = sign(vehicleId, issuedAt);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "invalido" };
  }

  if (Date.now() - issuedAt > QR_TTL_MS) {
    return { ok: false, error: "expirado" };
  }

  return { ok: true, vehicleId, issuedAt };
}

export { QR_TTL_MS };
