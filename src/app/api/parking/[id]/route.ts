import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, parseJson, withAuth } from "@/lib/api";

const updateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  capacity: z.number().int().min(1).optional(),
  isDefault: z.boolean().optional(),
});

export const PATCH = withAuth<{ id: string }>(
  async (req, { params }) => {
    const parsed = await parseJson(req, updateSchema);
    if (!parsed.ok) return parsed.response;

    // Si se quiere marcar como default, desmarcar cualquier otro primero
    if (parsed.data.isDefault === true) {
      await prisma.parkingBlock.updateMany({
        where: { isDefault: true, NOT: { id: params.id } },
        data: { isDefault: false },
      });
    }

    const block = await prisma.parkingBlock.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json({ block });
  },
  { roles: ["ADMIN"] }
);

export const DELETE = withAuth<{ id: string }>(
  async (_req, { params }) => {
    const target = await prisma.parkingBlock.findUnique({ where: { id: params.id } });
    if (!target) return jsonError(404, "Bloque no encontrado");
    if (target.isDefault)
      return jsonError(400, "No se puede eliminar el bloque por defecto. Asigná otro como default primero.");

    const inUse = await prisma.vehicle.count({ where: { currentBlockId: params.id } });
    if (inUse > 0) return jsonError(400, "El bloque tiene vehículos estacionados");

    await prisma.parkingBlock.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  },
  { roles: ["ADMIN"] }
);
