import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, withAuth } from "@/lib/api";
import { verifyQrToken } from "@/lib/qr";
import { generateBlindIndex, maskPlate, maskName, normalizePlate } from "@/lib/crypto";

/**
 * GET /api/access/lookup?plate=XXX
 * Guardia o Administrador busca por patente para prevalidar acceso antes de registrar.
 * Aplica principio de minimización estricta de datos (RT-03 / RQ-03) si el consultante es guardia.
 */
export const GET = withAuth(
  async (req, { session }) => {
    const url = new URL(req.url);
    const rawPlate = url.searchParams.get("plate");
    const qr = url.searchParams.get("qr");
    const uid = url.searchParams.get("uid");

    const isGuard = session.role === "GUARD";
    // Si es guardia, solo seleccionamos el nombre; si es admin, atributos completos
    const ownerSelect = isGuard
      ? { id: true, name: true }
      : { id: true, name: true, email: true, universityId: true };

    let vehicle = null;
    if (rawPlate) {
      const plateNormalized = normalizePlate(rawPlate);
      const blindIndex = generateBlindIndex(plateNormalized);

      vehicle = await prisma.vehicle.findFirst({
        where: {
          OR: [
            { plate: plateNormalized },
            { plateBlindIndex: blindIndex },
          ],
        },
        include: {
          owner: { select: ownerSelect },
          currentBlock: true,
        },
      });
    } else if (qr) {
      const vResult = verifyQrToken(qr);
      if (!vResult.ok) {
        return NextResponse.json({ vehicle: null, qrError: vResult.error });
      }
      vehicle = await prisma.vehicle.findUnique({
        where: { id: vResult.vehicleId },
        include: {
          owner: { select: ownerSelect },
          currentBlock: true,
        },
      });
    } else if (uid) {
      // Búsqueda por credencial universitaria (solo ADMIN o proceso interno autorizado)
      const owner = await prisma.user.findUnique({ where: { universityId: uid } });
      if (owner) {
        vehicle = await prisma.vehicle.findFirst({
          where: { ownerId: owner.id },
          orderBy: { createdAt: "desc" },
          include: {
            owner: { select: ownerSelect },
            currentBlock: true,
          },
        });
      }
    } else {
      return jsonError(400, "Indica plate, qr o uid");
    }

    if (!vehicle) return NextResponse.json({ vehicle: null });

    const openInfractions = await prisma.infraction.count({
      where: { vehicleId: vehicle.id, status: "OPEN" },
    });

    const responseVehicle = {
      ...vehicle,
      plate: isGuard ? maskPlate(vehicle.plate) : vehicle.plate,
      plateMasked: maskPlate(vehicle.plate),
      owner: vehicle.owner
        ? {
            id: vehicle.owner.id,
            name: isGuard ? maskName(vehicle.owner.name) : vehicle.owner.name,
            nameMasked: maskName(vehicle.owner.name),
            email: isGuard ? undefined : (vehicle.owner as { email?: string }).email,
            universityId: isGuard ? undefined : (vehicle.owner as { universityId?: string | null }).universityId,
          }
        : vehicle.owner,
      // Ocultar datos de cifrado internos
      plateCipher: undefined,
      plateIv: undefined,
      plateTag: undefined,
      plateBlindIndex: undefined,
    };

    return NextResponse.json({ vehicle: responseVehicle, openInfractions });
  },
  { roles: ["GUARD", "ADMIN"] }
);
