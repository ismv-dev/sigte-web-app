import { describe, expect, it } from "vitest";
import {
  signQrToken,
  signDynamicQr,
  verifyQrToken,
  QR_TTL_MS,
} from "./qr";

describe("qr.ts - Credenciales Dinámicas Anti-Replay (RT-01 / RQ-05)", () => {
  it("valida un token v1 recién emitido", () => {
    const issuedAt = Date.now();
    const token = signQrToken("vehicle-1", issuedAt);
    const result = verifyQrToken(token);
    expect(result).toEqual({ ok: true, vehicleId: "vehicle-1", issuedAt, version: "v1" });
  });

  it("rechaza un token v1 expirado", () => {
    const issuedAt = Date.now() - QR_TTL_MS - 1000;
    const token = signQrToken("vehicle-1", issuedAt);
    const result = verifyQrToken(token);
    expect(result).toEqual({ ok: false, error: "expirado" });
  });

  it("rechaza un token v1 con firma manipulada", () => {
    const token = signQrToken("vehicle-1", Date.now());
    const lastChar = token.slice(-1);
    const flipped = lastChar === "f" ? "0" : "f";
    const tampered = token.slice(0, -1) + flipped;
    const result = verifyQrToken(tampered);
    expect(result).toEqual({ ok: false, error: "invalido" });
  });

  it("genera y valida un token dinámico v2 con jti único", () => {
    const issuedAt = Date.now();
    const qrData = signDynamicQr("vehicle-uuid-1", "user-uuid-1", issuedAt);

    expect(qrData.token).toBeDefined();
    expect(qrData.jti).toBeDefined();
    expect(qrData.expiresAt).toBe(issuedAt + QR_TTL_MS);

    const verified = verifyQrToken(qrData.token);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.vehicleId).toBe("vehicle-uuid-1");
      expect(verified.userId).toBe("user-uuid-1");
      expect(verified.jti).toBe(qrData.jti);
      expect(verified.version).toBe("v2");
    }
  });

  it("genera jti aleatorios y distintos en llamadas sucesivas", () => {
    const qr1 = signDynamicQr("vehicle-1");
    const qr2 = signDynamicQr("vehicle-1");
    expect(qr1.jti).not.toBe(qr2.jti);
    expect(qr1.token).not.toBe(qr2.token);
  });

  it("rechaza un token v2 con firma HMAC adulterada", () => {
    const qrData = signDynamicQr("vehicle-1", "user-1");
    const parts = qrData.token.split(":");
    // Se altera el jti pero se mantiene la firma
    parts[4] = "adulterated-jti-nonce";
    const tamperedToken = parts.join(":");

    const result = verifyQrToken(tamperedToken);
    expect(result).toEqual({ ok: false, error: "invalido" });
  });

  it("rechaza formatos completamente corruptos o nulos", () => {
    expect(verifyQrToken("no-es-un-token")).toEqual({ ok: false, error: "invalido" });
    expect(verifyQrToken("")).toEqual({ ok: false, error: "invalido" });
  });
});
