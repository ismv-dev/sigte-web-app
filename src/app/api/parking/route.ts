import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseJson, withAuth } from "@/lib/api";

/**
 * GET /api/parking — lista bloques con ocupación + totales generales.
 *
 * Respuesta:
 *   blocks: [{ id, name, description, capacity, occupied, free, isDefault }]
 *   totals: { inside, capacity, free, defaultBlockId }
 */
export const GET = withAuth(async () => {
  const [blocks, insideCount, capacityAgg] = await Promise.all([
    prisma.parkingBlock.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      include: { _count: { select: { vehicles: true } } },
    }),
    prisma.vehicle.count({ where: { currentBlockId: { not: null } } }),
    prisma.parkingBlock.aggregate({ _sum: { capacity: true } }),
  ]);

  const defaultBlock = blocks.find((b) => b.isDefault);
  const totalCapacity = capacityAgg._sum.capacity ?? 0;

  return NextResponse.json({
    blocks: blocks.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      capacity: b.capacity,
      isDefault: b.isDefault,
      occupied: b._count.vehicles,
      free: Math.max(0, b.capacity - b._count.vehicles),
    })),
    totals: {
      inside: insideCount,
      capacity: totalCapacity,
      free: Math.max(0, totalCapacity - insideCount),
      defaultBlockId: defaultBlock?.id ?? null,
    },
  });
});

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  capacity: z.number().int().min(1),
  isDefault: z.boolean().optional(),
});

export const POST = withAuth(
  async (req) => {
    const parsed = await parseJson(req, createSchema);
    if (!parsed.ok) return parsed.response;

    // Si se crea como default, desmarcar cualquier otro
    if (parsed.data.isDefault) {
      await prisma.parkingBlock.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    const block = await prisma.parkingBlock.create({ data: parsed.data });
    return NextResponse.json({ block }, { status: 201 });
  },
  { roles: ["ADMIN"] }
);
