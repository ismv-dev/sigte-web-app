import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  setSessionCookie,
  signToken,
  verifyPassword,
} from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { LOCK_MS, isLocked, minutesRemaining, shouldLock } from "@/lib/loginPolicy";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, schema);
  if (!parsed.ok) return parsed.response;

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user || !user.active) return jsonError(401, "Credenciales inválidas");

  if (isLocked(user.lockedUntil)) {
    return jsonError(
      429,
      `Demasiados intentos fallidos. Intenta de nuevo en ${minutesRemaining(user.lockedUntil!)} minuto(s).`
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const attempts = user.failedLoginAttempts + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: shouldLock(attempts)
        ? { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + LOCK_MS) }
        : { failedLoginAttempts: attempts },
    });
    return jsonError(401, "Credenciales inválidas");
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

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
    token, // útil para clientes móviles (Expo) que no manejan cookies
  });
}
