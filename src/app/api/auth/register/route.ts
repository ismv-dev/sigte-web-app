import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie, signToken } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { formatRut, isValidRut } from "@/lib/rut";

// Campos comunes a Funcionario/Docente y Alumno.
const baseFields = {
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  phone: z.string().min(6, "Teléfono inválido"),
  universityId: z.string().optional(),
};

const staffSchema = z.object({
  userType: z.literal("STAFF"),
  ...baseFields,
  position: z.string().min(2), // Cargo
  department: z.string().min(2), // Departamento o Unidad
});

const studentSchema = z.object({
  userType: z.literal("STUDENT"),
  ...baseFields,
  rut: z.string().refine(isValidRut, "RUT inválido"),
  academicDepartment: z.string().min(2), // Departamento Académico
  career: z.string().min(2), // Carrera
});

const schema = z.discriminatedUnion("userType", [staffSchema, studentSchema]);

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, schema);
  if (!parsed.ok) return parsed.response;

  const data = parsed.data;
  const emailLower = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: emailLower } });
  if (existing) return jsonError(409, "El email ya está registrado");

  if (data.universityId) {
    const collision = await prisma.user.findUnique({ where: { universityId: data.universityId } });
    if (collision) return jsonError(409, "La credencial universitaria ya existe");
  }

  const rut = data.userType === "STUDENT" ? formatRut(data.rut) : null;
  if (rut) {
    const rutCollision = await prisma.user.findUnique({ where: { rut } });
    if (rutCollision) return jsonError(409, "El RUT ya está registrado");
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email: emailLower,
      passwordHash,
      name: data.name,
      universityId: data.universityId || null,
      role: "USER",
      userType: data.userType,
      phone: data.phone,
      // Funcionario / Docente
      position: data.userType === "STAFF" ? data.position : null,
      department: data.userType === "STAFF" ? data.department : null,
      // Alumno
      rut,
      academicDepartment: data.userType === "STUDENT" ? data.academicDepartment : null,
      career: data.userType === "STUDENT" ? data.career : null,
    },
  });

  const token = await signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });
  await setSessionCookie(token);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    token,
  });
}
