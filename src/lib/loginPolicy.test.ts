import { describe, expect, it } from "vitest";
import { MAX_ATTEMPTS, isLocked, minutesRemaining, shouldLock } from "./loginPolicy";

describe("shouldLock", () => {
  it("no bloquea antes del máximo de intentos", () => {
    expect(shouldLock(MAX_ATTEMPTS - 1)).toBe(false);
  });

  it("bloquea al llegar al máximo de intentos", () => {
    expect(shouldLock(MAX_ATTEMPTS)).toBe(true);
  });
});

describe("isLocked", () => {
  it("no está bloqueado si lockedUntil es null", () => {
    expect(isLocked(null, Date.now())).toBe(false);
  });

  it("está bloqueado si lockedUntil es futuro", () => {
    const now = Date.now();
    expect(isLocked(new Date(now + 60_000), now)).toBe(true);
  });

  it("no está bloqueado si lockedUntil ya pasó", () => {
    const now = Date.now();
    expect(isLocked(new Date(now - 1000), now)).toBe(false);
  });
});

describe("minutesRemaining", () => {
  it("redondea hacia arriba y nunca devuelve menos de 1", () => {
    const now = Date.now();
    expect(minutesRemaining(new Date(now + 30_000), now)).toBe(1);
    expect(minutesRemaining(new Date(now + 61_000), now)).toBe(2);
  });
});
