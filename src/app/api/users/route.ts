import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { jsonError, parseJson, withAuth } from "@/lib/api";
import { formatRut, isValidRut } from "@/lib/rut";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/users (solo ADMIN)
 *  - q: texto libre → matchea nombre, correo, RUT o credencial universitaria.
 *  - userType: filtro por "STAFF" o "STUDENT"
 */
export const GET = withAuth(
  async (req) => {
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const userTypeParam = url.searchParams.get("userType")?.trim().toUpperCase();

    const where: Prisma.UserWhereInput = {};
    if (userTypeParam === "STAFF" || userTypeParam === "STUDENT") {
      where.userType = userTypeParam;
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q.toLowerCase() } },
        { rut: { contains: q } },
        { universityId: { contains: q } },
        { position: { contains: q, mode: "insensitive" } },
        { department: { contains: q, mode: "insensitive" } },
        { career: { contains: q, mode: "insensitive" } },
        { academicDepartment: { contains: q, mode: "insensitive" } },
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
  role: z.enum(["USER", "GUARD", "ADMIN"]).default("USER"),
  universityId: z.string().optional(),
  userType: z.enum(["STAFF", "STUDENT"]).optional().nullable(),
  phone: z.string().optional().nullable(),
  // Staff
  position: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  // Student
  rut: z.string().optional().nullable(),
  academicDepartment: z.string().optional().nullable(),
  career: z.string().optional().nullable(),
});

export const POST = withAuth(
  async (req) => {
    const parsed = await parseJson(req, createSchema);
    if (!parsed.ok) return parsed.response;
    const {
      email,
      password,
      name,
      role,
      universityId,
      userType,
      phone,
      position,
      department,
      rut: rawRut,
      academicDepartment,
      career,
    } = parsed.data;
    const emailLower = email.toLowerCase();

    const exists = await prisma.user.findUnique({ where: { email: emailLower } });
    if (exists) return jsonError(409, "Email ya existe");

    if (universityId) {
      const uExists = await prisma.user.findUnique({ where: { universityId } });
      if (uExists) return jsonError(409, "La credencial universitaria ya existe");
    }

    let rut: string | null = null;
    if (rawRut && rawRut.trim() !== "") {
      if (!isValidRut(rawRut)) {
        return jsonError(400, "RUT inválido");
      }
      rut = formatRut(rawRut);
      const rutExists = await prisma.user.findUnique({ where: { rut } });
      if (rutExists) return jsonError(409, "El RUT ya está registrado");
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: emailLower,
        passwordHash,
        name,
        role: role ?? "USER",
        universityId: universityId || null,
        userType: userType || null,
        phone: phone || null,
        position: userType === "STAFF" ? position || null : null,
        department: userType === "STAFF" ? department || null : null,
        rut: userType === "STUDENT" ? rut : null,
        academicDepartment: userType === "STUDENT" ? academicDepartment || null : null,
        career: userType === "STUDENT" ? career || null : null,
      },
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
        universityId: true,
        active: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ user }, { status: 201 });
  },
  { roles: ["ADMIN"] }
);
