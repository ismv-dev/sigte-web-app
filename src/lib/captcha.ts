import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getJwtSecret } from "./env";

export interface CaptchaChallenge {
  challengeId: string;
  question: string;
  token: string;
  expiresAt: number;
}

interface StoredChallenge {
  sessionId: string;
  answer: string;
  expiresAt: number;
  used: boolean;
}

const challengeStore = new Map<string, StoredChallenge>();
const consumedChallenges = new Set<string>();

// Limpieza periódica de desafíos caducados
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function purgeExpiredChallenges(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [id, challenge] of challengeStore.entries()) {
    if (challenge.used || now > challenge.expiresAt) {
      challengeStore.delete(id);
    }
  }

  if (consumedChallenges.size > 10_000) {
    consumedChallenges.clear();
  }
}

/**
 * Genera un desafío CAPTCHA matemático interactivo para mitigar abusos
 * tras registrar intentos fallidos consecutivos en una sesión (RT-07 / RQ-07).
 */
export function generateCaptchaChallenge(sessionId: string): CaptchaChallenge {
  const now = Date.now();
  purgeExpiredChallenges(now);

  const a = Math.floor(Math.random() * 9) + 1; // 1 - 9
  const b = Math.floor(Math.random() * 9) + 1; // 1 - 9
  const expectedAnswer = String(a + b);
  const question = `¿Cuánto es ${a} + ${b}?`;

  const challengeId = `cap_${randomBytes(8).toString("hex")}`;
  const expiresAt = now + 5 * 60_000; // 5 minutos de vigencia

  // Guardar en almacenamiento volátil
  challengeStore.set(challengeId, {
    sessionId,
    answer: expectedAnswer,
    expiresAt,
    used: false,
  });

  // Generar firma criptográfica para validación stateless si se requiere
  const secret = getJwtSecret();
  const signature = createHmac("sha256", secret)
    .update(`${challengeId}:${expectedAnswer}:${sessionId}:${expiresAt}`)
    .digest("hex");

  const token = Buffer.from(
    JSON.stringify({ challengeId, sessionId, expiresAt, signature })
  ).toString("base64url");

  return {
    challengeId,
    question,
    token,
    expiresAt,
  };
}

/**
 * Verifica la solución presentada por el usuario para una sesión específica.
 * Consume el desafío de forma atómica para prevenir ataques de repetición.
 */
export function verifyCaptchaSolution(
  sessionId: string,
  challengeId: string,
  answer: string,
  token?: string | null
): boolean {
  const now = Date.now();
  purgeExpiredChallenges(now);

  const cleanAnswer = String(answer || "").trim();
  if (!cleanAnswer) return false;

  // Si el desafío ya fue consumido (prevención de repetición / anti-replay)
  if (consumedChallenges.has(challengeId)) {
    return false;
  }

  // 1. Verificación contra almacenamiento en memoria
  const stored = challengeStore.get(challengeId);
  if (stored) {
    if (stored.used) return false;
    if (now > stored.expiresAt) {
      challengeStore.delete(challengeId);
      return false;
    }
    // La sesión debe coincidir exactamente
    if (stored.sessionId !== sessionId) return false;

    const matches = stored.answer === cleanAnswer;
    if (matches) {
      stored.used = true;
      consumedChallenges.add(challengeId);
      challengeStore.delete(challengeId);
      return true;
    }
    return false;
  }

  // 2. Verificación criptográfica con token firmado (stateless fallback)
  if (token) {
    try {
      const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
      if (
        decoded.challengeId !== challengeId ||
        decoded.sessionId !== sessionId ||
        now > decoded.expiresAt
      ) {
        return false;
      }

      const secret = getJwtSecret();
      const expectedSig = createHmac("sha256", secret)
        .update(`${decoded.challengeId}:${cleanAnswer}:${sessionId}:${decoded.expiresAt}`)
        .digest("hex");

      const bufA = Buffer.from(expectedSig);
      const bufB = Buffer.from(decoded.signature);
      if (bufA.length === bufB.length && timingSafeEqual(bufA, bufB)) {
        consumedChallenges.add(challengeId);
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Resetea el almacenamiento de desafíos (exclusivo para tests unitarios).
 */
export function resetCaptchaStore() {
  challengeStore.clear();
  consumedChallenges.clear();
}
