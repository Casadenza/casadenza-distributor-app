/**
 * Server-side, CRM-only Zoho API client.
 * Zoho CRM is the source of truth for distributor business records.
 * Server credentials must be configured as environment variables.
 */
type ZohoTokenResponse = { access_token?: string; expires_in?: number };
export function zohoConfigured() {
  return !!(process.env.ZOHO_REFRESH_TOKEN && process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET);
}
let tokenCache: { token: string; expiresAt: number } | null = null;
let tokenRefresh: Promise<string> | null = null;

export async function getZohoAccessToken(): Promise<string> {
  if (!zohoConfigured()) throw new Error("ZOHO_NOT_CONFIGURED");
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  if (!tokenRefresh) {
    tokenRefresh = (async () => {
      const base = (process.env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.in").replace(/\/+$/, "");
      const params = new URLSearchParams({
        refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
        client_id: process.env.ZOHO_CLIENT_ID!,
        client_secret: process.env.ZOHO_CLIENT_SECRET!,
        grant_type: "refresh_token",
      });
      const res = await fetch(base + "/oauth/v2/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: params,
        cache: "no-store",
      });
      if (!res.ok) throw new Error("ZOHO_AUTH_UNAVAILABLE");
      const data = (await res.json()) as ZohoTokenResponse;
      if (!data.access_token) throw new Error("ZOHO_AUTH_UNAVAILABLE");
      const seconds = Math.max(120, Number(data.expires_in) || 3600);
      tokenCache = { token: data.access_token, expiresAt: Date.now() + Math.max(60, seconds - 90) * 1000 };
      return data.access_token;
    })().finally(() => { tokenRefresh = null; });
  }
  return tokenRefresh;
}

export async function zohoRequest(path: string, init?: RequestInit) {
  if (!path.startsWith("/crm/")) throw new Error("Invalid Zoho CRM API path");
  const token = await getZohoAccessToken();
  const base = (process.env.ZOHO_BASE_URL || "https://www.zohoapis.in").replace(/\/+$/, "");
  const res = await fetch(base + path, {
    ...init,
    cache: "no-store",
    headers: { ...(init?.headers || {}), Authorization: "Zoho-oauthtoken " + token, "Content-Type": "application/json" },
  });
  if (res.status === 204) return { data: [], info: { more_records: false } };
  if (!res.ok) throw new Error("ZOHO_CRM_UNAVAILABLE");
  return res.json();
}

export async function createZohoCrmOrder(_payload: unknown) {
  // Deliberately disabled: transactional portal orders should not generate duplicate Zoho invoices.
  // Add an idempotent, approved workflow with a verified Sales_Orders field mapping first.
  throw new Error("ZOHO_ORDER_SYNC_NOT_IMPLEMENTED");
}
