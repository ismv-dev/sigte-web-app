import { createHash } from "crypto";

/**
 * Lee un secreto de entorno. En producción, nunca cae a un valor por
 * defecto: si falta, revienta al arrancar en vez de firmar JWT/QR con un
 * secreto predecible y conocido (visible en este mismo código).
 */
export function requireSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `Falta la variable de entorno ${name} en producción. No se usa ningún valor por defecto por seguridad.`
    );
  }
  return devFallback;
}

/**
 * Claves y secretos institucionales requeridos para el marco de ciberseguridad
 * definido en la tesina (Capítulo 3: RT-01, RT-04, RT-06, RT-07, RT-08).
 */
export function getJwtSecret(): string {
  return requireSecret(
    "JWT_SECRET",
    "sigte-dev-jwt-secret-min-32-chars-length-2026-safe"
  );
}

export function getQrSecret(): string {
  return (
    process.env.QR_SECRET ||
    requireSecret(
      "JWT_SECRET",
      "sigte-dev-qr-secret-min-32-chars-length-2026-safe"
    )
  );
}

/**
 * Clave simétrica de 256 bits (32 bytes) para cifrado AES-256-GCM
 * de matrículas vehiculares en reposo (RT-04).
 */
export function getPlateEncryptionKey(): Buffer {
  const secret = requireSecret(
    "PLATE_ENCRYPTION_KEY",
    "sigte-dev-plate-encryption-key-32-chars-safe!"
  );
  // Se asegura que tenga exactamente 32 bytes mediante derivación SHA-256
  return createHash("sha256").update(secret).digest();
}

/**
 * Sal secreta institucional fija para el cálculo determinista
 * del índice ciego de patentes (Blind Indexing vía HMAC-SHA256) (RT-04).
 */
export function getBlindIndexSalt(): string {
  return requireSecret(
    "BLIND_INDEX_SALT",
    "sigte-dev-blind-index-salt-institutional-2026"
  );
}

/**
 * Clave secreta externa segregada (K_audit) utilizada para el sellado
 * y encadenamiento criptográfico HMAC-SHA256 de las bitácoras de auditoría (RT-06).
 * No debe residir en la base de datos.
 */
export function getAuditSecretKey(): string {
  return requireSecret(
    "AUDIT_SECRET_KEY",
    "sigte-dev-audit-secret-key-segregated-k-audit-2026"
  );
}

/**
 * Clave API de servicio compartida para la autenticación de nodos
 * periféricos de lectura automática de patentes LPR (RT-08).
 */
export function getLprApiKey(): string {
  return requireSecret(
    "LPR_API_KEY",
    "sigte-dev-lpr-gateway-api-key-secure-access-token"
  );
}

/**
 * Validación general de la postura de seguridad en el arranque.
 */
export function validateSecurityConfig(): { ok: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === "production";

  if (!process.env.JWT_SECRET) {
    if (isProduction) throw new Error("CRITICAL: JWT_SECRET must be set in production");
    warnings.push("JWT_SECRET está usando valor fallback de desarrollo");
  }

  if (!process.env.PLATE_ENCRYPTION_KEY && !isProduction) {
    warnings.push("PLATE_ENCRYPTION_KEY está usando valor fallback de desarrollo");
  }

  if (!process.env.AUDIT_SECRET_KEY && !isProduction) {
    warnings.push("AUDIT_SECRET_KEY (K_audit) está usando valor fallback de desarrollo");
  }

  return { ok: true, warnings };
}
