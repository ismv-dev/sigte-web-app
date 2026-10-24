import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, parseJson, withAuth } from "@/lib/api";
import { consumeQrToken } from "@/lib/qr";
import { maskPlate, maskName, decryptPlate } from "@/lib/crypto";
import { appendAuditLog } from "@/lib/audit-chain";

export const dynamic = "force-dynamic";

const verifyQrSchema = z.object({
  qrToken: z.string().min(1, "El token QR es obligatorio"),
  direction: z.enum(["IN", "OUT"]).default("IN"),
  blockId: z.string().optional(),
});

/**
 * POST /api/access/verify-qr
 * Endpoint especializado para guardias en portería con minimización estricta (RT-03 / RQ-03)
 * y protección transaccional anti-repetición (RT-01 / RQ-05).
 *
 * Retorna estrictamente la tupla de decisión operativa sin exponer atributos civiles (RUT, carrera, etc.)
 */
export const POST = withAuth(
  async (req: NextRequest, { session }) => {
    const parsed = await parseJson(req, verifyQrSchema);
    if (!parsed.ok) return parsed.response;

    const { qrToken, direction, blockId } = parsed.data;
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    // 1. Verificación criptográfica y consumo único atómico del token (Anti-Replay)
    const consumption = await consumeQrToken(prisma, qrToken, { ipAddress });
    if (!consumption.ok) {
      if (consumption.error === "replay") {
        return jsonError(409, consumption.message, {
          autorizado: false,
          errorType: "REPLAY_ATTACK",
        });
      }
      return jsonError(400, consumption.message, {
        autorizado: false,
        errorType: consumption.error,
      });
    }

    // 2. Consulta del vehículo con selección mínima de atributos del propietario
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: consumption.vehicleId },
      select: {
        id: true,
        plate: true,
        plateCipher: true,
        plateIv: true,
        plateTag: true,
        authorized: true,
        ownerId: true,
        owner: {
          select: {
            name: true, // Único atributo personal necesario para trato cortés
          },
        },
      },
    });

    if (!vehicle) {
      return jsonError(404, "Vehículo asociado al QR no encontrado en el sistema", {
        autorizado: false,
      });
    }

    // 3. Resolución de bloque para IN
    let blockToAssign: string | null | undefined = blockId;
    if (direction === "IN" && !blockToAssign) {
      const defaultBlock = await prisma.parkingBlock.findFirst({
        where: { isDefault: true },
        select: { id: true, name: true, capacity: true },
      });
      blockToAssign = defaultBlock?.id;
    }

    // Verificar capacidad del bloque si es IN
    if (direction === "IN" && blockToAssign) {
      const block = await prisma.parkingBlock.findUnique({
        where: { id: blockToAssign },
        select: { id: true, name: true, capacity: true },
      });
      if (block) {
        const occupied = await prisma.vehicle.count({ where: { currentBlockId: blockToAssign } });
        if (occupied >= block.capacity) {
          return jsonError(409, `Bloque ${block.name} lleno (${occupied}/${block.capacity})`, {
            autorizado: false,
          });
        }
      }
    }

    // 4. Registro del acceso
    const accessLog = await prisma.accessLog.create({
      data: {
        vehicleId: vehicle.id,
        userId: vehicle.ownerId,
        guardId: session.sub,
        method: "QR",
        direction,
        blockId: blockToAssign ?? null,
        authorized: vehicle.authorized,
        note: vehicle.authorized ? "Acceso QR dinámico verificado" : "Acceso QR rechazado: no autorizado",
      },
    });

    // 5. Actualización del estado del vehículo
    if (direction === "IN") {
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { currentBlockId: blockToAssign ?? null },
      });
    } else {
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { currentBlockId: null },
      });
    }

    // 6. Sellado en bitácora inmutable encadenada (RT-06)
    try {
      await appendAuditLog(prisma, {
        action: vehicle.authorized ? "ACCESS_GRANTED_QR" : "ACCESS_DENIED_QR",
        payload: {
          accessLogId: accessLog.id,
          direction,
          method: "QR",
          authorized: vehicle.authorized,
          jti: consumption.jti,
        },
        actorId: session.sub,
      });
    } catch {
      // Si falla la auditoría secundaria no bloqueamos la barrera física
    }

    // Determinar patente a enmascarar
    let rawPlate = vehicle.plate;
    if (vehicle.plateCipher && vehicle.plateIv && vehicle.plateTag) {
      try {
        rawPlate = decryptPlate(vehicle.plateCipher, vehicle.plateIv, vehicle.plateTag);
      } catch {
        rawPlate = vehicle.plate;
      }
    }

    // 7. Retorno estrictamente minimizado (RT-03 / RQ-03)
    // 0% de filtración de RUT, carrera, email, o legajo civil
    return NextResponse.json({
      autorizado: vehicle.authorized,
      nombreApellido: maskName(vehicle.owner.name),
      patenteEnmascarada: maskPlate(rawPlate),
      veredicto: vehicle.authorized ? "ALLOW" : "DENY",
      mensaje: vehicle.authorized ? "Ingreso autorizado" : "Vehículo no autorizado",
      accessLogId: accessLog.id,
    });
  },
  { roles: ["GUARD", "ADMIN"] }
);
