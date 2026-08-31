import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { signToken } from "@/lib/auth";

const ownedVehicle = { id: "vehicle-1", ownerId: "user-1", plate: "AB1234" };

vi.mock("@/lib/prisma", () => ({
  prisma: {
    vehicle: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: "vehicle-1" }),
      delete: vi.fn().mockResolvedValue({ id: "vehicle-1" }),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { PATCH, DELETE } from "./route";

async function callPatch(role: "USER" | "GUARD" | "ADMIN", sub: string) {
  const token = await signToken({ sub, email: "x@usm.cl", role, name: "X" });
  const req = new NextRequest("http://localhost/api/vehicles/vehicle-1", {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ color: "Rojo" }),
  });
  return PATCH(req, { params: Promise.resolve({ id: "vehicle-1" }) });
}

async function callDelete(role: "USER" | "GUARD" | "ADMIN", sub: string) {
  const token = await signToken({ sub, email: "x@usm.cl", role, name: "X" });
  const req = new NextRequest("http://localhost/api/vehicles/vehicle-1", {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  return DELETE(req, { params: Promise.resolve({ id: "vehicle-1" }) });
}

describe("PATCH /api/vehicles/[id]", () => {
  beforeEach(() => {
    vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(ownedVehicle as never);
  });

  it("permite al dueño editar su propio vehículo", async () => {
    const res = await callPatch("USER", "user-1");
    expect(res.status).toBe(200);
  });

  it("rechaza a un USER que no es el dueño (IDOR)", async () => {
    const res = await callPatch("USER", "user-2");
    expect(res.status).toBe(403);
  });

  it("permite a GUARD editar un vehículo que no es suyo", async () => {
    const res = await callPatch("GUARD", "guard-1");
    expect(res.status).toBe(200);
  });

  it("permite a ADMIN editar cualquier vehículo", async () => {
    const res = await callPatch("ADMIN", "admin-1");
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/vehicles/[id]", () => {
  beforeEach(() => {
    vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(ownedVehicle as never);
  });

  it("permite al dueño eliminar su propio vehículo", async () => {
    const res = await callDelete("USER", "user-1");
    expect(res.status).toBe(200);
  });

  it("rechaza a un USER que no es el dueño (IDOR)", async () => {
    const res = await callDelete("USER", "user-2");
    expect(res.status).toBe(403);
  });

  it("permite a ADMIN eliminar cualquier vehículo", async () => {
    const res = await callDelete("ADMIN", "admin-1");
    expect(res.status).toBe(200);
  });
});
