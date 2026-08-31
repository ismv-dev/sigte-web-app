import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ set: vi.fn(), get: vi.fn(), delete: vi.fn() }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn().mockResolvedValue({}) },
  },
}));

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { POST } from "./route";

function request(email: string, password: string) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

const CORRECT_PASSWORD = "correcta123";
let correctHash: string;

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    correctHash = await hashPassword(CORRECT_PASSWORD);
  });

  it("bloquea el login si lockedUntil es futuro", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "u@usm.cl",
      passwordHash: correctHash,
      active: true,
      role: "USER",
      name: "Usuario",
      failedLoginAttempts: 0,
      lockedUntil: new Date(Date.now() + 5 * 60_000),
    } as never);

    const res = await POST(request("u@usm.cl", CORRECT_PASSWORD));
    expect(res.status).toBe(429);
  });

  it("incrementa failedLoginAttempts en un intento fallido", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "u@usm.cl",
      passwordHash: correctHash,
      active: true,
      role: "USER",
      name: "Usuario",
      failedLoginAttempts: 2,
      lockedUntil: null,
    } as never);

    const res = await POST(request("u@usm.cl", "incorrecta"));

    expect(res.status).toBe(401);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { failedLoginAttempts: 3 },
    });
  });

  it("bloquea 15 minutos al llegar al 5to intento fallido", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "u@usm.cl",
      passwordHash: correctHash,
      active: true,
      role: "USER",
      name: "Usuario",
      failedLoginAttempts: 4,
      lockedUntil: null,
    } as never);

    await POST(request("u@usm.cl", "incorrecta"));

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({ failedLoginAttempts: 0, lockedUntil: expect.any(Date) }),
    });
  });

  it("resetea el contador en un login exitoso tras intentos previos", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "u@usm.cl",
      passwordHash: correctHash,
      active: true,
      role: "USER",
      name: "Usuario",
      failedLoginAttempts: 2,
      lockedUntil: null,
    } as never);

    const res = await POST(request("u@usm.cl", CORRECT_PASSWORD));

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  });
});
