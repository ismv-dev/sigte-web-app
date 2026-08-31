import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, parseJson, withAuth } from "@/lib/api";
import { sendPushToUser } from "@/lib/push";

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
  return NextResponse.json({ infractions });
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
      const plate = body.plate.toUpperCase().replace(/\s+/g, "");
      vehicle = await prisma.vehicle.findUnique({ where: { plate } });
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
