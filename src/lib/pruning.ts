import type { PrismaClient } from "@prisma/client";
import { appendAuditLog } from "./audit-chain";

export interface PruningOptions {
  dryRun?: boolean;
  retentionYears?: number; // Por defecto 3 años (Ley N° 21.719 / RQ-10)
  actorId?: string;
}

export interface PruningSummary {
  dryRun: boolean;
  cutoffDate: string;
  noncesPurged: number;
  accessLogsPurged: number;
  resetTokensPurged: number;
  executionTimeMs: number;
  status: "OK" | "DRY_RUN";
}

/**
 * Procedimiento de gobernanza y depuración controlada de datos (RT-05 / RQ-10).
 *
 * Cumple con el principio de limitación del plazo de conservación consagrado en la Ley N° 21.719
 * (homologación RGPD en Chile) y los estándares de gestión de riesgo de la Ley N° 21.663.
 *
 * 1. Expurgación de nonces caducados (UsedNonce donde expiresAt < NOW()).
 * 2. Purga / anonimización irreversible de registros de tránsito antiguos (AccessLog >= 3 años).
 * 3. Limpieza de tokens de contraseña expirados.
 */
export async function executeDataPruning(
  prisma: PrismaClient,
  options: PruningOptions = {}
): Promise<PruningSummary> {
  const startTime = Date.now();
  const dryRun = !!options.dryRun;
  const retentionYears = options.retentionYears ?? 3;

  const now = new Date();
  const cutoffDate = new Date();
  cutoffDate.setFullYear(now.getFullYear() - retentionYears);

  // 1. Identificar / Purga de nonces caducados
  let noncesPurged = 0;
  if (dryRun) {
    noncesPurged = await prisma.usedNonce.count({
      where: { expiresAt: { lt: now } },
    });
  } else {
    const res = await prisma.usedNonce.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    noncesPurged = res.count;
  }

  // 2. Identificar / Purga de registros de acceso antiguos (>= retentionYears)
  let accessLogsPurged = 0;
  if (dryRun) {
    accessLogsPurged = await prisma.accessLog.count({
      where: { timestamp: { lt: cutoffDate } },
    });
  } else {
    const res = await prisma.accessLog.deleteMany({
      where: { timestamp: { lt: cutoffDate } },
    });
    accessLogsPurged = res.count;
  }

  // 3. Identificar / Purga de tokens de reseteo de contraseña vencidos
  let resetTokensPurged = 0;
  if (dryRun) {
    resetTokensPurged = await prisma.passwordResetToken.count({
      where: { expiresAt: { lt: now } },
    });
  } else {
    const res = await prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    resetTokensPurged = res.count;
  }

  const executionTimeMs = Date.now() - startTime;

  // 4. Registro auditable de la operación en la bitácora inmutable (RT-06)
  if (!dryRun) {
    try {
      await appendAuditLog(prisma, {
        action: "DATA_PRUNING_EXECUTED",
        payload: {
          cutoffDate: cutoffDate.toISOString(),
          retentionYears,
          noncesPurged,
          accessLogsPurged,
          resetTokensPurged,
          executionTimeMs,
        },
        actorId: options.actorId,
      });
    } catch {
      // Ignorar fallo de log secundario
    }
  }

  return {
    dryRun,
    cutoffDate: cutoffDate.toISOString(),
    noncesPurged,
    accessLogsPurged,
    resetTokensPurged,
    executionTimeMs,
    status: dryRun ? "DRY_RUN" : "OK",
  };
}
