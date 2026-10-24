import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseJson, withAuth } from "@/lib/api";
import { executeDataPruning } from "@/lib/pruning";

export const dynamic = "force-dynamic";

const pruningSchema = z.object({
  dryRun: z.boolean().optional().default(false),
  retentionYears: z.number().int().min(1).max(10).optional().default(3),
});

/**
 * POST /api/admin/pruning
 * Endpoint de gobernanza y expurgación periódica de datos (RT-05 / RQ-10 / Tabla 12).
 *
 * Rol requerido: ADMIN.
 *
 * Elimina nonces expirados y bitácoras que excedan el plazo legal de conservación (>= 3 años),
 * sellando el resultado en la bitácora inmutable de auditoría.
 */
export const POST = withAuth(
  async (req, { session }) => {
    const parsed = await parseJson(req, pruningSchema);
    if (!parsed.ok) return parsed.response;

    const { dryRun, retentionYears } = parsed.data;

    const summary = await executeDataPruning(prisma, {
      dryRun,
      retentionYears,
      actorId: session.sub,
    });

    const totalPurged = summary.noncesPurged + summary.accessLogsPurged + summary.resetTokensPurged;

    return NextResponse.json({
      records_purged: totalPurged,
      status: summary.status,
      nonces_purged: summary.noncesPurged,
      access_logs_purged: summary.accessLogsPurged,
      reset_tokens_purged: summary.resetTokensPurged,
      cutoff_date: summary.cutoffDate,
      execution_time_ms: summary.executionTimeMs,
    });
  },
  { roles: ["ADMIN"] }
);
