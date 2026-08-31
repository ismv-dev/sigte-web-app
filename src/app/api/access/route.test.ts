import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { signQrToken } from "@/lib/qr";
import { signToken } from "@/lib/auth";

const mockVehicle = {
  id: "vehicle-1",
  plate: "AB1234",
  ownerId: "user-1",
  authorized: true,
  currentBlockId: null,
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    vehicle: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    accessLog: {
      create: vi.fn().mockResolvedValue({ id: "log-1", block: null }),
    },
    parkingBlock: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    notification: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/lib/push", () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { POST } from "./route";

async function callWithQr(qrToken: string) {
  const token = await signToken({ sub: "guard-1", email: "g@usm.cl", role: "GUARD", name: "Guardia" });
  const req = new NextRequest("http://localhost/api/access", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ qrToken, method: "QR", direction: "IN" }),
  });
  return POST(req, { params: Promise.resolve({}) });
}

describe("POST /api/access con QR", () => {
  beforeEach(() => {
    vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(mockVehicle as never);
  });

  it("acepta un QR firmado y vigente", async () => {
    const qr = signQrToken(mockVehicle.id);
    const res = await callWithQr(qr);
    expect(res.status).toBe(201);
  });

  it("rechaza un QR con firma manipulada (regresión del bug de verificación)", async () => {
    const qr = signQrToken(mockVehicle.id);
    const lastChar = qr.slice(-1);
    const tampered = qr.slice(0, -1) + (lastChar === "f" ? "0" : "f");
    const res = await callWithQr(tampered);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/inv[aá]lido/i);
  });

  it("rechaza un QR expirado", async () => {
    const qr = signQrToken(mockVehicle.id, Date.now() - 6 * 60_000);
    const res = await callWithQr(qr);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/expirado/i);
  });
});
