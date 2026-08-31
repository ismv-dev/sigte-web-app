import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { signToken } from "@/lib/auth";
import { verifyQrToken } from "@/lib/qr";

const ownedVehicle = { id: "vehicle-1", ownerId: "user-1", plate: "AB1234" };

vi.mock("@/lib/prisma", () => ({
  prisma: {
    vehicle: { findUnique: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET } from "./route";

async function callGet(role: "USER" | "GUARD" | "ADMIN", sub: string, vehicleId = "vehicle-1") {
  const token = await signToken({ sub, email: "x@usm.cl", role, name: "X" });
  const req = new NextRequest(`http://localhost/api/qr?vehicleId=${vehicleId}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  return GET(req, { params: Promise.resolve({}) });
}

describe("GET /api/qr", () => {
  beforeEach(() => {
    vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(ownedVehicle as never);
  });

  it("genera un QR firmado y valido para el dueño del vehiculo", async () => {
    const res = await callGet("USER", "user-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.vehicle.plate).toBe("AB1234");

    const verified = verifyQrToken(body.token);
    expect(verified).toEqual({ ok: true, vehicleId: "vehicle-1", issuedAt: body.issuedAt });
  });

  it("rechaza a un USER que no es el dueño del vehiculo", async () => {
    const res = await callGet("USER", "user-2");
    expect(res.status).toBe(403);
  });

  it("permite a un GUARD generar el QR de cualquier vehiculo", async () => {
    const res = await callGet("GUARD", "guard-1");
    expect(res.status).toBe(200);
  });

  it("responde 404 si el vehiculo no existe", async () => {
    vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(null);
    const res = await callGet("USER", "user-1", "vehicle-inexistente");
    expect(res.status).toBe(404);
  });
});
