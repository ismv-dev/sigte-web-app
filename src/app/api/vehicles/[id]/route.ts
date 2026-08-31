import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, parseJson, withAuth } from "@/lib/api";

const updateSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  authorized: z.boolean().optional(),
});

export const PATCH = withAuth<{ id: string }>(async (req, { session, params }) => {
  const { id } = params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) return jsonError(404, "Vehículo no encontrado");

  if (session.role === "USER" && vehicle.ownerId !== session.sub)
    return jsonError(403, "No puedes editar este vehículo");

  const parsed = await parseJson(req, updateSchema);
  if (!parsed.ok) return parsed.response;

  const updated = await prisma.vehicle.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ vehicle: updated });
});

export const DELETE = withAuth<{ id: string }>(async (_req, { session, params }) => {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } });
  if (!vehicle) return jsonError(404, "Vehículo no encontrado");

  if (session.role === "USER" && vehicle.ownerId !== session.sub)
    return jsonError(403, "No puedes eliminar este vehículo");

  await prisma.vehicle.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
