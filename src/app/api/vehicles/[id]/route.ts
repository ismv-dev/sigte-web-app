import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, parseJson, withAuth } from "@/lib/api";
import { decryptPlate, maskPlate } from "@/lib/crypto";

const updateSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  authorized: z.boolean().optional(),
});

export const GET = withAuth<{ id: string }>(async (_req, { session, params }) => {
  const { id } = params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      currentBlock: true,
    },
  });

  if (!vehicle) return jsonError(404, "Vehículo no encontrado");

  // Mitigación BOLA/IDOR (RT-02 / RQ-06)
  if (session.role === "USER" && vehicle.ownerId !== session.sub) {
    return jsonError(403, "Acceso denegado a este recurso");
  }

  // Descifrar patente si está cifrada, o enmascarar según rol
  let displayPlate = vehicle.plate;
  if (vehicle.plateCipher && vehicle.plateIv && vehicle.plateTag) {
    try {
      displayPlate = decryptPlate(vehicle.plateCipher, vehicle.plateIv, vehicle.plateTag);
    } catch {
      displayPlate = vehicle.plate;
    }
  }

  // Para usuarios no administradores en vistas operativas, enmascarar si aplica
  const responseVehicle = {
    ...vehicle,
    plate: displayPlate,
    plateMasked: maskPlate(displayPlate),
    plateCipher: undefined,
    plateIv: undefined,
    plateTag: undefined,
  };

  return NextResponse.json({ vehicle: responseVehicle });
});

export const PATCH = withAuth<{ id: string }>(async (req, { session, params }) => {
  const { id } = params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) return jsonError(404, "Vehículo no encontrado");

  // Mitigación BOLA/IDOR (RT-02 / RQ-06)
  if (session.role === "USER" && vehicle.ownerId !== session.sub) {
    return jsonError(403, "No puedes editar este vehículo");
  }

  const parsed = await parseJson(req, updateSchema);
  if (!parsed.ok) return parsed.response;

  const updateData = { ...parsed.data };

  // Mitigación Broken Function Level Authorization / Privilege Escalation:
  // Un usuario con rol USER jamás puede auto-autorizarse un vehículo
  if (session.role === "USER" && updateData.authorized !== undefined) {
    delete updateData.authorized;
  }

  const updated = await prisma.vehicle.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ vehicle: updated });
});

export const DELETE = withAuth<{ id: string }>(async (_req, { session, params }) => {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } });
  if (!vehicle) return jsonError(404, "Vehículo no encontrado");

  // Mitigación BOLA/IDOR (RT-02 / RQ-06)
  if (session.role === "USER" && vehicle.ownerId !== session.sub) {
    return jsonError(403, "No puedes eliminar este vehículo");
  }

  await prisma.vehicle.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
