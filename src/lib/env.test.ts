import { describe, expect, it, vi, afterEach } from "vitest";
import { requireSecret } from "./env";

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
