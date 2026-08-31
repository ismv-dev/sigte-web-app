import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, withAuth } from "@/lib/api";
import { verifyQrToken } from "@/lib/qr";

/**
 * GET /api/access/lookup?plate=XXX
 * Guardia busca por patente para prevalidar acceso antes de registrar.
 */
export const GET = withAuth(
  async (req) => {
    const url = new URL(req.url);
    const plate = url.searchParams.get("plate")?.toUpperCase().replace(/\s+/g, "");
    const qr = url.searchParams.get("qr");
    const uid = url.searchParams.get("uid");

    let vehicle = null;
    if (plate) {
      vehicle = await prisma.vehicle.findUnique({
        where: { plate },
        include: { owner: { select: { id: true, name: true, email: true, universityId: true } }, currentBlock: true },
      });
    } else if (qr) {
      const vResult = verifyQrToken(qr);
      if (!vResult.ok) {
        return NextResponse.json({ vehicle: null, qrError: vResult.error });
      }
      vehicle = await prisma.vehicle.findUnique({
        where: { id: vResult.vehicleId },
        include: { owner: { select: { id: true, name: true, email: true, universityId: true } }, currentBlock: true },
      });
    } else if (uid) {
      const owner = await prisma.user.findUnique({ where: { universityId: uid } });
      if (owner) {
        vehicle = await prisma.vehicle.findFirst({
          where: { ownerId: owner.id },
          orderBy: { createdAt: "desc" },
          include: { owner: { select: { id: true, name: true, email: true, universityId: true } }, currentBlock: true },
        });
      }
    } else {
      return jsonError(400, "Indica plate, qr o uid");
    }

    if (!vehicle) return NextResponse.json({ vehicle: null });

    const openInfractions = await prisma.infraction.count({
      where: { vehicleId: vehicle.id, status: "OPEN" },
    });

    return NextResponse.json({ vehicle, openInfractions });
  },
  { roles: ["GUARD", "ADMIN"] }
);
