import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "cz_session";

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error("SESSION_SECRET is missing/empty. Please set it in .env");
  }
  return new TextEncoder().encode(secret);
}

async function getSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as any;
  } catch {
    return null;
  }
}

function addSecurityHeaders(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never redirect API routes to /login
  if (pathname.startsWith("/api")) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Public / static routes
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/brand")
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  const session = await getSession(req);

  // Not logged in -> go login with next=
  if (!session?.userId) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  const role = session.role as "ADMIN" | "DISTRIBUTOR";

  // Root -> role home
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = role === "ADMIN" ? "/admin" : "/dashboard";
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  // Block legacy admin path under dashboard
  if (pathname.startsWith("/dashboard/admin")) {
    const url = req.nextUrl.clone();
    url.pathname = role === "ADMIN" ? "/admin" : "/dashboard";
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  // ADMIN area
  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return addSecurityHeaders(NextResponse.redirect(url));
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // DISTRIBUTOR area
  if (pathname.startsWith("/dashboard")) {
    if (role !== "DISTRIBUTOR") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      return addSecurityHeaders(NextResponse.redirect(url));
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // Any other route -> send to role home
  const url = req.nextUrl.clone();
  url.pathname = role === "ADMIN" ? "/admin" : "/dashboard";
  return addSecurityHeaders(NextResponse.redirect(url));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};