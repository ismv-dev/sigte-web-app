import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, parseJson, withAuth } from "@/lib/api";

import { formatRut, isValidRut } from "@/lib/rut";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["USER", "GUARD", "ADMIN"]).optional(),
  active: z.boolean().optional(),
  universityId: z.string().nullable().optional(),
  userType: z.enum(["STAFF", "STUDENT"]).nullable().optional(),
  phone: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  rut: z.string().nullable().optional(),
  academicDepartment: z.string().nullable().optional(),
  career: z.string().nullable().optional(),
});

export const PATCH = withAuth<{ id: string }>(
  async (req, { params }) => {
    const parsed = await parseJson(req, patchSchema);
    if (!parsed.ok) return parsed.response;

    const data = { ...parsed.data };
    if (data.rut && data.rut.trim() !== "") {
      if (!isValidRut(data.rut)) {
        return jsonError(400, "RUT inválido");
      }
      data.rut = formatRut(data.rut);
      const rutExists = await prisma.user.findFirst({
        where: { rut: data.rut, id: { not: params.id } },
      });
      if (rutExists) return jsonError(409, "El RUT ya está registrado por otro usuario");
    }

    if (data.universityId) {
      const uExists = await prisma.user.findFirst({
        where: { universityId: data.universityId, id: { not: params.id } },
      });
      if (uExists) return jsonError(409, "La credencial universitaria ya está en uso");
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        userType: true,
        phone: true,
        position: true,
        department: true,
        rut: true,
        academicDepartment: true,
        career: true,
        active: true,
        universityId: true,
      },
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
