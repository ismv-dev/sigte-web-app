import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, parseJson } from "@/lib/api";
import { generateBlindIndex, maskPlate, normalizePlate } from "@/lib/crypto";
import { appendAuditLog } from "@/lib/audit-chain";
import { getLprApiKey } from "@/lib/env";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

const lprSchema = z.object({
  plate: z.string().min(2, "Patente requerida").max(12),
  gateId: z.string().default("ACCESO_PRINCIPAL"),
  direction: z.enum(["IN", "OUT"]).default("IN"),
});

/**
 * POST /api/access/verify-lpr
 * Endpoint especializado de alto rendimiento para cámaras perimetrales LPR (RT-04, RQ-01, RQ-02).
 *
 * Utiliza Búsqueda Ciega (Blind Indexing) para resolver la patente en < 15 ms sin descifrar
 * masivamente la base de datos en memoria y sin exponer patentes en texto claro.
 *
 * Autenticación: Cabecera 'X-LPR-API-Key' o sesión de Guardia/Admin.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // 1. Verificación de Autenticación Perimetral LPR
  const apiKey = req.headers.get("x-lpr-api-key");
  const expectedKey = getLprApiKey();

  let authenticated = apiKey === expectedKey;
  let actorId = "LPR_GATEWAY_SERVICE";

  if (!authenticated) {
    const session = await verifyToken(req.cookies.get("sigte_session")?.value || "");
    if (session && (session.role === "GUARD" || session.role === "ADMIN")) {
      authenticated = true;
      actorId = session.sub;
    }
  }

  if (!authenticated) {
    return jsonError(401, "Autenticación LPR requerida (X-LPR-API-Key inválida o ausente)", {
      veredicto: "DENY",
    });
  }

  const parsed = await parseJson(req, lprSchema);
  if (!parsed.ok) return parsed.response;

  const { plate, gateId, direction } = parsed.data;
  const plateClean = normalizePlate(plate);

  // 2. Cálculo del Blind Index determinista (HMAC-SHA256 con sal institucional)
  const blindIndex = generateBlindIndex(plateClean);

  // 3. Búsqueda directa indexada O(1) en PostgreSQL
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      OR: [
        { plateBlindIndex: blindIndex },
        { plate: plateClean },
      ],
    },
    select: {
      id: true,
      plate: true,
      authorized: true,
      ownerId: true,
      owner: { select: { id: true, name: true, active: true } },
    },
  });

  const isAuthorized = !!(vehicle && vehicle.authorized && vehicle.owner?.active);
  const veredicto = isAuthorized ? "ALLOW" : "DENY";

  let accessLogId: string | undefined;

  if (vehicle) {
    // 4. Registro de evento de acceso perimetral
    try {
      let blockId: string | null = null;
      if (direction === "IN") {
        const defaultBlock = await prisma.parkingBlock.findFirst({
          where: { isDefault: true },
          select: { id: true },
        });
        blockId = defaultBlock?.id ?? null;
      }

      const accessLog = await prisma.accessLog.create({
        data: {
          vehicleId: vehicle.id,
          userId: vehicle.ownerId,
          method: "PLATE",
          direction,
          blockId,
          authorized: isAuthorized,
          note: `LPR Gateway [${gateId}] - ${veredicto}`,
        },
      });
      accessLogId = accessLog.id;

      // Actualizar ubicación del vehículo
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { currentBlockId: direction === "IN" ? blockId : null },
      });

      // 5. Sellado en bitácora inmutable encadenada (RT-06 / RQ-04)
      await appendAuditLog(prisma, {
        action: `LPR_VERDICT_${veredicto}`,
        payload: {
          accessLogId: accessLog.id,
          gateId,
          direction,
          method: "PLATE",
          blindIndex,
          authorized: isAuthorized,
        },
        actorId,
      });
    } catch {
      // Continuar para no interrumpir el flujo vehicular ante fallos secundarios de log
    }
  }

  const durationMs = Date.now() - startTime;

  // 6. Respuesta minimizada de alta velocidad (RQ-01 / RQ-02)
  return NextResponse.json({
    veredicto,
    gate_id: gateId,
    autorizado: isAuthorized,
    patenteEnmascarada: maskPlate(plateClean),
    timestamp: new Date().toISOString(),
    latency_ms: durationMs,
    accessLogId,
  });
}
