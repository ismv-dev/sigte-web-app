import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, parseJson, withAuth } from "@/lib/api";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["USER", "GUARD", "ADMIN"]).optional(),
  active: z.boolean().optional(),
  universityId: z.string().optional(),
});

export const PATCH = withAuth<{ id: string }>(
  async (req, { params }) => {
    const parsed = await parseJson(req, patchSchema);
    if (!parsed.ok) return parsed.response;
    const user = await prisma.user.update({
      where: { id: params.id },
      data: parsed.data,
      select: { id: true, email: true, name: true, role: true, active: true, universityId: true },
    });
    return NextResponse.json({ user });
  },
  { roles: ["ADMIN"] }
);

export const DELETE = withAuth<{ id: string }>(
  async (_req, { session, params }) => {
    if (params.id === session.sub) return jsonError(400, "No puedes eliminar tu propio usuario");
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  },
  { roles: ["ADMIN"] }
);
