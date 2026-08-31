import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { hashResetToken } from "@/lib/passwordReset";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    passwordResetToken: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    user: {
      update: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

import { prisma } from "@/lib/prisma";
import { POST } from "./route";

function request(token: string, password: string) {
  return new NextRequest("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
}

const VALID_TOKEN = "un-token-cualquiera";
const NEW_PASSWORD = "nuevaClave123";

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("actualiza la contraseña con un token válido y no usado", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      tokenHash: hashResetToken(VALID_TOKEN),
      expiresAt: new Date(Date.now() + 10 * 60_000),
      usedAt: null,
    } as never);

    const res = await POST(request(VALID_TOKEN, NEW_PASSWORD));

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({ failedLoginAttempts: 0, lockedUntil: null }),
    });
    expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
      where: { id: "token-1" },
      data: expect.objectContaining({ usedAt: expect.any(Date) }),
    });
  });

  it("rechaza un token que no existe", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(null);

    const res = await POST(request("token-inexistente", NEW_PASSWORD));

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rechaza un token ya usado", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      tokenHash: hashResetToken(VALID_TOKEN),
      expiresAt: new Date(Date.now() + 10 * 60_000),
      usedAt: new Date(),
    } as never);

    const res = await POST(request(VALID_TOKEN, NEW_PASSWORD));

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rechaza un token expirado", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      tokenHash: hashResetToken(VALID_TOKEN),
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
    } as never);

    const res = await POST(request(VALID_TOKEN, NEW_PASSWORD));

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rechaza una contraseña de menos de 8 caracteres sin tocar la base", async () => {
    const res = await POST(request(VALID_TOKEN, "corta"));

    expect(res.status).toBe(400);
    expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled();
  });
});
