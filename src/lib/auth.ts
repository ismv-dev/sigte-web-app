import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { requireSecret } from "./env";

export type Role = "USER" | "GUARD" | "ADMIN";

const SECRET = new TextEncoder().encode(
  requireSecret("JWT_SECRET", "dev-only-secret-replace")
);
const ISSUER = process.env.JWT_ISSUER ?? "sigte.local";
const AUDIENCE = process.env.JWT_AUDIENCE ?? "sigte.app";
const COOKIE_NAME = "sigte_session";

export type SessionPayload = {
  sub: string;
  email: string;
  role: Role;
  name: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as Role,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  const isDevTunnel =
    !!process.env.DEVTUNNEL_URL || process.env.HOST?.includes("devtunnels");
  const isSecure = isProduction || isDevTunnel;
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  const isDevTunnel =
    !!process.env.DEVTUNNEL_URL || process.env.HOST?.includes("devtunnels");
  const isSecure = isProduction || isDevTunnel;
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: 0,
  });
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getSessionFromRequest(
  req: NextRequest
): Promise<SessionPayload | null> {
  const bearer = req.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    return verifyToken(bearer.slice(7));
  }
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  const { prisma } = await import("./prisma");
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || !user.active) throw new Error("UNAUTHORIZED");
  return { session, user };
}

export function hasRole(session: SessionPayload | null, ...roles: Role[]) {
  return !!session && roles.includes(session.role);
}

export { COOKIE_NAME };
