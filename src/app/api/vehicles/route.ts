import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, parseJson, withAuth } from "@/lib/api";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/vehicles
 *  - Query params:
 *    - q: texto libre, matchea patente OR nombre/email del dueño
 *    - plate: legacy, matchea patente
 *    - inside: "true" → solo los que están actualmente dentro (currentBlockId != null)
 *    - blockId: filtrar por bloque actual (incluye "default")
 *  - USER: siempre restringido a sus propios vehículos
 *  - GUARD/ADMIN: acceso total
 */
export const GET = withAuth(async (req, { session }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const plate = url.searchParams.get("plate")?.toUpperCase().trim();
  const name = url.searchParams.get("name")?.trim();
  const inside = url.searchParams.get("inside") === "true";
  const blockId = url.searchParams.get("blockId");
  const location = url.searchParams.get("location");
  const status = url.searchParams.get("status") || url.searchParams.get("authorized");

  const where: Prisma.VehicleWhereInput = {};
  if (session.role === "USER") where.ownerId = session.sub;

  const andConditions: Prisma.VehicleWhereInput[] = [];

  if (q) {
    const upper = q.toUpperCase();
    andConditions.push({
      OR: [
        { plate: { contains: upper } },
        { owner: { name: { contains: q, mode: "insensitive" } } },
        { owner: { email: { contains: q.toLowerCase() } } },
        { owner: { rut: { contains: q } } },
      ],
    });
  } else {
    if (plate) {
      andConditions.push({ plate: { contains: plate } });
    }
    if (name) {
      andConditions.push({
        owner: { name: { contains: name, mode: "insensitive" } },
      });
    }
  }

  // Filtro de ubicación
  if (location === "INSIDE" || inside) {
    andConditions.push({ currentBlockId: { not: null } });
  } else if (location === "OUTSIDE") {
    andConditions.push({ currentBlockId: null });
  } else if (location && location !== "ALL") {
    andConditions.push({ currentBlockId: location });
  } else if (blockId) {
    andConditions.push({ currentBlockId: blockId });
  }

  // Filtro de estado
  if (status === "AUTHORIZED" || status === "true") {
    andConditions.push({ authorized: true });
  } else if (status === "BLOCKED" || status === "false") {
    andConditions.push({ authorized: false });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, name: true, email: true, role: true, universityId: true } },
      currentBlock: true,
    },
  });
  return NextResponse.json({ vehicles });
});

const createSchema = z.object({
  plate: z.string().min(3).max(12),
  make: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  ownerId: z.string().optional(),
  authorized: z.boolean().optional(),
});

export const POST = withAuth(async (req, { session }) => {
  const parsed = await parseJson(req, createSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const ownerId = session.role === "ADMIN" && data.ownerId ? data.ownerId : session.sub;
  const plate = data.plate.toUpperCase().replace(/\s+/g, "");
  const existing = await prisma.vehicle.findUnique({ where: { plate } });
  if (existing) return jsonError(409, "Patente ya registrada");

  const vehicle = await prisma.vehicle.create({
    data: {
      plate,
      make: data.make,
      model: data.model,
      color: data.color,
      authorized: data.authorized ?? true,
      ownerId,
    },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ vehicle }, { status: 201 });
});
