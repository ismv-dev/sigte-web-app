import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, parseJson, withAuth } from "@/lib/api";
import { signDynamicQr } from "@/lib/qr";

export const dynamic = "force-dynamic";

const generateSchema = z.object({
  vehicleId: z.string().min(1, "vehicleId requerido"),
});

/**
 * POST /api/auth/qr/generate
 * Especificación de la Tesina (Capítulo 3 / Capítulo 4 Tabla 12).
 * Emite una credencial dinámica efímera firmada con HMAC-SHA256 y TTL <= 5 min.
 */
export const POST = withAuth(
  async (req, { session }) => {
    const parsed = await parseJson(req, generateSchema);
    if (!parsed.ok) return parsed.response;

    const { vehicleId } = parsed.data;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) return jsonError(404, "Vehículo no encontrado");

    // Mitigación BOLA/IDOR
    if (session.role === "USER" && vehicle.ownerId !== session.sub) {
      return jsonError(403, "No puedes generar un código de acceso para un vehículo que no te pertenece");
    }

    const issuedAt = Date.now();
    const qrData = signDynamicQr(vehicle.id, session.sub, issuedAt);

    return NextResponse.json({
      token: qrData.token,
      expires_at: new Date(qrData.expiresAt).toISOString(),
      jti: qrData.jti,
    });
  },
  { roles: ["USER", "GUARD", "ADMIN"] }
);
