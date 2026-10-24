import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, parseJson, withAuth } from "@/lib/api";
import { sendPushToUser } from "@/lib/push";
import { appendAuditLog } from "@/lib/audit-chain";
import { generateBlindIndex, normalizePlate, maskPlate, maskName } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, { session }) => {
  const where: Record<string, unknown> = {};
  if (session.role === "USER") where.userId = session.sub;

  const infractions = await prisma.infraction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      vehicle: { select: { id: true, plate: true } },
      guard: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const isGuard = session.role === "GUARD";
  const sanitizedInfractions = isGuard
    ? infractions.map((i) => ({
        ...i,
        vehicle: {
          ...i.vehicle,
          plate: maskPlate(i.vehicle.plate),
        },
        user: i.user
          ? {
              id: i.user.id,
              name: maskName(i.user.name),
            }
          : null,
      }))
    : infractions;

  return NextResponse.json({ infractions: sanitizedInfractions });
});

const createSchema = z.object({
  vehicleId: z.string().optional(),
  plate: z.string().optional(),
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
});

export const POST = withAuth(
  async (req, { session }) => {
    const parsed = await parseJson(req, createSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    let vehicle = null;
    if (body.vehicleId) {
      vehicle = await prisma.vehicle.findUnique({ where: { id: body.vehicleId } });
    } else if (body.plate) {
      const plate = normalizePlate(body.plate);
      const blindIndex = generateBlindIndex(plate);
      vehicle = await prisma.vehicle.findFirst({
        where: {
          OR: [{ plate }, { plateBlindIndex: blindIndex }],
        },
      });
    }
    if (!vehicle) return jsonError(404, "Vehículo no encontrado");

    const infraction = await prisma.infraction.create({
      data: {
        vehicleId: vehicle.id,
        userId: vehicle.ownerId,
        guardId: session.sub,
        type: body.type,
        description: body.description,
        status: "OPEN",
      },
    });

    // Sellado criptográfico inmutable en la bitácora encadenada (RT-06 / RQ-04)
    try {
      const auditLog = await appendAuditLog(prisma, {
        action: "INFRACTION_ISSUED",
        payload: {
          infractionId: infraction.id,
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
    } catch {
      // Continuar si la auditoría secundaria reporta fallo
    }

    if (vehicle.ownerId) {
      const title = "Nueva infracción registrada";
      const message = `Patente ${vehicle.plate}: ${body.description}`;

      await prisma.notification.create({
        data: { userId: vehicle.ownerId, title, message },
      });

      sendPushToUser(vehicle.ownerId, {
        title,
        body: message,
        data: { kind: "infraction", plate: vehicle.plate, type: body.type },
      }).catch(() => {});
    }

    return NextResponse.json({ infraction }, { status: 201 });
  },
  { roles: ["GUARD", "ADMIN"] }
);
