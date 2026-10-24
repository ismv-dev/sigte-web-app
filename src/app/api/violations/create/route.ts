import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, parseJson, withAuth } from "@/lib/api";
import { appendAuditLog } from "@/lib/audit-chain";
import { generateBlindIndex, normalizePlate } from "@/lib/crypto";

export const dynamic = "force-dynamic";

const violationSchema = z.object({
  plate: z.string().min(2),
  type: z.enum([
    "WRONG_BLOCK",
    "UNAUTHORIZED_ENTRY",
    "DOUBLE_PARKING",
    "EXPIRED_PERMIT",
    "BLOCKING_ACCESS",
    "SPEEDING",
    "OTHER",
  ]),
  description: z.string().min(3),
  evidenceUrl: z.string().optional(),
});

/**
 * POST /api/violations/create
 * Especificación de la Tesina (Capítulo 4 Tabla 12).
 * Cursa una infracción perimetral con sellado y encadenamiento criptográfico.
 * Retorno minimizado: { ticket_id: UUID, timestamp: ISO8601 }
 */
export const POST = withAuth(
  async (req, { session }) => {
    const parsed = await parseJson(req, violationSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const plateClean = normalizePlate(body.plate);
    const blindIndex = generateBlindIndex(plateClean);

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        OR: [{ plate: plateClean }, { plateBlindIndex: blindIndex }],
      },
    });

    if (!vehicle) return jsonError(404, "Vehículo infractor no encontrado");

    const infraction = await prisma.infraction.create({
      data: {
        vehicleId: vehicle.id,
        userId: vehicle.ownerId,
        guardId: session.sub,
        type: body.type,
        description: body.description,
        evidenceUrl: body.evidenceUrl,
        status: "OPEN",
      },
    });

    // Sellado criptográfico inmutable en la bitácora encadenada (RT-06)
    const auditLog = await appendAuditLog(prisma, {
      action: "VIOLATION_TICKET_CREATED",
      payload: {
        ticketId: infraction.id,
        vehicleId: vehicle.id,
        type: body.type,
        description: body.description,
      },
      actorId: session.sub,
    });

    await prisma.infraction.update({
      where: { id: infraction.id },
      data: { auditHash: auditLog.currentHash },
    });

    return NextResponse.json(
      {
        ticket_id: infraction.id,
        timestamp: infraction.createdAt.toISOString(),
        audit_hash: auditLog.currentHash,
      },
      { status: 201 }
    );
  },
  { roles: ["GUARD", "ADMIN"] }
);
