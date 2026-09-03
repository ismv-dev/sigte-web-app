import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { signToken } from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
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

  it("permite a un ADMIN actualizar datos de funcionario", async () => {
    const res = await callPatch("ADMIN", "admin-1", {
      userType: "STAFF",
      position: "Docente Titular",
      department: "Departamento de Informática",
      phone: "+56 9 8888 7777",
    });
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "target-1" },
      data: {
        userType: "STAFF",
        position: "Docente Titular",
        department: "Departamento de Informática",
        phone: "+56 9 8888 7777",
      },
      select: expect.any(Object),
    });
  });

  it("permite a un ADMIN actualizar datos de alumno", async () => {
    const res = await callPatch("ADMIN", "admin-1", {
      userType: "STUDENT",
      rut: "12345678-5",
      academicDepartment: "Departamento de Informática",
      career: "Ingeniería Civil Informática",
      phone: "+56 9 1111 2222",
    });
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "target-1" },
      data: {
        userType: "STUDENT",
        rut: "12.345.678-5",
        academicDepartment: "Departamento de Informática",
        career: "Ingeniería Civil Informática",
        phone: "+56 9 1111 2222",
      },
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
