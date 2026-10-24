import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { verifyAuditChainRecords } from "@/lib/audit-chain";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/audit/verify
 * Endpoint de verificación forense matemática de la bitácora inmutable (RT-06 / RQ-04).
 *
 * Acceso: Exclusivo para administradores institucionales (ADMIN).
 *
 * Ejecuta una auditoría criptográfica completa de la cadena de hashes (H_n = HMAC_{K_audit}(D_n || H_{n-1})),
 * reportando el 100% de detecciones si algún registro histórico fue alterado, borrado o inyectado
 * en la base de datos sin la clave segregada K_audit.
 */
export const GET = withAuth(
  async () => {
    const startTime = Date.now();

    // 1. Obtener la totalidad de los eslabones ordenados por secuencia
    const records = await prisma.securityAuditLog.findMany({
      orderBy: { sequenceNumber: "asc" },
      select: {
        sequenceNumber: true,
        previousHash: true,
        currentHash: true,
        eventPayload: true,
        actorHash: true,
        action: true,
        timestamp: true,
      },
    });

    // 2. Ejecutar verificación algorítmica
    const verification = verifyAuditChainRecords(records);
    const durationMs = Date.now() - startTime;

    if (!verification.valid) {
      return NextResponse.json(
        {
          chainIntegrity: false,
          totalEventsVerified: verification.count,
          brokenAtSequence: verification.brokenAtSequence,
          expectedHash: verification.expectedHash,
          actualHash: verification.actualHash,
          reason: verification.reason,
          audit_duration_ms: durationMs,
          status: "ALERT_TAMPERING_DETECTED",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      chainIntegrity: true,
      totalEventsVerified: verification.count,
      lastVerifiedHash: verification.lastHash,
      brokenAtSequence: null,
      message: verification.message,
      audit_duration_ms: durationMs,
      status: "VERIFIED_TAMPER_PROOF",
    });
  },
  { roles: ["ADMIN"] }
);
