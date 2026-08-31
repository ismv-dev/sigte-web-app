import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/api";
import { generateResetToken, hashResetToken, RESET_TOKEN_TTL_MS } from "@/lib/passwordReset";
import { sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

const GENERIC_MESSAGE =
  "Si el correo existe en el sistema, te enviamos un enlace para recuperar tu contraseña.";

const MAX_REQUESTS_PER_WINDOW = 3;
const WINDOW_MS = 15 * 60_000;

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, schema);
  if (!parsed.ok) return parsed.response;

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const recentCount = await prisma.passwordResetToken.count({
      where: { userId: user.id, createdAt: { gte: new Date(Date.now() - WINDOW_MS) } },
    });

    if (recentCount < MAX_REQUESTS_PER_WINDOW) {
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const token = generateResetToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashResetToken(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      const appUrl = process.env.APP_URL ?? "http://localhost:3000";
      await sendPasswordResetEmail(user.email, `${appUrl}/reset-password?token=${token}`);
    }
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
