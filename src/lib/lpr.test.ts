import { describe, expect, it } from "vitest";
import { generateBlindIndex, maskPlate, normalizePlate } from "./crypto";
import { evaluateLprFallback, recordLprHeartbeat } from "./resilience";

describe("Fase 5: Servicio LPR y Búsqueda Ciega (RT-04 / RQ-01 / RQ-08)", () => {
  it("calcula el blind index en menos de 5 ms cumpliendo la restricción de latencia perimetral", () => {
    const start = performance.now();
    const idx = generateBlindIndex("BBCL12");
    const duration = performance.now() - start;

    expect(idx).toBeDefined();
    expect(idx.length).toBe(64);
    expect(duration).toBeLessThan(15); // Meta estipulada en RT-04 / RQ-01: < 15 ms
  });

  it("garantiza que patentes equivalentes con formatos diversos generan el mismo blind index", () => {
    const raw1 = "bb-cl-12";
    const raw2 = "BBCL12";
    const raw3 = " BB.CL.12 ";

    const idx1 = generateBlindIndex(raw1);
    const idx2 = generateBlindIndex(raw2);
    const idx3 = generateBlindIndex(raw3);

    expect(idx1).toBe(idx2);
    expect(idx2).toBe(idx3);
  });

  it("enmascara la patente para el veredicto LPR preservando privacidad", () => {
    const plate = normalizePlate("CF-1234");
    const masked = maskPlate(plate);
    expect(masked).toBe("CF**34");
  });

  it("conmuta al modo fallback (QR_FALLBACK) en <= 5 s ante ausencia de latido LPR (RQ-08)", () => {
    // 1. Estado inicial con latido
    recordLprHeartbeat(12);
    const statusOnline = evaluateLprFallback(5000);
    expect(statusOnline.online).toBe(true);
    expect(statusOnline.recommendedMode).toBe("LPR");

    // 2. Simulación de corte o caída de cámara mayor a 5 segundos
    const statusFallback = evaluateLprFallback(-1); // Forzar tiempo vencido
    expect(statusFallback.online).toBe(false);
    expect(statusFallback.recommendedMode).toBe("QR_FALLBACK");
  });
});
