import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { signToken } from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn().mockResolvedValue({ id: "target-1", role: "GUARD" }),
      delete: vi.fn().mockResolvedValue({ id: "target-1" }),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { PATCH, DELETE } from "./route";

async function callPatch(role: "USER" | "GUARD" | "ADMIN", sub: string, body: Record<string, unknown>) {
  const token = await signToken({ sub, email: "x@usm.cl", role, name: "X" });
  const req = new NextRequest("http://localhost/api/users/target-1", {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return PATCH(req, { params: Promise.resolve({ id: "target-1" }) });
}

async function callDelete(sub: string, targetId: string) {
  const token = await signToken({ sub, email: "x@usm.cl", role: "ADMIN", name: "X" });
  const req = new NextRequest(`http://localhost/api/users/${targetId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  return DELETE(req, { params: Promise.resolve({ id: targetId }) });
}

describe("PATCH /api/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("permite a un ADMIN cambiar el rol de otro usuario", async () => {
    const res = await callPatch("ADMIN", "admin-1", { role: "GUARD" });
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "target-1" },
      data: { role: "GUARD" },
      select: expect.any(Object),
    });
  });

  it("rechaza a un GUARD (no es ADMIN)", async () => {
    const res = await callPatch("GUARD", "guard-1", { role: "ADMIN" });
    expect(res.status).toBe(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rechaza a un USER (no es ADMIN)", async () => {
    const res = await callPatch("USER", "user-1", { role: "ADMIN" });
    expect(res.status).toBe(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("un ADMIN puede eliminar a otro usuario", async () => {
    const res = await callDelete("admin-1", "target-1");
    expect(res.status).toBe(200);
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: "target-1" } });
  });

  it("un ADMIN no puede eliminarse a si mismo", async () => {
    const res = await callDelete("admin-1", "admin-1");
    expect(res.status).toBe(400);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });
});
