import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, parseJson, withAuth } from "@/lib/api";
import { sendPushToUser } from "@/lib/push";
import { verifyQrToken } from "@/lib/qr";

/**
 * GET /api/access — últimos accesos (guardia / admin ven todo, usuario solo los suyos)
 */
export const GET = withAuth(async (req, { session }) => {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 500);
  const format = url.searchParams.get("format");

  const where: Record<string, unknown> = {};
  if (session.role === "USER") {
    where.vehicle = { ownerId: session.sub };
  }

  const logs = await prisma.accessLog.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: limit,
    include: {
      vehicle: { include: { owner: { select: { id: true, name: true } } } },
      guard: { select: { id: true, name: true } },
      block: { select: { id: true, name: true } },
    },
  });

  if (format === "csv") {
    const headers = ["timestamp", "plate", "owner", "method", "direction", "block", "guard", "authorized", "note"];
    const rows = logs.map((l) => [
      l.timestamp.toISOString(),
      l.vehicle.plate,
      l.vehicle.owner?.name ?? "",
      l.method,
      l.direction,
      l.block?.name ?? "",
      l.guard?.name ?? "",
      l.authorized ? "Autorizado" : "Rechazado",
      l.note ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=\"bitacora.csv\"" },
    });
  }

  return NextResponse.json({ logs });
});

const logSchema = z.object({
  plate: z.string().optional(),
  vehicleId: z.string().optional(),
  qrToken: z.string().optional(),
  universityId: z.string().optional(),
  method: z.enum(["PLATE", "QR", "CARD", "MANUAL"]),
  direction: z.enum(["IN", "OUT"]),
  blockId: z.string().optional(),
  note: z.string().optional(),
});

/**
 * POST /api/access — registra entrada o salida.
 *  - GUARD/ADMIN pueden registrar.
 *  - Si en IN no se especifica blockId, el vehículo cae en el bloque marcado isDefault.
 *  - En OUT: libera el bloque y baja la cuenta general.
 */
export const POST = withAuth(
  async (req, { session }) => {
    const parsed = await parseJson(req, logSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    let vehicle = null;
    if (body.vehicleId) {
      vehicle = await prisma.vehicle.findUnique({ where: { id: body.vehicleId } });
    } else if (body.plate) {
      const plate = body.plate.toUpperCase().replace(/\s+/g, "");
      vehicle = await prisma.vehicle.findUnique({ where: { plate } });
    } else if (body.qrToken) {
      const verified = verifyQrToken(body.qrToken);
      if (!verified.ok) {
        return jsonError(400, verified.error === "expirado" ? "QR expirado (válido por 5 minutos)" : "QR inválido");
      }
      vehicle = await prisma.vehicle.findUnique({ where: { id: verified.vehicleId } });
    } else if (body.universityId) {
      const owner = await prisma.user.findUnique({ where: { universityId: body.universityId } });
      if (owner) {
        vehicle = await prisma.vehicle.findFirst({
          where: { ownerId: owner.id },
          orderBy: { createdAt: "desc" },
        });
      }
    }

    if (!vehicle) return jsonError(404, "Vehículo no encontrado");
    if (session.role === "USER") return jsonError(403, "Solo un guardia puede registrar accesos");

    // Resolver bloque para IN: si no se especificó, usar el bloque default
    let blockToAssign: string | null | undefined = body.blockId;
    if (body.direction === "IN" && !blockToAssign) {
      const defaultBlock = await prisma.parkingBlock.findFirst({
        where: { isDefault: true },
      });
      blockToAssign = defaultBlock?.id;
    }

    // Verificar capacidad del bloque destino
    if (body.direction === "IN" && blockToAssign) {
      const block = await prisma.parkingBlock.findUnique({ where: { id: blockToAssign } });
      if (block) {
        const occupied = await prisma.vehicle.count({ where: { currentBlockId: blockToAssign } });
        if (occupied >= block.capacity) {
          return jsonError(409, `Bloque ${block.name} lleno (${occupied}/${block.capacity})`);
        }
      }
    }

    // Vehículo no autorizado: registrar con nota y devolver advertencia
    let warning: string | undefined;
    if (body.direction === "IN" && !vehicle.authorized) {
      warning = "Vehículo no autorizado. Acceso registrado con advertencia.";
    }

    const log = await prisma.accessLog.create({
      data: {
        vehicleId: vehicle.id,
        userId: vehicle.ownerId,
        guardId: session.sub,
        method: body.method,
        direction: body.direction,
        blockId: blockToAssign ?? null,
        authorized: vehicle.authorized,
        note: body.note ?? warning,
      },
      include: {
        vehicle: { include: { owner: { select: { id: true, name: true, email: true } } } },
        block: true,
      },
    });

    // Actualiza ubicación del vehículo (la fuente de verdad para la cuenta general)
    if (body.direction === "IN") {
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { currentBlockId: blockToAssign ?? null },
      });
    } else {
      // OUT: el vehículo queda fuera → cuenta general y bloque bajan
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { currentBlockId: null },
      });
    }

    if (vehicle.ownerId) {
      const title = body.direction === "IN" ? "Ingreso registrado" : "Salida registrada";
      const message =
        body.direction === "IN"
          ? `Vehículo ${vehicle.plate} ingresó al campus${log.block ? ` (${log.block.name})` : ""}.`
          : `Vehículo ${vehicle.plate} salió del campus.`;

      await prisma.notification.create({
        data: { userId: vehicle.ownerId, title, message },
      });

      sendPushToUser(vehicle.ownerId, {
        title,
        body: message,
        data: { kind: "access", direction: body.direction, plate: vehicle.plate },
      }).catch(() => {});
    }

    return NextResponse.json({ log, authorized: vehicle.authorized, warning }, { status: 201 });
  },
  { roles: ["GUARD", "ADMIN"] }
);
