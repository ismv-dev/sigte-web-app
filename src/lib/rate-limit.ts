/**
 * Motor de Limitación de Tasa y Mitigación Interactiva por Sesión (RT-07 / RQ-01 / RQ-07).
 *
 * El control se aplica EXCLUSIVAMENTE sobre el identificador de sesión de usuario (sessionId),
 * previniendo el bloqueo indiscriminado sobre direcciones IP compartidas por la infraestructura
 * de red universitaria (NAT/proxy institucional).
 *
 * En lugar de aplicar un bloqueo HTTP 429 estricto ante fallos repetidos, el sistema despliega
 * y exige la resolución de un desafío automatizado tipo CAPTCHA tras registrar 2 intentos fallidos
 * consecutivos en la sesión evaluada.
 */

import {
  generateCaptchaChallenge,
  verifyCaptchaSolution,
  resetCaptchaStore,
  type CaptchaChallenge,
} from "./captcha";

interface RateLimitRecord {
  timestamps: number[];
}

interface SessionFailureRecord {
  count: number;
  lastFailure: number;
  captchaRequired: boolean;
}

export type RateLimitTier = "AUTH" | "QR" | "PERIMETER" | "DEFAULT";

export interface RateLimitPolicy {
  limit: number;      // Máximo de peticiones permitidas en la ventana
  windowMs: number;   // Tamaño de la ventana temporal en ms
}

export const RATE_LIMIT_POLICIES: Record<RateLimitTier, RateLimitPolicy> = {
  // Autenticación por sesión: 5 peticiones por minuto
  AUTH: { limit: 5, windowMs: 60_000 },
  // Generación de credenciales QR por sesión: 10 peticiones por minuto
  QR: { limit: 10, windowMs: 60_000 },
  // Verificación perimetral en portería por sesión de caseta: 60 peticiones por minuto
  PERIMETER: { limit: 60, windowMs: 60_000 },
  // Endpoints estándar de API por sesión: 120 peticiones por minuto
  DEFAULT: { limit: 120, windowMs: 60_000 },
};

// Umbral de intentos fallidos antes de exigir resolución de CAPTCHA interactivo (RT-07)
export const CONSECUTIVE_FAILURES_BEFORE_CAPTCHA = 2;

// Almacenamiento volátil de ventanas por sesión
const rateStore = new Map<string, RateLimitRecord>();

// Almacenamiento de fallos consecutivos por sesión
const sessionFailuresStore = new Map<string, SessionFailureRecord>();

const CLEANUP_INTERVAL_MS = 5 * 60_000;
let lastCleanup = Date.now();

function purgeExpiredRecords(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of rateStore.entries()) {
    const latest = record.timestamps[record.timestamps.length - 1];
    if (!latest || now - latest > 10 * 60_000) {
      rateStore.delete(key);
    }
  }

  for (const [sessionId, failure] of sessionFailuresStore.entries()) {
    // Si la sesión no ha tenido actividad en más de 15 minutos, expirar fallos
    if (now - failure.lastFailure > 15 * 60_000) {
      sessionFailuresStore.delete(sessionId);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  captchaRequired?: boolean;
}

/**
 * Registra un intento fallido para la sesión específica (p. ej. error de credenciales,
 * firma inválida o token duplicado). Si se alcanzan 2 fallos consecutivos, activa
 * la exigencia obligatoria de CAPTCHA para dicha sesión.
 */
export function recordSessionFailure(sessionId: string): {
  attempts: number;
  captchaRequired: boolean;
} {
  const now = Date.now();
  purgeExpiredRecords(now);

  let failure = sessionFailuresStore.get(sessionId);
  if (!failure) {
    failure = { count: 0, lastFailure: now, captchaRequired: false };
    sessionFailuresStore.set(sessionId, failure);
  }

  failure.count += 1;
  failure.lastFailure = now;

  if (failure.count >= CONSECUTIVE_FAILURES_BEFORE_CAPTCHA) {
    failure.captchaRequired = true;
  }

  return {
    attempts: failure.count,
    captchaRequired: failure.captchaRequired,
  };
}

/**
 * Retorna true si la sesión específica tiene activada la exigencia de CAPTCHA
 * tras acumular 2 o más intentos fallidos consecutivos.
 */
export function isCaptchaRequired(sessionId: string): boolean {
  const failure = sessionFailuresStore.get(sessionId);
  return Boolean(failure && failure.captchaRequired);
}

/**
 * Restablece los contadores de fallos de la sesión tras un evento exitoso
 * o resolución correcta de CAPTCHA.
 */
export function resetSessionFailures(sessionId: string) {
  sessionFailuresStore.delete(sessionId);
}

/**
 * Valida y consume la respuesta de CAPTCHA para una sesión específica.
 * Si es válida, restablece el estado de fallos de la sesión permitiendo
 * continuar la operación.
 */
export function verifyAndConsumeCaptcha(
  sessionId: string,
  challengeId: string,
  answer: string,
  token?: string | null
): boolean {
  const ok = verifyCaptchaSolution(sessionId, challengeId, answer, token);
  if (ok) {
    resetSessionFailures(sessionId);
    return true;
  }
  return false;
}

/**
 * Emite un nuevo desafío de CAPTCHA interactivo para la sesión.
 */
export function createSessionCaptcha(sessionId: string): CaptchaChallenge {
  return generateCaptchaChallenge(sessionId);
}

/**
 * Evalúa y consume una cuota de solicitud para un identificador de SESIÓN (sessionId).
 * NO se discrimina por IP para evitar afección sobre usuarios en la red universitaria compartida.
 */
export function checkRateLimit(
  sessionId: string,
  tier: RateLimitTier = "DEFAULT"
): RateLimitResult {
  const now = Date.now();
  purgeExpiredRecords(now);

  const policy = RATE_LIMIT_POLICIES[tier];

  // Si la sesión específica requiere CAPTCHA por 2 fallos consecutivos, interceptar
  if (isCaptchaRequired(sessionId)) {
    return {
      allowed: false,
      limit: policy.limit,
      remaining: 0,
      resetSeconds: 0,
      captchaRequired: true,
    };
  }

  const windowStart = now - policy.windowMs;
  const key = `${tier}:${sessionId}`;

  let record = rateStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateStore.set(key, record);
  }

  // Filtrar marcas temporales en ventana
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= policy.limit) {
    const oldestTimestamp = record.timestamps[0];
    const resetSeconds = Math.max(
      1,
      Math.ceil((oldestTimestamp + policy.windowMs - now) / 1000)
    );

    return {
      allowed: false,
      limit: policy.limit,
      remaining: 0,
      resetSeconds,
      captchaRequired: false,
    };
  }

  record.timestamps.push(now);

  return {
    allowed: true,
    limit: policy.limit,
    remaining: policy.limit - record.timestamps.length,
    resetSeconds: Math.ceil(policy.windowMs / 1000),
    captchaRequired: false,
  };
}

/**
 * Resetea todos los almacenes de tasa, fallos y desafíos (para pruebas unitarias).
 */
export function resetRateLimitStore() {
  rateStore.clear();
  sessionFailuresStore.clear();
  resetCaptchaStore();
}
