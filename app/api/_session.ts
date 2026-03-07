import { jwtVerify } from "jose";

export type RequestSession = {
  userId: string;
  role: "ADMIN" | "DISTRIBUTOR";
  distributorId?: string | null;
  email?: string;
};

const COOKIE_NAME = "cz_session";

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error("SESSION_SECRET is missing/empty. Please set it in .env");
  }
  return new TextEncoder().encode(secret);
}

export async function getSessionFromRequest(req: Request): Promise<RequestSession | null> {
  const cookieHeader = req.headers.get("cookie") || "";
  const token = cookieHeader
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${COOKIE_NAME}=`))
    ?.slice(`${COOKIE_NAME}=`.length);

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const s = payload as any;
    if (!s?.userId || !s?.role) return null;

    return {
      userId: String(s.userId),
      role: s.role,
      distributorId:
        typeof s.distributorId === "string" ? s.distributorId : s.distributorId ?? null,
      email: s.email ? String(s.email) : undefined,
    };
  } catch {
    return null;
  }
}
