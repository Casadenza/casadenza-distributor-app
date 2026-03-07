/**
 * Zoho CRM ONLY integration stub.
 * You'll need to create a custom module in Zoho CRM (recommended): "Distributor_Orders"
 * OR use an existing custom module for orders.
 *
 * This file includes helpers for OAuth token + calling Zoho.
 * Mapping is left as TODO because field names depend on your Zoho CRM setup.
 */

type ZohoTokenResponse = { access_token: string; expires_in: number };

export async function getZohoAccessToken(): Promise<string> {
  const params = new URLSearchParams({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN || "",
    client_id: process.env.ZOHO_CLIENT_ID || "",
    client_secret: process.env.ZOHO_CLIENT_SECRET || "",
    grant_type: "refresh_token",
  });

  const res = await fetch("https://accounts.zoho.com/oauth/v2/token?" + params.toString(), {
    method: "POST",
  });
  if (!res.ok) throw new Error("Zoho token refresh failed");
  const data = (await res.json()) as ZohoTokenResponse;
  return data.access_token;
}

export async function zohoRequest(path: string, init?: RequestInit) {
  const token = await getZohoAccessToken();
  const base = process.env.ZOHO_BASE_URL || "https://www.zohoapis.com";

  const res = await fetch(base + path, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Zoho request failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * TODO: Implement Zoho CRM create order once module is finalized.
 * Example:
 *  - Create module "Distributor_Orders" with fields: Distributor, Items(JSON), Notes, Status, ETA
 *  - Then call:
 *      POST /crm/v2/Distributor_Orders
 */
export async function createZohoCrmOrder(_payload: any) {
  throw new Error("Not implemented. Please finalize Zoho CRM module + field names.");
}
