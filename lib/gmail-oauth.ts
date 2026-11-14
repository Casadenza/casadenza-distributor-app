import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { prisma } from "@/lib/db";

export type Mailbox = "info";
export const GMAIL_ADDRESSES: Record<Mailbox, string> = {
  info: "info@casadenza.com",
};
const redirectPath = "/api/admin/gmail/callback";
const scope = "https://www.googleapis.com/auth/gmail.readonly";
const keys = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_TOKEN_ENCRYPTION_KEY"] as const;

export function gmailConfigReady() {
  return keys.every(k => !!process.env[k]?.trim());
}
function encryptionKey() {
  const raw = process.env.GMAIL_TOKEN_ENCRYPTION_KEY || "";
  if (!raw || raw.length < 32) throw new Error("Gmail encryption key not configured");
  return createHash("sha256").update(raw).digest();
}
export function encryptRefreshToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map(v => v.toString("base64url")).join(".");
}
export function decryptRefreshToken(value: string) {
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted token");
  const [iv, tag, ciphertext] = parts.map(x => Buffer.from(x, "base64url"));
  const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(ciphertext), cipher.final()]).toString("utf8");
}
function oauthStateSecret() {
  const raw = process.env.SESSION_SECRET;
  if (!raw || raw.length < 32) throw new Error("SESSION_SECRET is not configured securely");
  return raw;
}
export function signState(mailbox: Mailbox, userId: string) {
  const payload = Buffer.from(JSON.stringify({
    mailbox, userId, issuedAt: Date.now(), nonce: randomBytes(16).toString("hex"),
  })).toString("base64url");
  const signature = createHmac("sha256", oauthStateSecret()).update(payload).digest("base64url");
  return payload + "." + signature;
}
export function verifyState(state: string, userId: string): Mailbox | null {
  try {
    const [payload, signature] = state.split(".");
    if (!payload || !signature) return null;
    const expected = createHmac("sha256", oauthStateSecret()).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsed.userId !== userId || Date.now() - parsed.issuedAt > 10 * 60 * 1000 ||
        parsed.issuedAt > Date.now() || !(parsed.mailbox in GMAIL_ADDRESSES)) return null;
    return parsed.mailbox as Mailbox;
  } catch { return null; }
}
export function redirectUri() {
  // Canonical, fixed production origin prevents a Host-header redirect attack.
  const origin = process.env.GMAIL_OAUTH_ORIGIN || "https://admin.casadenza.app";
  const parsed = new URL(origin);
  if (parsed.protocol !== "https:" || parsed.pathname !== "/" || parsed.search || parsed.hash ||
      !["admin.casadenza.app"].includes(parsed.hostname)) throw new Error("Invalid Gmail OAuth origin");
  return origin.replace(/\/$/, "") + redirectPath;
}
export function googleConsentUrl(state: string, mailbox: Mailbox) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GMAIL_CLIENT_ID || "",
    redirect_uri: redirectUri(),
    response_type: "code",
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: "false",
    scope,
    state,
    login_hint: GMAIL_ADDRESSES[mailbox],
  }).toString();
  return url.toString();
}
export async function exchangeCode(code: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: process.env.GMAIL_CLIENT_ID || "",
      client_secret: process.env.GMAIL_CLIENT_SECRET || "",
      redirect_uri: redirectUri(), grant_type: "authorization_code",
    }), cache: "no-store",
  });
  if (!response.ok) {
    // Google OAuth error codes are public protocol identifiers, never credentials.
    // Keep descriptions, codes, tokens and request details out of application logs.
    const payload: unknown = await response.json().catch(() => null);
    const googleError = payload && typeof payload === "object" && "error" in payload
      ? (payload as {error?:unknown}).error : null;
    const allowed = new Set(["invalid_client", "invalid_grant", "invalid_request",
      "unauthorized_client", "access_denied", "unsupported_grant_type"]);
    const reason = typeof googleError === "string" && allowed.has(googleError)
      ? googleError : "unclassified";
    throw new Error("Google authorization exchange failed: " + reason);
  }
  const result = await response.json() as { access_token?: string; refresh_token?: string; scope?: string };
  if (!result.access_token || !result.refresh_token ||
      !result.scope?.split(" ").includes(scope)) throw new Error("Google did not grant offline read-only Gmail permission");
  return { accessToken: result.access_token, refreshToken: result.refresh_token };
}
export async function verifyGoogleMailbox(accessToken: string, mailbox: Mailbox) {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: "Bearer " + accessToken }, cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not verify Gmail account");
  const data = await response.json() as { emailAddress?: string };
  if (data.emailAddress?.toLowerCase() !== GMAIL_ADDRESSES[mailbox])
    throw new Error("Authorized the wrong Gmail account");
}
export async function storeMailbox(mailbox: Mailbox, refreshToken: string, userId: string) {
  await prisma.gmailMailboxConnection.upsert({
    where: { mailbox }, create: {
      mailbox, address: GMAIL_ADDRESSES[mailbox],
      encryptedRefreshToken: encryptRefreshToken(refreshToken), connectedBy: userId,
    }, update: {
      address: GMAIL_ADDRESSES[mailbox],
      encryptedRefreshToken: encryptRefreshToken(refreshToken), connectedBy: userId,
    },
  });
}
export async function mailboxCredentials() {
  const records = await prisma.gmailMailboxConnection.findMany({
    select: { mailbox: true, encryptedRefreshToken: true },
  });
  const tokens = new Map<Mailbox, string>();
  for (const record of records) {
    if (record.mailbox === "info")
      tokens.set(record.mailbox, decryptRefreshToken(record.encryptedRefreshToken));
  }
  return tokens;
}
