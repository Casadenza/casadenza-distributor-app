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

function isOrderAdminAllowedPath(pathname: string) {
  return (
    pathname === "/admin/orders" ||
    pathname.startsWith("/admin/orders/print/")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api")) {
    return addSecurityHeaders(NextResponse.next());
  }

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

  if (!session?.userId) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  const role = String(session.role || "") as "ADMIN" | "ORDER_ADMIN" | "DISTRIBUTOR";

  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname =
      role === "ADMIN"
        ? "/admin"
        : role === "ORDER_ADMIN"
        ? "/admin/orders"
        : "/dashboard";
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  if (pathname.startsWith("/dashboard/admin")) {
    const url = req.nextUrl.clone();
    url.pathname =
      role === "ADMIN"
        ? "/admin"
        : role === "ORDER_ADMIN"
        ? "/admin/orders"
        : "/dashboard";
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  if (pathname.startsWith("/admin")) {
    if (role === "ADMIN") {
      return addSecurityHeaders(NextResponse.next());
    }

    if (role === "ORDER_ADMIN") {
      if (isOrderAdminAllowedPath(pathname)) {
        return addSecurityHeaders(NextResponse.next());
      }
      const url = req.nextUrl.clone();
      url.pathname = "/admin/orders";
      return addSecurityHeaders(NextResponse.redirect(url));
    }

    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  if (pathname.startsWith("/dashboard")) {
    if (role !== "DISTRIBUTOR") {
      const url = req.nextUrl.clone();
      url.pathname = role === "ORDER_ADMIN" ? "/admin/orders" : "/admin";
      return addSecurityHeaders(NextResponse.redirect(url));
    }
    return addSecurityHeaders(NextResponse.next());
  }

  const url = req.nextUrl.clone();
  url.pathname =
    role === "ADMIN"
      ? "/admin"
      : role === "ORDER_ADMIN"
      ? "/admin/orders"
      : "/dashboard";
  return addSecurityHeaders(NextResponse.redirect(url));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};