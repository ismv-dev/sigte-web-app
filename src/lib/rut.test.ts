import { describe, expect, it } from "vitest";
import { cleanRut, formatRut, isValidRut } from "./rut";

describe("isValidRut", () => {
  it("acepta un RUT válido con dígito verificador numérico", () => {
    expect(isValidRut("12345678-5")).toBe(true);
  });

  it("acepta un RUT válido con dígito verificador K", () => {
    expect(isValidRut("8888888-K")).toBe(true);
  });

  it("rechaza un RUT con dígito verificador incorrecto", () => {
    expect(isValidRut("12345678-4")).toBe(false);
  });

  it("rechaza un cuerpo demasiado corto", () => {
    expect(isValidRut("123-4")).toBe(false);
  });

  it("rechaza caracteres no numéricos en el cuerpo", () => {
    expect(isValidRut("1234abc8-5")).toBe(false);
  });
});

describe("cleanRut", () => {
  it("elimina puntos y guion, y pone el DV en mayúscula", () => {
    expect(cleanRut("8.888.888-k")).toBe("8888888K");
  });
});

describe("formatRut", () => {
  it("formatea un RUT de 8 dígitos con puntos y guion", () => {
    expect(formatRut("123456785")).toBe("12.345.678-5");
  });

  it("formatea un RUT de 7 dígitos con DV K", () => {
    expect(formatRut("8888888K")).toBe("8.888.888-K");
  });
});
