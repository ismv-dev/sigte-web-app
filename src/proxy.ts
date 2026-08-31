import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { requireSecret } from "@/lib/env";

const SECRET = new TextEncoder().encode(
  requireSecret("JWT_SECRET", "dev-only-secret-replace")
);
const ISSUER = process.env.JWT_ISSUER ?? "sigte.local";
const AUDIENCE = process.env.JWT_AUDIENCE ?? "sigte.app";

const PROTECTED = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/guard", roles: ["GUARD", "ADMIN"] },
  { prefix: "/user", roles: ["USER", "GUARD", "ADMIN"] },
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const match = PROTECTED.find((p) => pathname.startsWith(p.prefix));
  if (!match) return NextResponse.next();

  const token = req.cookies.get("sigte_session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(token, SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (!match.roles.includes(payload.role as string)) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/guard/:path*", "/user/:path*"],
};
