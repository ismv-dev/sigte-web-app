import { describe, expect, it, beforeEach } from "vitest";
import {
  checkRateLimit,
  recordSessionFailure,
  isCaptchaRequired,
  resetSessionFailures,
  verifyAndConsumeCaptcha,
  createSessionCaptcha,
  resetRateLimitStore,
} from "./rate-limit";

describe("rate-limit.ts - Limitación de Tasa por Sesión y Mitigación Interactiva CAPTCHA (RT-07 / RQ-01 / RQ-07)", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("permite peticiones normales dentro de la cuota por sesión (sessionId)", () => {
    const sessionId = "session-conductor-42";
    const res1 = checkRateLimit(sessionId, "DEFAULT");
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(119);

    const res2 = checkRateLimit(sessionId, "DEFAULT");
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(118);
  });

  it("exige resolución de CAPTCHA tras 2 intentos fallidos consecutivos en la sesión específica", () => {
    const sessionId = "session-bruteforce-test";

    // 1er intento fallido: aún no exige CAPTCHA
    const firstFail = recordSessionFailure(sessionId);
    expect(firstFail.attempts).toBe(1);
    expect(firstFail.captchaRequired).toBe(false);
    expect(isCaptchaRequired(sessionId)).toBe(false);

    // 2do intento fallido consecutivo: activa inmediatamente la exigencia de CAPTCHA
    const secondFail = recordSessionFailure(sessionId);
    expect(secondFail.attempts).toBe(2);
    expect(secondFail.captchaRequired).toBe(true);
    expect(isCaptchaRequired(sessionId)).toBe(true);

    // Al consultar la tasa, la sesión queda interceptada requiriendo CAPTCHA
    const rateRes = checkRateLimit(sessionId, "AUTH");
    expect(rateRes.allowed).toBe(false);
    expect(rateRes.captchaRequired).toBe(true);
  });

  it("garantiza que dos sesiones distintas bajo la misma IP universitaria compartida no se interfieren", () => {
    // Escenario de red universitaria: IP pública/NAT institucional idéntica
    const sessionAttacker = "session-attacker-usm";
    const sessionLegit = "session-student-legit";

    // La sesión atacante registra 2 fallos consecutivos
    recordSessionFailure(sessionAttacker);
    recordSessionFailure(sessionAttacker);

    // La sesión atacante queda bloqueada requiriendo CAPTCHA
    expect(isCaptchaRequired(sessionAttacker)).toBe(true);
    const attackerRes = checkRateLimit(sessionAttacker, "AUTH");
    expect(attackerRes.allowed).toBe(false);
    expect(attackerRes.captchaRequired).toBe(true);

    // La sesión legítima originada desde la MISMA red institucional opera con normalidad
    expect(isCaptchaRequired(sessionLegit)).toBe(false);
    const legitRes = checkRateLimit(sessionLegit, "AUTH");
    expect(legitRes.allowed).toBe(true);
    expect(legitRes.remaining).toBe(4); // Cuota AUTH de 5 req/min
  });

  it("desbloquea la sesión y restablece el contador de fallos al resolver correctamente el CAPTCHA", () => {
    const sessionId = "session-recovery-flow";

    // Provocar 2 fallos
    recordSessionFailure(sessionId);
    recordSessionFailure(sessionId);
    expect(isCaptchaRequired(sessionId)).toBe(true);

    // Generar desafío CAPTCHA para la sesión
    const challenge = createSessionCaptcha(sessionId);
    expect(challenge.challengeId).toBeDefined();
    expect(challenge.question).toContain("¿Cuánto es");

    // Extraer la respuesta matemática esperada de la pregunta "¿Cuánto es X + Y?"
    const match = challenge.question.match(/¿Cuánto es (\d+) \+ (\d+)\?/);
    expect(Boolean(match)).toBe(true);
    const sum = String(parseInt(match![1], 10) + parseInt(match![2], 10));

    // Intento con respuesta errónea: debe fallar y mantener el bloqueo de CAPTCHA
    const wrongAttempt = verifyAndConsumeCaptcha(sessionId, challenge.challengeId, "9999");
    expect(wrongAttempt).toBe(false);
    expect(isCaptchaRequired(sessionId)).toBe(true);

    // Intento con respuesta correcta: desbloquea la sesión
    const correctAttempt = verifyAndConsumeCaptcha(
      sessionId,
      challenge.challengeId,
      sum,
      challenge.token
    );
    expect(correctAttempt).toBe(true);
    expect(isCaptchaRequired(sessionId)).toBe(false);

    // Ahora la sesión puede continuar operando con normalidad
    const rateAfterCaptcha = checkRateLimit(sessionId, "AUTH");
    expect(rateAfterCaptcha.allowed).toBe(true);
  });

  it("aplica la cuota de generación QR por sesión (10 req/min)", () => {
    const sessionId = "session-driver-qr-generation";

    for (let i = 0; i < 10; i++) {
      const res = checkRateLimit(sessionId, "QR");
      expect(res.allowed).toBe(true);
    }

    const blocked = checkRateLimit(sessionId, "QR");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});
