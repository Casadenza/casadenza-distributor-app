import { createHmac } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

const ISSUER = "casadenza-distributor-portal";
const AUDIENCE = "portal-password-reset";
const LIFETIME = "15m";

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.trim().length < 20) throw new Error("Password reset signing key unavailable");
  return value;
}

function fingerprint(userId: string, passwordHash: string): string {
  return createHmac("sha256", secret()).update(userId).update(":").update(passwordHash).digest("hex");
}

export async function createPasswordResetToken(user: { id: string; passwordHash: string }): Promise<string> {
  return new SignJWT({
    purpose: "password-reset",
    proof: fingerprint(user.id, user.passwordHash),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(LIFETIME)
    .sign(new TextEncoder().encode(secret()));
}

export async function verifyPasswordResetToken(token: string): Promise<{
  userId: string; proof: string;
}> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret()), {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: ["HS256"],
  });
  if (payload.purpose !== "password-reset" || typeof payload.sub !== "string" ||
      typeof payload.proof !== "string") throw new Error("Invalid reset token");
  return { userId: payload.sub, proof: payload.proof };
}

export function currentPasswordProof(user: { id: string; passwordHash: string }) {
  return fingerprint(user.id, user.passwordHash);
}
