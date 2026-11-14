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
      " where Account_Name = " + accountId + " order by id desc limit " + (i * 200) + ", 200";
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

/**
 * Exact financial totals are queried as Zoho COQL aggregates, not calculated
 * from a limited list of recent invoices. Never sum different currencies.
 */
async function getInvoiceAggregate(accountId: string, year?: number) {
  const status = "Status not in ('Void','Voided','Cancelled','Canceled','Deleted')";
  const base = "Account_Name = " + accountId;
  const date = year === undefined ? "" :
    " and ((Invoice_Date >= '" + year + "-01-01') and (Invoice_Date < '" + (year + 1) + "-01-01'))";
  const where = "((" + base + ") and ((" + status + ")" + date + "))";
  const query = "select SUM(Grand_Total), COUNT(id), Currency from Invoices where " +
    where + " group by Currency";
  const response = await zohoRequest("/crm/v8/coql", {
    method: "POST", body: JSON.stringify({ select_query: query }),
  });
  return (Array.isArray(response.data) ? response.data : []).map((item: any) => ({
    currency: toText(item.Currency || "INR").toUpperCase(),
    amount: toNumber(item["SUM(Grand_Total)"]),
    count: toNumber(item["COUNT(id)"]),
  }));
}

export async function verifyZohoAccount(accountId: string) {
  assertAccountId(accountId);
  const data = await zohoRequest("/crm/v8/Accounts/" + accountId);
  const account = data?.data?.[0];
  if (!account || String(account.id) !== accountId) throw new Error("Zoho Account not found");
  return { id: accountId, name: toText(account.Account_Name) };
}
export async function getZohoBusiness(accountId: string): Promise<ZohoBusiness> {
  assertAccountId(accountId);
  const year = new Date().getUTCFullYear();
  const [accountResponse, invoiceResult, proformaResult, quoteResult, dealResult, contactResult, aggregateAll, aggregateYear] = await Promise.all([
    zohoRequest("/crm/v8/Accounts/" + accountId),
    queryAccount("Invoices", "id,Subject,Invoice_No,Invoice_Date,Grand_Total,Currency,Status", accountId, 1),
    queryAccount("Sales_Orders", "id,Subject,Purchase_Order,Due_Date,Grand_Total,Currency,Status", accountId),
    queryAccount("Quotes", "id,Subject,Quote_Stage,Valid_Till,Grand_Total,Currency", accountId),
    queryAccount("Deals", "id,Deal_Name,Closing_Date,Amount,Currency,Stage", accountId),
    queryAccount("Contacts", "id,Full_Name,Email,Phone", accountId, 1),
    getInvoiceAggregate(accountId),
    getInvoiceAggregate(accountId, year),
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
  const yearValues = new Map<string, number>(
    aggregateYear.map((item: { currency: string; amount: number }) => [item.currency, item.amount])
  );
  const totals = aggregateAll.map((item: { currency: string; amount: number; count: number }) => ({
    currency: /^[A-Z]{3}$/.test(item.currency) ? item.currency : "INR",
    invoiceValue: trunc(item.amount),
    thisYearValue: trunc(yearValues.get(item.currency) || 0),
    invoiceCount: item.count,
  })).sort((a: {currency:string}, b: {currency:string}) => a.currency.localeCompare(b.currency));
  // The recent-list count is informational only; financial aggregates above are complete.
  const invoicesOmittedByStatus = invoices.filter(item => voidStatuses.has(item.status.toUpperCase())).length;
  return {
    account: {
      id: accountId, name: toText(account.Account_Name), country: account.Billing_Country ? toText(account.Billing_Country) : null,
      currency: account.Currency ? toText(account.Currency) : null,
    },
    invoices, proformas, quotes, deals, contacts,
    invoicesComplete: true,
    invoicesOmittedByStatus,
    totals,
    syncedAt: new Date().toISOString(),
  };
}
