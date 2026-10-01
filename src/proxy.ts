import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { requireSecret } from "@/lib/env";
import { isValidVersion } from "@/lib/versions";

const SECRET = new TextEncoder().encode(
  requireSecret("JWT_SECRET", "dev-only-secret-replace")
);
const ISSUER = process.env.JWT_ISSUER ?? "sigte.local";
const AUDIENCE = process.env.JWT_AUDIENCE ?? "sigte.app";

const PROTECTED = [
  { section: "admin", roles: ["ADMIN"] },
  { section: "guard", roles: ["GUARD", "ADMIN"] },
  { section: "user", roles: ["USER", "GUARD", "ADMIN"] },
];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Do not intercept API routes, static assets, or public files with extensions
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Root landing is public and version-hub
  if (pathname === "/") {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];

  // If path is unversioned (e.g., /login, /user, /guard, /admin), redirect to default complete version (/v3/...)
  if (!isValidVersion(firstSegment)) {
    const targetUrl = req.nextUrl.clone();
    targetUrl.pathname = `/v3${pathname}`;
    targetUrl.search = search;
    return NextResponse.redirect(targetUrl);
  }

  const version = firstSegment;
  const section = segments[1];

  const match = PROTECTED.find((p) => p.section === section);
  if (!match) {
    return NextResponse.next();
  }

  const token = req.cookies.get("sigte_session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = `/${version}/login`;
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
      url.pathname = `/${version}`;
      return NextResponse.redirect(url);
    }
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = `/${version}/login`;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
