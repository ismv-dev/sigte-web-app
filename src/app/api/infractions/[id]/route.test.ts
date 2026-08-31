import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { signToken } from "@/lib/auth";

const openInfraction = { id: "inf-1", userId: "user-1", status: "OPEN" };

vi.mock("@/lib/prisma", () => ({
  prisma: {
    infraction: {
      findUnique: vi.fn(),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "inf-1", ...data })),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { PATCH } from "./route";

async function callPatch(
  role: "USER" | "GUARD" | "ADMIN",
  sub: string,
  body: Record<string, unknown>
) {
  const token = await signToken({ sub, email: "x@usm.cl", role, name: "X" });
  const req = new NextRequest("http://localhost/api/infractions/inf-1", {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return PATCH(req, { params: Promise.resolve({ id: "inf-1" }) });
}

describe("PATCH /api/infractions/[id]", () => {
  beforeEach(() => {
    vi.mocked(prisma.infraction.findUnique).mockResolvedValue(openInfraction as never);
  });

  it("permite al dueño reconocer su propia infracción abierta", async () => {
    const res = await callPatch("USER", "user-1", { status: "ACKNOWLEDGED" });
    expect(res.status).toBe(200);
  });

  it("rechaza a un USER que no es el dueño de la infracción (IDOR)", async () => {
    const res = await callPatch("USER", "user-2", { status: "ACKNOWLEDGED" });
    expect(res.status).toBe(403);
  });

  it("rechaza que un USER intente resolver (solo puede reconocer)", async () => {
    const res = await callPatch("USER", "user-1", { status: "RESOLVED" });
    expect(res.status).toBe(403);
  });

  it("permite a GUARD resolver y guarda trazabilidad de quién resolvió", async () => {
    const res = await callPatch("GUARD", "guard-1", { status: "RESOLVED", resolution: "pagó la multa" });
    expect(res.status).toBe(200);
    expect(prisma.infraction.update).toHaveBeenCalledWith({
      where: { id: "inf-1" },
      data: expect.objectContaining({
        status: "RESOLVED",
        resolvedById: "guard-1",
        resolution: "pagó la multa",
      }),
    });
  });
});
