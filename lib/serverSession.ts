import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export type AppRole = "ADMIN" | "DISTRIBUTOR";

export type AppSession = {
  userId: string;
  role: AppRole;
  email?: string;
  distributorId?: string | null;
};

const COOKIE_NAME = "cz_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error("SESSION_SECRET is missing/empty. Please set it in .env");
  }
  return new TextEncoder().encode(secret);
}

function setCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function createSession(session: AppSession): Promise<string> {
  const token = await new SignJWT(session as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());

  setCookie(token);
  return token;
}

export async function readSession(): Promise<AppSession | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const s = payload as any;

    if (!s?.userId || !s?.role) return null;

    return {
      userId: String(s.userId),
      role: s.role as AppRole,
      email: s.email ? String(s.email) : undefined,
      distributorId:
        typeof s.distributorId === "string" ? s.distributorId : s.distributorId ?? null,
    };
  } catch {
    return null;
  }
}

export function clearSession() {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

// Legacy aliases (existing code compatibility)
export const createServerSession = createSession;
export const getServerSession = readSession;
export const clearServerSession = async () => clearSession();
