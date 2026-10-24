import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { jsonError, withAuth } from "@/lib/api";
import { signDynamicQr } from "@/lib/qr";
import { maskPlate } from "@/lib/crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/qr?vehicleId=xxx
 * Genera un QR de acceso dinámico efímero con identificador único (jti) (RT-01 / RQ-05)
 * Devuelve data URL + token + expiresAt.
 */
export const GET = withAuth(async (req, { session }) => {
  const url = new URL(req.url);
  const vehicleId = url.searchParams.get("vehicleId");
  if (!vehicleId) return jsonError(400, "vehicleId requerido");

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return jsonError(404, "Vehículo no encontrado");

  // Mitigación BOLA/IDOR (RT-02 / RQ-06)
  if (session.role === "USER" && vehicle.ownerId !== session.sub)
    return jsonError(403, "No es tu vehículo");

  const issuedAt = Date.now();
  const { token, expiresAt, jti } = signDynamicQr(vehicle.id, session.sub, issuedAt);
  const dataUrl = await QRCode.toDataURL(token, {
    margin: 1,
    width: 360,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  return NextResponse.json({
    token,
    jti,
    dataUrl,
    vehicle: {
      id: vehicle.id,
      plate: vehicle.plate,
      plateMasked: maskPlate(vehicle.plate),
    },
    issuedAt,
    expiresAt,
  });
});
