/**
 * Shipment email search is read-only: OAuth access is restricted to gmail.readonly.
 * The ChatGPT Gmail connections cannot be reused by the deployed portal.
 * Set the two mailbox refresh tokens in server-only Vercel environment variables.
 */
export type ShipmentMailbox = "info" | "alex";
type MailPart = {
  partId?: string;
  filename?: string;
  mimeType?: string;
  body?: { attachmentId?: string; data?: string; size?: number };
  parts?: MailPart[];
};
type GmailMessage = {
  id: string;
  threadId?: string;
  payload?: MailPart & { headers?: { name: string; value: string }[] };
  internalDate?: string;
  snippet?: string;
};
type ListResponse = { messages?: { id: string }[] };
type AttachmentResponse = { data?: string; size?: number };
type ProfileResponse = { emailAddress?: string };

export const MAX_SHIPMENT_PDF_BYTES = 10 * 1024 * 1024;
const mailboxes: Record<ShipmentMailbox, { address: string; env: "GMAIL_REFRESH_TOKEN_INFO" | "GMAIL_REFRESH_TOKEN_ALEX" }> = {
  info: { address: "info@casadenza.com", env: "GMAIL_REFRESH_TOKEN_INFO" },
  alex: { address: "alex@casadenza.in", env: "GMAIL_REFRESH_TOKEN_ALEX" },
};
const cache = new Map<ShipmentMailbox, { token: string; expires: number }>();

export function gmailMailboxStatus() {
  const client = !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET);
  return (Object.keys(mailboxes) as ShipmentMailbox[]).map((mailbox) => ({
    mailbox,
    address: mailboxes[mailbox].address,
    configured: client && !!process.env[mailboxes[mailbox].env],
  }));
}

function isMailbox(value: string): value is ShipmentMailbox {
  return value === "info" || value === "alex";
}
export function validMailbox(raw: unknown): ShipmentMailbox | null {
  return typeof raw === "string" && isMailbox(raw) ? raw : null;
}
function validMessageId(value: string) {
  return /^[A-Za-z0-9_-]{8,80}$/.test(value);
}
export function safeGmailMessageId(value: unknown): string | null {
  return typeof value === "string" && validMessageId(value) ? value : null;
}
function authError(label: string) {
  return new Error("GMAIL_" + label);
}

async function gmailGet<T>(token: string, path: string): Promise<T> {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/" + path, {
    headers: { Authorization: "Bearer " + token },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw authError("API_UNAVAILABLE");
  return await response.json() as T;
}

async function getAccessToken(mailbox: ShipmentMailbox): Promise<string> {
  const known = cache.get(mailbox);
  if (known && known.expires > Date.now()) return known.token;
  const clientId = process.env.GMAIL_CLIENT_ID;
  const secret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env[mailboxes[mailbox].env];
  if (!clientId || !secret || !refreshToken) throw authError("NOT_CONFIGURED");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId, client_secret: secret, refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw authError("TOKEN_REJECTED");
  const token: { access_token?: string; expires_in?: number } = await response.json();
  if (!token.access_token) throw authError("TOKEN_REJECTED");
  // Do not trust the env variable name: verify that this token belongs to its expected mailbox.
  const profile = await gmailGet<ProfileResponse>(token.access_token, "profile");
  if (profile.emailAddress?.toLowerCase() !== mailboxes[mailbox].address) {
    throw authError("MAILBOX_MISMATCH");
  }
  cache.set(mailbox, {
    token: token.access_token,
    expires: Date.now() + Math.max(30, (token.expires_in ?? 3600) - 90) * 1000,
  });
  return token.access_token;
}

function collectPdfParts(part: MailPart | undefined, output: { partId: string; filename: string; size: number }[] = []) {
  if (!part) return output;
  const name = part.filename?.trim() || "";
  if (name && /\.pdf$/i.test(name) && part.partId && (part.body?.attachmentId || part.body?.data)) {
    output.push({ partId: part.partId, filename: name.slice(0, 180), size: Number(part.body?.size || 0) });
  }
  for (const child of part.parts || []) collectPdfParts(child, output);
  return output;
}

export type ShipmentSearchResult = {
  mailbox: ShipmentMailbox;
  address: string;
  messageId: string;
  subject: string;
  from: string;
  date: string;
  attachments: { partId: string; filename: string; size: number }[];
};

export async function searchShipmentMailbox(mailbox: ShipmentMailbox, reference: string): Promise<ShipmentSearchResult[]> {
  const token = await getAccessToken(mailbox);
  // Quoted literal, not Gmail operators controlled by untrusted input.
  const literal = reference.replace(/[\r\n"\\]/g, " ").trim().replace(/\s+/g, " ");
  const q = '-in:trash -in:spam has:attachment "' + literal + '"';
  const params = new URLSearchParams({ q, maxResults: "15" });
  const response = await gmailGet<ListResponse>(token, "messages?" + params);
  const messages = await Promise.all((response.messages || []).slice(0, 15).map(async (m) => {
    if (!validMessageId(m.id)) return null;
    try {
      const full = await gmailGet<GmailMessage>(token, "messages/" + encodeURIComponent(m.id) + "?format=full");
      const attachments = collectPdfParts(full.payload);
      if (!attachments.length) return null;
      const headers = full.payload?.headers || [];
      const header = (name: string) => headers.find((h) => h.name.toLowerCase() === name)?.value || "";
      return {
        mailbox, address: mailboxes[mailbox].address, messageId: m.id,
        subject: header("subject").slice(0, 300),
        from: header("from").slice(0, 180),
        date: header("date").slice(0, 120),
        attachments,
      };
    } catch { return null; }
  }));
  return messages.filter((m): m is ShipmentSearchResult => m !== null);
}

function findPdfPart(part: MailPart | undefined, partId: string): MailPart | null {
  if (!part) return null;
  if (part.partId === partId && part.filename && /\.pdf$/i.test(part.filename)) return part;
  for (const p of part.parts || []) {
    const found = findPdfPart(p, partId);
    if (found) return found;
  }
  return null;
}

export async function readShipmentPdf(input: {
  mailbox: ShipmentMailbox; messageId: string; partId: string;
}): Promise<{ buffer: Buffer; filename: string; subject: string }> {
  if (!validMessageId(input.messageId) || !/^[A-Za-z0-9_.-]{1,50}$/.test(input.partId)) {
    throw authError("INVALID_DOCUMENT");
  }
  const token = await getAccessToken(input.mailbox);
  const message = await gmailGet<GmailMessage>(token, "messages/" + encodeURIComponent(input.messageId) + "?format=full");
  const part = findPdfPart(message.payload, input.partId);
  if (!part || !part.body) throw authError("DOCUMENT_NOT_FOUND");
  if (part.body.size && part.body.size > MAX_SHIPMENT_PDF_BYTES) throw authError("DOCUMENT_TOO_LARGE");
  let base64: string | undefined = part.body.data;
  if (!base64 && part.body.attachmentId) {
    const attachment = await gmailGet<AttachmentResponse>(
      token,
      "messages/" + encodeURIComponent(input.messageId) + "/attachments/" + encodeURIComponent(part.body.attachmentId),
    );
    if (attachment.size && attachment.size > MAX_SHIPMENT_PDF_BYTES) throw authError("DOCUMENT_TOO_LARGE");
    base64 = attachment.data;
  }
  if (!base64 || base64.length > Math.ceil(MAX_SHIPMENT_PDF_BYTES * 4 / 3) + 100) {
    throw authError("INVALID_DOCUMENT");
  }
  const buffer = Buffer.from(base64.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  if (!buffer.length || buffer.length > MAX_SHIPMENT_PDF_BYTES ||
      buffer.subarray(0, 5).toString("ascii") !== "%PDF-") throw authError("INVALID_DOCUMENT");
  const subject = message.payload?.headers?.find(h => h.name.toLowerCase() === "subject")?.value || "";
  return { buffer, filename: part.filename!.trim().slice(0, 180), subject: subject.slice(0, 300) };
}


export type OrderEmailCandidate = {
  messageId: string;
  mailbox: "alex";
  from: string;
  subject: string;
  date: string;
  snippet: string;
  pdfs: { partId: string; filename: string; size: number }[];
};

/** Read-only order intake. These are unverified leads, never portal orders. */
export async function searchAlexOrderInbox(): Promise<OrderEmailCandidate[]> {
  const token = await getAccessToken("alex");
  const params = new URLSearchParams({
    q: '-in:trash -in:spam newer_than:60d {subject:"purchase order" subject:"new order" subject:"PO received" subject:"PO" filename:po.pdf}',
    maxResults: "30",
  });
  const search = await gmailGet<ListResponse>(token, "messages?" + params);
  const messages = await Promise.all((search.messages || []).slice(0, 30).map(async ({ id }) => {
    if (!validMessageId(id)) return null;
    try {
      const data = await gmailGet<GmailMessage>(token, "messages/" + encodeURIComponent(id) + "?format=full");
      const headers = data.payload?.headers || [];
      const header = (name: string) => headers.find(h => h.name.toLowerCase() === name)?.value || "";
      return {
        messageId: id, mailbox: "alex" as const,
        from: header("from").slice(0, 240),
        subject: header("subject").slice(0, 300),
        date: header("date").slice(0, 120),
        snippet: (data.snippet || "").slice(0, 360),
        pdfs: collectPdfParts(data.payload),
      };
    } catch { return null; }
  }));
  return messages.filter((m): m is OrderEmailCandidate => m !== null);
}

/**
 * Read-only background intake candidate detection.
 * Returns Gmail metadata and attachment inventory, never creates a portal order
 * or publishes any document.
 */
export type IntakeMessage = {
  mailbox: ShipmentMailbox;
  messageId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  pdfs: { partId: string; filename: string; size: number }[];
};
export async function scanRecentMailbox(mailbox: ShipmentMailbox): Promise<IntakeMessage[]> {
  const token = await getAccessToken(mailbox);
  const q = mailbox === "info"
    ? '-in:spam -in:trash newer_than:21d has:attachment filename:pdf'
    : '-in:spam -in:trash newer_than:21d {subject:"purchase order" subject:"new order" subject:"PO" filename:pdf}';
  const list = await gmailGet<ListResponse>(token, "messages?" +
    new URLSearchParams({ q, maxResults: "35" }));
  const messages = await Promise.all((list.messages || []).slice(0, 35).map(async ({ id }) => {
    if (!validMessageId(id)) return null;
    try {
      const data = await gmailGet<GmailMessage>(token, "messages/" + encodeURIComponent(id) + "?format=full");
      const headers = data.payload?.headers || [];
      const header = (name: string) => headers.find(h => h.name.toLowerCase() === name)?.value || "";
      return {
        mailbox, messageId: id, subject: header("subject").slice(0, 300),
        from: header("from").slice(0, 250), date: header("date").slice(0, 140),
        snippet: (data.snippet || "").slice(0, 420),
        pdfs: collectPdfParts(data.payload),
      };
    } catch { return null; }
  }));
  return messages.filter((m): m is IntakeMessage => m !== null);
}
