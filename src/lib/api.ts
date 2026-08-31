import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, type SessionPayload } from "./auth";
import type { Role } from "@prisma/client";
import { ZodError, ZodSchema } from "zod";

export type ApiHandler<T = unknown> = (
  req: NextRequest,
  ctx: { session: SessionPayload; params: T }
) => Promise<Response> | Response;

/** Envuelve un handler asegurando sesión y (opcional) roles permitidos. */
export function withAuth<T = Record<string, never>>(
  handler: ApiHandler<T>,
  opts?: { roles?: Role[] }
) {
  return async (req: NextRequest, ctx: { params: Promise<T> }) => {
    const session = await getSessionFromRequest(req);
    if (!session) return jsonError(401, "No autenticado");
    if (opts?.roles && !opts.roles.includes(session.role)) {
      return jsonError(403, "Acceso denegado para el rol " + session.role);
    }
    const resolvedParams = (ctx?.params ? await ctx.params : ({} as T));
    return handler(req, { session, params: resolvedParams });
  };
}

export function jsonError(status: number, message: string, extra?: unknown) {
  return NextResponse.json({ error: message, ...(extra as object) }, { status });
}

export async function parseJson<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  try {
    const raw = await req.json();
    const data = schema.parse(raw);
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Payload inválido", issues: err.issues },
          { status: 400 }
        ),
      };
    }
    return {
      ok: false,
      response: jsonError(400, "JSON mal formado"),
    };
  }
}
