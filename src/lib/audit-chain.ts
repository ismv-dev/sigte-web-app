import { createHmac } from "crypto";
import { getAuditSecretKey } from "./env";
import { pseudonymizeActor, safeCompare } from "./crypto";
import type { PrismaClient } from "@prisma/client";

/**
 * Hash génesis institucional inmutable para la cadena de auditoría (H_0).
 */
export const GENESIS_HASH = createHmac("sha256", "GENESIS_SEED_SIGTE_USM_2026")
  .update("GENESIS_SIGTE_USM_VINA_MAR_SECURITY_FRAMEWORK_2026")
  .digest("hex");

/**
 * Serializa de forma determinista y canónica cualquier objeto o payload de evento,
 * ordenando las claves alfabéticamente para evitar discrepancias por ordenación JSON.
 */
export function canonicalStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalStringify).join(",")}]`;
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map(
    (key) => `${JSON.stringify(key)}:${canonicalStringify((obj as Record<string, unknown>)[key])}`
  );
  return `{${pairs.join(",")}}`;
}

/**
 * Calcula el hash de sellado de un eslabón de la bitácora (RT-06 / RQ-04):
 *   H_n = HMAC-SHA256_{K_audit}( D_n || H_{n-1} )
 *
 * Donde:
 *   - K_audit es la clave institucional segregada fuera de la base de datos.
 *   - D_n es la serialización canónica de los datos del evento.
 *   - H_{n-1} es el resumen criptográfico del registro inmediatamente anterior.
 */
export function computeChainHash(
  previousHash: string,
  eventData: {
    sequenceNumber: number;
    action: string;
    actorHash: string;
    payload: Record<string, unknown>;
    timestamp: string | Date;
  }
): string {
  const secret = getAuditSecretKey();
  const timestampStr =
    eventData.timestamp instanceof Date
      ? eventData.timestamp.toISOString()
      : new Date(eventData.timestamp).toISOString();

  const canonicalPayload = canonicalStringify(eventData.payload);
  const dataBlock = `${eventData.sequenceNumber}|${eventData.action}|${eventData.actorHash}|${timestampStr}|${canonicalPayload}`;

  return createHmac("sha256", secret)
    .update(`${dataBlock}|${previousHash}`)
    .digest("hex");
}

export type AuditVerificationResult =
  | {
      valid: true;
      count: number;
      lastHash: string;
      message: "Cadena de auditoría 100% íntegra y verificada matemáticamente";
    }
  | {
      valid: false;
      count: number;
      brokenAtSequence: number;
      expectedHash: string;
      actualHash: string;
      reason: string;
    };

/**
 * Algoritmo verificador forense: recorre la bitácora desde el génesis hasta la cabeza,
 * recalculando cada eslabón matemático HMAC-SHA256.
 *
 * Si un atacante o usuario con rol administrador modificó, eliminó o insertó
 * una tupla histórica directamente en la base de datos, el algoritmo detecta
 * la rotura determinista con 100% de asertividad (RQ-04).
 */
export function verifyAuditChainRecords(
  records: Array<{
    sequenceNumber: number;
    previousHash: string;
    currentHash: string;
    eventPayload: string;
    actorHash: string;
    action: string;
    timestamp: Date | string;
  }>
): AuditVerificationResult {
  if (records.length === 0) {
    return {
      valid: true,
      count: 0,
      lastHash: GENESIS_HASH,
      message: "Cadena de auditoría 100% íntegra y verificada matemáticamente",
    };
  }

  let expectedPreviousHash = GENESIS_HASH;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // 1. Verificación de enlace con el eslabón anterior
    if (!safeCompare(record.previousHash, expectedPreviousHash)) {
      return {
        valid: false,
        count: records.length,
        brokenAtSequence: record.sequenceNumber,
        expectedHash: expectedPreviousHash,
        actualHash: record.previousHash,
        reason: `Discontinuidad en el eslabón previo en secuencia ${record.sequenceNumber}`,
      };
    }

    // 2. Parseo del payload canónico
    let parsedPayload: Record<string, unknown> = {};
    try {
      parsedPayload = JSON.parse(record.eventPayload);
    } catch {
      return {
        valid: false,
        count: records.length,
        brokenAtSequence: record.sequenceNumber,
        expectedHash: record.currentHash,
        actualHash: "INVALID_JSON_PAYLOAD",
        reason: `Carga JSON corrupta o alterada en secuencia ${record.sequenceNumber}`,
      };
    }

    // 3. Recálculo del hash del registro con K_audit
    const recomputedHash = computeChainHash(expectedPreviousHash, {
      sequenceNumber: record.sequenceNumber,
      action: record.action,
      actorHash: record.actorHash,
      payload: parsedPayload,
      timestamp: record.timestamp,
    });

    if (!safeCompare(record.currentHash, recomputedHash)) {
      return {
        valid: false,
        count: records.length,
        brokenAtSequence: record.sequenceNumber,
        expectedHash: recomputedHash,
        actualHash: record.currentHash,
        reason: `Firma HMAC adulterada o datos mutados (Tampering) en secuencia ${record.sequenceNumber}`,
      };
    }

    expectedPreviousHash = record.currentHash;
  }

  return {
    valid: true,
    count: records.length,
    lastHash: expectedPreviousHash,
    message: "Cadena de auditoría 100% íntegra y verificada matemáticamente",
  };
}

/**
 * Registra de forma atómica y encadenada un evento en la tabla `SecurityAuditLog`.
 */
export async function appendAuditLog(
  prisma: PrismaClient,
  params: {
    action: string;
    payload: Record<string, unknown>;
    actorId?: string | null;
  }
) {
  const actorHash = pseudonymizeActor(params.actorId);
  const now = new Date();

  // Obtener la última tupla de la cadena
  const lastRecord = await prisma.securityAuditLog.findFirst({
    orderBy: { sequenceNumber: "desc" },
  });

  const nextSequence = (lastRecord?.sequenceNumber ?? 0) + 1;
  const previousHash = lastRecord?.currentHash ?? GENESIS_HASH;

  const currentHash = computeChainHash(previousHash, {
    sequenceNumber: nextSequence,
    action: params.action,
    actorHash,
    payload: params.payload,
    timestamp: now,
  });

  return prisma.securityAuditLog.create({
    data: {
      sequenceNumber: nextSequence,
      previousHash,
      currentHash,
      eventPayload: canonicalStringify(params.payload),
      actorHash,
      action: params.action,
      timestamp: now,
    },
  });
}
