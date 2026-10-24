import { describe, expect, it } from "vitest";
import {
  normalizePlate,
  encryptPlate,
  decryptPlate,
  generateBlindIndex,
  maskPlate,
  pseudonymizeActor,
  pseudonymizeSessionId,
  pseudonymizePersonalIdentifier,
  encryptSensitiveData,
  decryptSensitiveData,
  safeCompare,
} from "./crypto";

describe("crypto.ts - Controles Criptográficos de Reposo, Seudonimización y Búsqueda Ciega (RT-04 / RQ-10)", () => {
  it("normaliza patentes a mayúsculas y sin caracteres especiales", () => {
    expect(normalizePlate("bb-cl-12")).toBe("BBCL12");
    expect(normalizePlate("cd 12 34")).toBe("CD1234");
    expect(normalizePlate(" ab.34 ")).toBe("AB34");
  });

  it("cifra y descifra correctamente con AES-256-GCM (round-trip)", () => {
    const rawPlate = "BBCL12";
    const encrypted = encryptPlate(rawPlate);

    expect(encrypted.cipher).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.tag).toBeDefined();
    expect(encrypted.cipher).not.toBe(rawPlate);

    const decrypted = decryptPlate(encrypted.cipher, encrypted.iv, encrypted.tag);
    expect(decrypted).toBe(rawPlate);
  });

  it("genera IVs aleatorios y únicos para cada cifrado de la misma patente", () => {
    const rawPlate = "BBCL12";
    const enc1 = encryptPlate(rawPlate);
    const enc2 = encryptPlate(rawPlate);

    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.cipher).not.toBe(enc2.cipher);
  });

  it("falla al intentar descifrar con tag o cipher alterado (detección de manipulación)", () => {
    const rawPlate = "BBCL12";
    const enc = encryptPlate(rawPlate);

    // Alteración deliberada de un bit en el ciphertext
    const tamperedCipher = enc.cipher.slice(0, -2) + (enc.cipher.slice(-2) === "00" ? "01" : "00");

    expect(() => decryptPlate(tamperedCipher, enc.iv, enc.tag)).toThrow();
  });

  it("produce un índice ciego determinista e indexable (Blind Index)", () => {
    const idx1 = generateBlindIndex("bb-cl-12");
    const idx2 = generateBlindIndex("BBCL12");
    const idxOther = generateBlindIndex("CD1234");

    expect(idx1).toBe(idx2);
    expect(idx1).not.toBe(idxOther);
    expect(idx1.length).toBe(64); // SHA-256 hex length
  });

  it("enmascara placas patentes adecuadamente para interfaces de guardia (RT-03)", () => {
    expect(maskPlate("BBCL12")).toBe("BB**12");
    expect(maskPlate("ABCD99")).toBe("AB**99");
    expect(maskPlate("AB12")).toBe("A**2");
  });

  it("seudonimiza el ID del actor para auditoría sin revelar la clave original (RT-04 / RQ-07)", () => {
    const pseudo1 = pseudonymizeActor("user-uuid-1234");
    const pseudo2 = pseudonymizeActor("user-uuid-1234");
    const pseudoOther = pseudonymizeActor("user-uuid-5678");

    expect(pseudo1).toBe(pseudo2);
    expect(pseudo1).not.toBe(pseudoOther);
    expect(pseudo1).not.toContain("user-uuid-1234");
  });

  it("seudonimiza el ID de sesión para registro seguro de eventos forenses (RQ-07)", () => {
    const s1 = pseudonymizeSessionId("session-token-secret-alpha");
    const s2 = pseudonymizeSessionId("session-token-secret-alpha");
    const sOther = pseudonymizeSessionId("session-token-secret-beta");

    expect(s1).toBe(s2);
    expect(s1).not.toBe(sOther);
    expect(s1).not.toContain("session-token-secret");
    expect(s1.length).toBe(16);
  });

  it("genera índices ciegos deterministas para identificadores civiles (RUT) sin exponer texto claro", () => {
    const rutBlind1 = pseudonymizePersonalIdentifier("12.345.678-9");
    const rutBlind2 = pseudonymizePersonalIdentifier("12345678-9");
    const rutBlindOther = pseudonymizePersonalIdentifier("19.876.543-2");

    expect(rutBlind1).toBe(rutBlind2); // normalizado sin puntos ni guiones
    expect(rutBlind1).not.toBe(rutBlindOther);
    expect(rutBlind1.length).toBe(64);
  });

  it("cifra y descifra atributos de datos personales sensibles con AES-256-GCM", () => {
    const sensitiveData = "19876543-2;+56998765432;docente@usm.cl";
    const enc = encryptSensitiveData(sensitiveData);

    expect(enc.cipher).not.toBe(sensitiveData);
    const decrypted = decryptSensitiveData(enc.cipher, enc.iv, enc.tag);
    expect(decrypted).toBe(sensitiveData);
  });

  it("compara hashes de forma constante y segura (safeCompare)", () => {
    expect(safeCompare("abcdef1234", "abcdef1234")).toBe(true);
    expect(safeCompare("abcdef1234", "abcdef1235")).toBe(false);
    expect(safeCompare("abcdef1234", "short")).toBe(false);
  });
});
