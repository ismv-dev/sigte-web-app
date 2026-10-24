import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJson } from "@/lib/api";
import {
  createSessionCaptcha,
  verifyAndConsumeCaptcha,
  isCaptchaRequired,
} from "@/lib/rate-limit";
import { resolveSessionId } from "@/proxy";

export const dynamic = "force-dynamic";

const verifySchema = z.object({
  challengeId: z.string().min(1),
  answer: z.string().min(1),
  token: z.string().optional(),
});

/**
 * GET /api/auth/captcha
 * Emite un nuevo desafío interactivo CAPTCHA para la sesión del solicitante (RT-07 / RQ-07).
 */
export async function GET(req: NextRequest) {
  const sessionId = resolveSessionId(req);
  const challenge = createSessionCaptcha(sessionId);

  return NextResponse.json({
    success: true,
    sessionId,
    captchaRequired: isCaptchaRequired(sessionId),
    challenge: {
      challengeId: challenge.challengeId,
      question: challenge.question,
      token: challenge.token,
      expiresAt: challenge.expiresAt,
    },
  });
}

/**
 * POST /api/auth/captcha
 * Valida la resolución del desafío CAPTCHA para la sesión y restablece el bloqueo interactivo.
 */
export async function POST(req: NextRequest) {
  const sessionId = resolveSessionId(req);
  const parsed = await parseJson(req, verifySchema);
  if (!parsed.ok) return parsed.response;

  const { challengeId, answer, token } = parsed.data;
  const verified = verifyAndConsumeCaptcha(sessionId, challengeId, answer, token);

  if (!verified) {
    return NextResponse.json(
      {
        success: false,
        error: "Respuesta de CAPTCHA incorrecta o desafío expirado",
        code: "CAPTCHA_INVALID",
        captchaRequired: true,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Desafío CAPTCHA resuelto exitosamente. Sesión desbloqueada.",
    captchaRequired: false,
  });
}
