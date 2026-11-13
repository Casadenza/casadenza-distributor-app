import { zohoRequest } from "@/lib/zoho";

export type ZohoRecord = {
  id: string;
  subject: string;
  date: string | null;
  status: string;
  currency: string;
  total: number;
  reference: string;
};
export type ZohoContact = { id: string; name: string; email: string | null; phone: string | null };
export type ZohoBusiness = {
  account: { id: string; name: string; country: string | null; currency: string | null };
  invoices: ZohoRecord[];
  proformas: ZohoRecord[];
  quotes: ZohoRecord[];
  deals: ZohoRecord[];
  contacts: ZohoContact[];
  invoicesComplete: boolean;
  invoicesOmittedByStatus: number;
  totals: Array<{ currency: string; invoiceValue: number; thisYearValue: number; invoiceCount: number }>;
  syncedAt: string;
};
function assertAccountId(value: string) {
  if (!/^\d{12,22}$/.test(value)) throw new Error("Invalid Zoho Account ID");
}
const toNumber = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const toText = (v: unknown) => String(v ?? "").trim();
type CoqlResult = { data?: Record<string, unknown>[]; info?: { more_records?: boolean } };

async function queryAccount(module: string, fields: string, accountId: string, maxPages = 4) {
  const results: Record<string, unknown>[] = [];
  let complete = true;
  for (let i = 0; i < maxPages; i++) {
    const sql = "select " + fields + " from " + module +
      " where Account_Name = " + accountId + " limit " + (i * 200) + ", 200";
    const data = await zohoRequest("/crm/v8/coql", {
      method: "POST", body: JSON.stringify({ select_query: sql }),
    }) as CoqlResult;
    results.push(...(data.data || []));
    const more = Boolean(data.info?.more_records);
    if (!more) break;
    if (i === maxPages - 1) complete = false;
  }
  return { data: results, complete };
}
function row(item: Record<string, unknown>, subjectKey: string, dateKey: string, statusKey: string, refKey: string, totalKey: string) : ZohoRecord {
  return {
    id: toText(item.id),
    subject: toText(item[subjectKey]),
    date: item[dateKey] ? toText(item[dateKey]) : null,
    status: toText(item[statusKey]),
    currency: toText(item.Currency || "INR").toUpperCase(),
    total: toNumber(item[totalKey]),
    reference: toText(item[refKey]),
  };
}
const voidStatuses = new Set(["VOID", "VOIDED", "CANCELLED", "CANCELED", "DELETED"]);
const trunc = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

export async function verifyZohoAccount(accountId: string) {
  assertAccountId(accountId);
  const data = await zohoRequest("/crm/v8/Accounts/" + accountId);
  const account = data?.data?.[0];
  if (!account || String(account.id) !== accountId) throw new Error("Zoho Account not found");
  return { id: accountId, name: toText(account.Account_Name) };
}
export async function getZohoBusiness(accountId: string): Promise<ZohoBusiness> {
  assertAccountId(accountId);
  const [accountResponse, invoiceResult, proformaResult, quoteResult, dealResult, contactResult] = await Promise.all([
    zohoRequest("/crm/v8/Accounts/" + accountId),
    queryAccount("Invoices", "id,Subject,Invoice_No,Invoice_Date,Grand_Total,Currency,Status", accountId, 15),
    queryAccount("Sales_Orders", "id,Subject,Purchase_Order,Due_Date,Grand_Total,Currency,Status", accountId),
    queryAccount("Quotes", "id,Subject,Quote_Stage,Valid_Till,Grand_Total,Currency", accountId),
    queryAccount("Deals", "id,Deal_Name,Closing_Date,Amount,Currency,Stage", accountId),
    queryAccount("Contacts", "id,Full_Name,Email,Phone", accountId),
  ]);
  const account = accountResponse?.data?.[0];
  if (!account || String(account.id) !== accountId) throw new Error("Zoho Account not found");
  const invoices = invoiceResult.data.map(x => row(x, "Subject", "Invoice_Date", "Status", "Invoice_No", "Grand_Total"));
  const proformas = proformaResult.data.map(x => row(x, "Subject", "Due_Date", "Status", "Purchase_Order", "Grand_Total"));
  const quotes = quoteResult.data.map(x => row(x, "Subject", "Valid_Till", "Quote_Stage", "Subject", "Grand_Total"));
  const deals = dealResult.data.map(x => row(x, "Deal_Name", "Closing_Date", "Stage", "Deal_Name", "Amount"));
  const contacts = contactResult.data.map(x => ({
    id: toText(x.id), name: toText(x.Full_Name), email: x.Email ? toText(x.Email) : null,
    phone: x.Phone ? toText(x.Phone) : null,
  }));
  const year = new Date().getUTCFullYear();
  const byCurrency = new Map<string, { currency: string; invoiceValue: number; thisYearValue: number; invoiceCount: number }>();
  let invoicesOmittedByStatus = 0;
  for (const invoice of invoices) {
    if (voidStatuses.has(invoice.status.toUpperCase())) {
      invoicesOmittedByStatus++;
      continue;
    }
    const currency = /^[A-Z]{3}$/.test(invoice.currency) ? invoice.currency : "INR";
    let total = byCurrency.get(currency);
    if (!total) {
      total = { currency, invoiceValue: 0, thisYearValue: 0, invoiceCount: 0 };
      byCurrency.set(currency, total);
    }
    total.invoiceValue += invoice.total;
    if (invoice.date?.startsWith(String(year))) total.thisYearValue += invoice.total;
    total.invoiceCount++;
  }
  return {
    account: {
      id: accountId, name: toText(account.Account_Name), country: account.Billing_Country ? toText(account.Billing_Country) : null,
      currency: account.Currency ? toText(account.Currency) : null,
    },
    invoices, proformas, quotes, deals, contacts,
    invoicesComplete: invoiceResult.complete,
    invoicesOmittedByStatus,
    totals: Array.from(byCurrency.values()).map(t => ({
      ...t, invoiceValue: trunc(t.invoiceValue), thisYearValue: trunc(t.thisYearValue),
    })).sort((a,b)=>a.currency.localeCompare(b.currency)),
    syncedAt: new Date().toISOString(),
  };
}
