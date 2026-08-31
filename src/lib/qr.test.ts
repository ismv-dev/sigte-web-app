import { describe, expect, it } from "vitest";
import { signQrToken, verifyQrToken, QR_TTL_MS } from "./qr";

describe("signQrToken / verifyQrToken", () => {
  it("valida un token recién emitido", () => {
    const issuedAt = Date.now();
    const token = signQrToken("vehicle-1", issuedAt);
    const result = verifyQrToken(token);
    expect(result).toEqual({ ok: true, vehicleId: "vehicle-1", issuedAt });
  });

  it("rechaza un token expirado", () => {
    const issuedAt = Date.now() - QR_TTL_MS - 1000;
    const token = signQrToken("vehicle-1", issuedAt);
    const result = verifyQrToken(token);
    expect(result).toEqual({ ok: false, error: "expirado" });
  });

  it("rechaza un token con firma manipulada", () => {
    const token = signQrToken("vehicle-1", Date.now());
    const lastChar = token.slice(-1);
    const flipped = lastChar === "f" ? "0" : "f";
    const tampered = token.slice(0, -1) + flipped;
    const result = verifyQrToken(tampered);
    expect(result).toEqual({ ok: false, error: "invalido" });
  });

  it("rechaza un formato corrupto", () => {
    expect(verifyQrToken("no-es-un-token")).toEqual({ ok: false, error: "invalido" });
  });
});
