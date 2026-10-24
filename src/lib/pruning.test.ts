import { describe, expect, it } from "vitest";
import { executeDataPruning } from "./pruning";

describe("pruning.ts - Gobernanza del Ciclo de Vida y Data Pruning (RT-05 / RQ-10)", () => {
  it("calcula correctamente la fecha de corte para 3 años de retención", async () => {
    // Mock de prisma client
    const mockPrisma = {
      usedNonce: {
        count: async () => 15,
        deleteMany: async () => ({ count: 15 }),
      },
      accessLog: {
        count: async () => 42,
        deleteMany: async () => ({ count: 42 }),
      },
      passwordResetToken: {
        count: async () => 3,
        deleteMany: async () => ({ count: 3 }),
      },
      securityAuditLog: {
        findFirst: async () => null,
        create: async () => ({}),
      },
    } as never;

    const summary = await executeDataPruning(mockPrisma, {
      dryRun: true,
      retentionYears: 3,
    });

    expect(summary.dryRun).toBe(true);
    expect(summary.status).toBe("DRY_RUN");
    expect(summary.noncesPurged).toBe(15);
    expect(summary.accessLogsPurged).toBe(42);
    expect(summary.resetTokensPurged).toBe(3);

    const cutoff = new Date(summary.cutoffDate);
    const now = new Date();
    // Debe ser aproximadamente 3 años en el pasado
    const yearDiff = now.getFullYear() - cutoff.getFullYear();
    expect(yearDiff).toBe(3);
  });

  it("ejecuta purga real eliminando registros y computando tiempo de ejecución", async () => {
    const mockPrisma = {
      usedNonce: {
        count: async () => 0,
        deleteMany: async () => ({ count: 8 }),
      },
      accessLog: {
        count: async () => 0,
        deleteMany: async () => ({ count: 100 }),
      },
      passwordResetToken: {
        count: async () => 0,
        deleteMany: async () => ({ count: 2 }),
      },
      securityAuditLog: {
        findFirst: async () => null,
        create: async () => ({}),
      },
    } as never;

    const summary = await executeDataPruning(mockPrisma, {
      dryRun: false,
      retentionYears: 3,
      actorId: "admin-uuid-1",
    });

    expect(summary.dryRun).toBe(false);
    expect(summary.status).toBe("OK");
    expect(summary.noncesPurged).toBe(8);
    expect(summary.accessLogsPurged).toBe(100);
    expect(summary.resetTokensPurged).toBe(2);
    expect(summary.executionTimeMs).toBeGreaterThanOrEqual(0);
  });
});
