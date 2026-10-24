import { describe, expect, it, vi, afterEach } from "vitest";
import {
  requireSecret,
  getJwtSecret,
  getQrSecret,
  getPlateEncryptionKey,
  getBlindIndexSalt,
  getAuditSecretKey,
  getLprApiKey,
  validateSecurityConfig,
} from "./env";

describe("requireSecret", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("devuelve el valor si la variable está seteada", () => {
    vi.stubEnv("MY_SECRET", "valor-real");
    expect(requireSecret("MY_SECRET", "fallback")).toBe("valor-real");
  });

  it("en desarrollo, devuelve el fallback si falta", () => {
    vi.stubEnv("MY_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(requireSecret("MY_SECRET", "fallback")).toBe("fallback");
  });

  it("en producción, revienta si falta (no usa el fallback)", () => {
    vi.stubEnv("MY_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => requireSecret("MY_SECRET", "fallback")).toThrow(/MY_SECRET/);
  });

  it("en producción, funciona normal si la variable está seteada", () => {
    vi.stubEnv("MY_SECRET", "valor-real");
    vi.stubEnv("NODE_ENV", "production");
    expect(requireSecret("MY_SECRET", "fallback")).toBe("valor-real");
  });
});

describe("Security Secrets Getters", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("retorna las claves por defecto en desarrollo", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getJwtSecret().length).toBeGreaterThanOrEqual(32);
    expect(getQrSecret().length).toBeGreaterThanOrEqual(32);
    expect(getPlateEncryptionKey()).toHaveLength(32);
    expect(getBlindIndexSalt().length).toBeGreaterThanOrEqual(16);
    expect(getAuditSecretKey().length).toBeGreaterThanOrEqual(32);
    expect(getLprApiKey().length).toBeGreaterThanOrEqual(16);
  });

  it("deriva exactamente 32 bytes para la clave de cifrado de patentes", () => {
    vi.stubEnv("PLATE_ENCRYPTION_KEY", "custom-secret-key-for-encryption-test");
    const key = getPlateEncryptionKey();
    expect(key).toHaveLength(32);
  });

  it("valida la configuración de seguridad", () => {
    vi.stubEnv("NODE_ENV", "development");
    const result = validateSecurityConfig();
    expect(result.ok).toBe(true);
  });
});
