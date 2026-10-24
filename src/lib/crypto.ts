import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import { getPlateEncryptionKey, getBlindIndexSalt } from "./env";
import {
  normalizePlate,
  maskPlate,
  maskName,
  maskRut,
  maskPhone,
  maskEmail,
  pseudonymizeUserData,
  type PseudonymizedUserOutput,
} from "./masking";

export {
  normalizePlate,
  maskPlate,
  maskName,
  maskRut,
  maskPhone,
  maskEmail,
  pseudonymizeUserData,
  type PseudonymizedUserOutput,
};

/**
 * Cifra una matrícula vehicular usando AES-256-GCM (RT-04).
 * Genera un vector de inicialización (IV) criptográficamente seguro de 12 bytes por registro.
 * Retorna el ciphertext, iv y authentication tag en formato hexadecimal.
 */
export function encryptPlate(plate: string): {
  cipher: string;
  iv: string;
  tag: string;
} {
  return encryptSensitiveData(normalizePlate(plate));
}

/**
 * Descifra una matrícula vehicular protegida con AES-256-GCM.
 * Valida la autenticidad del registro contra el tag; si los datos sufrieron
 * alteración física o manipulación en reposo (Tampering), la función falla.
 */
export function decryptPlate(cipherHex: string, ivHex: string, tagHex: string): string {
  return decryptSensitiveData(cipherHex, ivHex, tagHex);
}

/**
 * Cifra datos personales o sensibles en reposo mediante AES-256-GCM (RT-04 / RQ-10).
 * Genera un IV de 12 bytes criptográficamente seguro para cada registro.
 */
export function encryptSensitiveData(plaintext: string): {
  cipher: string;
  iv: string;
  tag: string;
} {
  const key = getPlateEncryptionKey();
  const iv = randomBytes(12);

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  return {
    cipher: encrypted,
    iv: iv.toString("hex"),
    tag,
  };
}

/**
 * Descifra datos personales o sensibles protegidos con AES-256-GCM.
 * Valida de forma estricta el tag de autenticación.
 */
export function decryptSensitiveData(cipherHex: string, ivHex: string, tagHex: string): string {
  const key = getPlateEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(cipherHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Genera un índice ciego determinista (Blind Index) para la patente vehicular (RT-04).
 * Emplea HMAC-SHA256 con una sal secreta institucional fija.
 * Permite realizar búsquedas exactas O(1) desde el módulo LPR en base de datos
 * sin descifrar masivamente los datos en memoria ni exponer la patente en texto claro.
 */
export function generateBlindIndex(plate: string): string {
  const normalized = normalizePlate(plate);
  const salt = getBlindIndexSalt();
  return createHmac("sha256", salt)
    .update(`sigte:plate:blind:${normalized}`)
    .digest("hex");
}

/**
 * Genera un índice ciego determinista para identificadores personales civiles (RUT o credencial)
 * permitiendo búsquedas exactas sin almacenar el dato civil en texto claro (RT-04 / RQ-10).
 */
export function pseudonymizePersonalIdentifier(identifier: string): string {
  const salt = getBlindIndexSalt();
  const clean = identifier.trim().toLowerCase().replace(/[\s.-]/g, "");
  return createHmac("sha256", salt)
    .update(`sigte:personal:blind:${clean}`)
    .digest("hex");
}

/**
 * Genera un hash seudonimizado irreversible para registrar la identidad
 * del operador o actor en las bitácoras de seguridad sin almacenar su ID directo (RT-04 / RQ-07).
 */
export function pseudonymizeActor(actorId?: string | null): string {
  if (!actorId) return "SYSTEM_ANONYMOUS";
  const salt = getBlindIndexSalt();
  return createHmac("sha256", salt)
    .update(`actor:${actorId}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Genera un hash seudonimizado de la sesión para el registro de eventos forenses (RQ-07)
 * sin exponer el token ni el ID de sesión en texto plano en la base de datos.
 */
export function pseudonymizeSessionId(sessionId?: string | null): string {
  if (!sessionId) return "SESSION_UNKNOWN";
  const salt = getBlindIndexSalt();
  return createHmac("sha256", salt)
    .update(`session:${sessionId}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Compara dos hashes o firmas en tiempo constante para evitar ataques de temporización.
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return timingSafeEqual(bufA, bufB);
}
