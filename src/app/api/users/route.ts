import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { jsonError, parseJson, withAuth } from "@/lib/api";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/users (solo ADMIN)
 *  - q: texto libre → matchea nombre, correo, RUT o credencial universitaria.
 *    Lo usa el buscador de dueño al registrar un vehículo.
 */
export const GET = withAuth(
  async (req) => {
    const q = new URL(req.url).searchParams.get("q")?.trim();

    const where: Prisma.UserWhereInput = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q.toLowerCase() } },
        { rut: { contains: q } },
        { universityId: { contains: q } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: q ? 20 : 100,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        userType: true,
        rut: true,
        phone: true,
        position: true,
        department: true,
        academicDepartment: true,
        career: true,
        universityId: true,
        active: true,
        createdAt: true,
        _count: { select: { vehicles: true } },
      },
    });
    return NextResponse.json({ users });
  },
  { roles: ["ADMIN"] }
);

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(["USER", "GUARD", "ADMIN"]),
  universityId: z.string().optional(),
});

export const POST = withAuth(
  async (req) => {
    const parsed = await parseJson(req, createSchema);
    if (!parsed.ok) return parsed.response;
    const { email, password, name, role, universityId } = parsed.data;
    const emailLower = email.toLowerCase();

    const exists = await prisma.user.findUnique({ where: { email: emailLower } });
    if (exists) return jsonError(409, "Email ya existe");

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email: emailLower, passwordHash, name, role, universityId: universityId || null },
      select: { id: true, email: true, name: true, role: true, universityId: true, active: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  },
  { roles: ["ADMIN"] }
);
