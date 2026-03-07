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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Never redirect API routes to /login (breaks fetch() by returning HTML)
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // ✅ Public / static routes
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/brand")
  ) {
    return NextResponse.next();
  }

  const session = await getSession(req);

  // Not logged in → go login with next=
  if (!session?.userId) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const role = session.role as "ADMIN" | "DISTRIBUTOR";

  // Root → role home
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = role === "ADMIN" ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // Block legacy admin path under dashboard (clean separation)
  if (pathname.startsWith("/dashboard/admin")) {
    const url = req.nextUrl.clone();
    url.pathname = role === "ADMIN" ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // ADMIN area
  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // DISTRIBUTOR area
  if (pathname.startsWith("/dashboard")) {
    if (role !== "DISTRIBUTOR") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Any other route → send to role home
  const url = req.nextUrl.clone();
  url.pathname = role === "ADMIN" ? "/admin" : "/dashboard";
  return NextResponse.redirect(url);
}

// ✅ Exclude /api completely from middleware matching
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
