import { describe, expect, it, beforeEach } from "vitest";
import {
  generateCaptchaChallenge,
  verifyCaptchaSolution,
  resetCaptchaStore,
} from "./captcha";

describe("captcha.ts - Generación y Validación de Desafíos Interactivos (RT-07 / RQ-07)", () => {
  beforeEach(() => {
    resetCaptchaStore();
  });

  it("genera un desafío CAPTCHA firmado con una pregunta matemática válida", () => {
    const sessionId = "sess-student-1";
    const challenge = generateCaptchaChallenge(sessionId);

    expect(challenge.challengeId).toBeDefined();
    expect(challenge.challengeId.startsWith("cap_")).toBe(true);
    expect(challenge.token).toBeDefined();
    expect(challenge.expiresAt).toBeGreaterThan(Date.now());
    expect(challenge.question).toMatch(/¿Cuánto es \d+ \+ \d+\?/);
  });

  it("resuelve exitosamente el desafío al proveer la respuesta correcta", () => {
    const sessionId = "sess-student-2";
    const challenge = generateCaptchaChallenge(sessionId);

    const match = challenge.question.match(/¿Cuánto es (\d+) \+ (\d+)\?/);
    expect(Boolean(match)).toBe(true);
    const expectedSum = String(parseInt(match![1], 10) + parseInt(match![2], 10));

    const ok = verifyCaptchaSolution(sessionId, challenge.challengeId, expectedSum, challenge.token);
    expect(ok).toBe(true);

    // Un segundo intento con el mismo desafío debe fallar (consumo atómico / anti-replay)
    const secondTry = verifyCaptchaSolution(sessionId, challenge.challengeId, expectedSum, challenge.token);
    expect(secondTry).toBe(false);
  });

  it("rechaza soluciones erróneas o pertenecientes a otra sesión", () => {
    const sessionId = "sess-legitimate";
    const attackerSession = "sess-attacker";
    const challenge = generateCaptchaChallenge(sessionId);

    const match = challenge.question.match(/¿Cuánto es (\d+) \+ (\d+)\?/);
    const expectedSum = String(parseInt(match![1], 10) + parseInt(match![2], 10));

    // Respuesta errónea
    expect(verifyCaptchaSolution(sessionId, challenge.challengeId, "99999", challenge.token)).toBe(false);

    // Respuesta correcta pero presentada por otra sesión (anti-cross-session)
    expect(verifyCaptchaSolution(attackerSession, challenge.challengeId, expectedSum, challenge.token)).toBe(false);
  });
});
