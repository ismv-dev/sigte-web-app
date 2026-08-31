import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, parseJson, withAuth } from "@/lib/api";

const moveSchema = z.object({
  blockId: z.string().min(1),
});

/**
 * POST /api/vehicles/:id/move
 * Reasigna un vehículo a otro bloque SIN cambiar la cuenta general (entra + sale).
 * Solo funciona si el vehículo ya está dentro (currentBlockId != null).
 * Queda registrado como un AccessLog con method=MANUAL, direction=IN,
 * nota = "Reubicado al bloque X" para auditoría.
 */
export const POST = withAuth<{ id: string }>(
  async (req, { session, params }) => {
    const parsed = await parseJson(req, moveSchema);
    if (!parsed.ok) return parsed.response;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      include: { currentBlock: true, owner: true },
    });
    if (!vehicle) return jsonError(404, "Vehículo no encontrado");
    if (!vehicle.currentBlockId)
      return jsonError(400, "El vehículo no está dentro del estacionamiento");

    const target = await prisma.parkingBlock.findUnique({
      where: { id: parsed.data.blockId },
    });
    if (!target) return jsonError(404, "Bloque destino no encontrado");

    if (vehicle.currentBlockId === target.id)
      return jsonError(400, "El vehículo ya está en ese bloque");

    const from = vehicle.currentBlock?.name ?? "—";

    // Actualiza ubicación
    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { currentBlockId: target.id },
    });

    // Log de auditoría — NO cambia la cuenta general, solo re-ubica
    await prisma.accessLog.create({
      data: {
        vehicleId: vehicle.id,
        userId: vehicle.ownerId,
        guardId: session.sub,
        method: "MANUAL",
        direction: "IN",
        blockId: target.id,
        authorized: vehicle.authorized,
        note: `Reubicado desde ${from} → ${target.name}`,
      },
    });

    return NextResponse.json({
      ok: true,
      vehicle: { id: vehicle.id, plate: vehicle.plate },
      from,
      to: target.name,
    });
  },
  { roles: ["GUARD", "ADMIN"] }
);
