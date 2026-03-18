"use client";

import { useEffect, useMemo } from "react";
import { Printer } from "lucide-react";

type OrderItem = {
  qty?: number | string;
  unitPrice?: number | string;
  product?: {
    name?: string;
    sku?: string;
  } | null;
  variant?: {
    sizeLabel?: string;
  } | null;
};

type OrderDocument = {
  title?: string;
  name?: string;
  fileName?: string;
  url?: string;
};

type AnyObject = Record<string, any>;

function safeParseNotes(notes: unknown): AnyObject | null {
  if (!notes) return null;
  try {
    const obj = JSON.parse(String(notes));
    return obj && typeof obj === "object" ? (obj as AnyObject) : null;
  } catch {
    return null;
  }
}

function money(n: unknown) {
  const v = Number(n ?? 0);
  return Number.isFinite(v)
    ? v.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";
}

function calcItemsTotalFallback(order: AnyObject) {
  const items: OrderItem[] = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) return 0;

  return items.reduce((sum: number, it: OrderItem) => {
    return sum + Number(it?.qty || 0) * Number(it?.unitPrice || 0);
  }, 0);
}

function calcGrandTotalFallback(
  order: AnyObject,
  freight: unknown,
  insurance: unknown,
  discount: unknown,
  otherCharge: unknown
) {
  const itemsTotal = calcItemsTotalFallback(order);
  return (
    itemsTotal +
    Number(freight || 0) +
    Number(insurance || 0) +
    Number(otherCharge || 0) -
    Number(discount || 0)
  );
}

function findSignatureDoc(order: AnyObject) {
  const docs: OrderDocument[] = Array.isArray(order?.documents) ? order.documents : [];
  const kw = ["sign", "signature", "signed", "sig"];

  const has = (s: unknown) => {
    const t = String(s || "").toLowerCase();
    return kw.some((k) => t.includes(k));
  };

  return (
    docs.find(
      (d: OrderDocument) =>
        has(d?.title) || has(d?.name) || has(d?.fileName) || has(d?.url)
    ) || null
  );
}

function getSignatureFromNotes(meta: AnyObject) {
  const signerName =
    meta?.signerName ||
    meta?.signatureName ||
    meta?.signature?.signerName ||
    meta?.meta?.signerName ||
    meta?.meta?.signatureName ||
    meta?.meta?.signature?.signerName ||
    "";

  const signatureDataUrl =
    meta?.signatureDataUrl ||
    meta?.signatureImage ||
    meta?.signature?.dataUrl ||
    meta?.meta?.signatureDataUrl ||
    meta?.meta?.signatureImage ||
    meta?.meta?.signature?.dataUrl ||
    "";

  return { signerName, signatureDataUrl };
}

function paginateItems(items: OrderItem[]) {
  const firstCap = 14;
  const middleCap = 18;
  const lastCap = 14;

  if (items.length <= firstCap) return [items];

  const pages: OrderItem[][] = [];
  let index = 0;

  pages.push(items.slice(index, index + firstCap));
  index += firstCap;

  while (index < items.length) {
    const remaining = items.length - index;

    if (remaining <= lastCap) {
      pages.push(items.slice(index));
      break;
    }

    if (remaining <= middleCap + lastCap) {
      const currentTake = remaining - lastCap;
      pages.push(items.slice(index, index + currentTake));
      index += currentTake;
      pages.push(items.slice(index));
      break;
    }

    pages.push(items.slice(index, index + middleCap));
    index += middleCap;
  }

  return pages;
}

export default function PrintClient({ order }: { order: AnyObject }) {
  const meta = useMemo(() => safeParseNotes(order?.notes) || {}, [order?.notes]);

  const currency = meta?.currency || "";
  const poNumber = meta?.poNumber || "";
  const poDate = meta?.poDate || "";
  const buyerPoRef = meta?.buyerPoRef || "";

  const orderType = meta?.orderType || "";
  const incoterm = meta?.incoterm || "";
  const deliveryMethod = meta?.deliveryMethod || "";
  const destinationPort = meta?.destinationPort || "";
  const requestedDispatchDate = meta?.requestedDispatchDate || "";

  const containerType = meta?.containerType || "";
  const packingType = meta?.packingType || "";

  const ship = meta?.shipTo || {};
  const billing = meta?.billing || {};
  const notify = meta?.notifyParty || {};

  const freight = Number(meta?.freight ?? 0);
  const insurance = Number(meta?.insurance ?? 0);
  const discount = Number(meta?.discount ?? 0);
  const otherCharge = Number(meta?.otherCharge ?? 0);

  const itemsTotal = meta?.itemsTotal ?? null;
  const grandTotal = meta?.grandTotal ?? null;

  const derivedItemsTotal = itemsTotal ?? calcItemsTotalFallback(order);
  const derivedGrandTotal =
    grandTotal ??
    calcGrandTotalFallback(order, freight, insurance, discount, otherCharge);

  const { signerName, signatureDataUrl } = getSignatureFromNotes(meta);
  const sigDoc = findSignatureDoc(order);
  const signatureSrc = (sigDoc?.url || "") || signatureDataUrl || "";

  const allItems: OrderItem[] = Array.isArray(order?.items) ? order.items : [];
  const itemPages = useMemo(() => paginateItems(allItems), [allItems]);
  const totalPages = itemPages.length;

  useEffect(() => {
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col items-center print:bg-white">
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }

        html, body {
          height: 100%;
        }

        * {
          box-sizing: border-box;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          header, nav, aside, footer, .no-print,
          [role="navigation"], [role="complementary"],
          .admin-sidebar, .admin-header, .sidebar, .topbar, .app-header {
            display: none !important;
          }

          .page-stack {
            display: block !important;
            width: 210mm !important;
            padding: 0 !important;
            margin: 0 auto !important;
          }

          .sheet {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .pad {
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            padding: 8mm 10mm !important;
          }

          .footer-block,
          .summary-block,
          .signature-block,
          .table-row,
          .items-table {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }

        .page-stack {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 14px 0;
        }

        .sheet {
          width: 210mm;
          height: 297mm;
          min-height: 297mm;
          max-height: 297mm;
          background: #fff;
          overflow: hidden;
          border: 1px solid #f1f1f1;
          box-shadow: 0 10px 24px rgba(0,0,0,0.08);
          border-radius: 12px;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, "SF Pro Text", "SF Pro Display", Arial;
        }

        .pad {
          height: 297mm;
          min-height: 297mm;
          max-height: 297mm;
          padding: 8mm 10mm;
          display: flex;
          flex-direction: column;
        }

        .tiny {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: #9CA3AF;
        }

        .sub {
          font-size: 9px;
          font-weight: 600;
          color: #9CA3AF;
        }

        .h1 {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1;
          color: #0f172a;
        }

        .bold {
          font-size: 10px;
          font-weight: 800;
          color: #0f172a;
        }

        .body {
          font-size: 9.5px;
          font-weight: 500;
          color: #0f172a;
        }

        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }

        .divider {
          border-bottom: 1px solid #0f172a;
        }

        .rowhead {
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .12em;
          color: #9CA3AF;
        }

        .items-wrap {
          flex: 1 1 auto;
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .items-table {
          flex: 1 1 auto;
          overflow: hidden;
        }

        .table-row {
          min-height: 29px;
        }

        .footer-block {
          flex: 0 0 auto;
          margin-top: 8px;
        }
      `}</style>

      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-black text-white px-3 py-2 rounded-lg text-[11px] font-semibold shadow"
        >
          <Printer size={14} />
          Print
        </button>
        <button
          onClick={() => window.close()}
          className="bg-white px-3 py-2 rounded-lg text-[11px] font-semibold border"
        >
          Close
        </button>
      </div>

      <div className="page-stack">
        {itemPages.map((pageItems, pageIndex) => {
          const isFirstPage = pageIndex === 0;
          const isLastPage = pageIndex === totalPages - 1;

          return (
            <div key={pageIndex} className="sheet">
              <div className="pad">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[11px] font-black">
                      CASADENZA <span className="text-zinc-400 font-semibold">DISTRIBUTION</span>
                    </div>
                    <div className="h1 mt-1">
                      {isFirstPage ? "PURCHASE ORDER" : "PURCHASE ORDER"}
                    </div>
                    <div className="sub">
                      {isFirstPage
                        ? "OFFICIAL DISTRIBUTOR GENERATED ORDER"
                        : "CONTINUED ITEM SCHEDULE"}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="tiny text-zinc-500">
                      {isFirstPage ? "GRAND TOTAL" : "PO REFERENCE"}
                    </div>
                    <div className="text-[22px] font-black text-zinc-400 leading-none">
                      {isFirstPage
                        ? `${currency} ${money(derivedGrandTotal)}`
                        : poNumber || String(order?.id || "").slice(-8)}
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="tiny text-zinc-500">
                        PO REF:{" "}
                        <span className="text-zinc-900 font-extrabold tracking-normal">
                          {poNumber || String(order?.id || "").slice(-8)}
                        </span>
                      </div>
                      <div className="tiny text-zinc-500">
                        DATE:{" "}
                        <span className="text-zinc-900 font-extrabold tracking-normal">
                          {poDate || "—"}
                        </span>
                      </div>
                      {buyerPoRef ? (
                        <div className="tiny text-zinc-500">
                          BUYER PO:{" "}
                          <span className="text-zinc-900 font-extrabold tracking-normal">
                            {buyerPoRef}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="divider mt-3" />

                {isFirstPage ? (
                  <>
                    <div className="grid grid-cols-3 gap-5 mt-4">
                      <div>
                        <div className="tiny">DISTRIBUTOR</div>
                        <div className="bold mt-1.5 uppercase">{order?.distributor?.name || "—"}</div>
                        <div className="body mt-1 text-zinc-700">{order?.distributor?.email || ""}</div>
                      </div>

                      <div>
                        <div className="tiny">CONSIGNEE / SHIP TO</div>
                        <div className="bold mt-1.5 uppercase">{ship.companyName || ship.contactName || "—"}</div>
                        <div className="body mt-1 text-zinc-700">
                          {[ship.address1, ship.address2, ship.city, ship.state, ship.postal, ship.country]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="tiny">BILLING DETAILS</div>
                        <div className="bold mt-1.5 uppercase">{billing.billingName || "—"}</div>
                        <div className="body mt-1 text-zinc-700">
                          {[
                            billing.billingLine1,
                            billing.billingLine2,
                            billing.billingCity,
                            billing.billingState,
                            billing.billingZip,
                            billing.billingCountry,
                          ]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 bg-zinc-50 border border-zinc-100 rounded-xl p-3">
                      <div className="grid grid-cols-4 gap-y-3 gap-x-4">
                        <KV label="ORDER TYPE" value={orderType} />
                        <KV label="INCOTERM" value={incoterm} />
                        <KV label="DISPATCH DATE" value={requestedDispatchDate} />
                        <KV label="PORT OF ENTRY" value={destinationPort} />
                        <KV label="DELIVERY MODE" value={deliveryMethod} />
                        <KV label="CONTAINER" value={containerType} />
                        <KV label="PACKING" value={packingType} />
                        <KV label="NOTIFY PARTY" value={notify?.name || "N/A"} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 bg-zinc-50 border border-zinc-100 rounded-xl p-3">
                    <div className="grid grid-cols-4 gap-y-3 gap-x-4">
                      <KV label="DISTRIBUTOR" value={order?.distributor?.name || "—"} />
                      <KV label="CONSIGNEE" value={ship.companyName || ship.contactName || "—"} />
                      <KV label="CURRENCY" value={currency || "—"} />
                      <KV label="PAGE" value={`${pageIndex + 1} / ${totalPages}`} />
                    </div>
                  </div>
                )}

                <div className="items-wrap mt-4">
                  <div className="grid grid-cols-[1fr_70px_110px_110px] pb-2 border-b border-zinc-100 rowhead">
                    <div>DESCRIPTION &amp; SKU</div>
                    <div className="text-center">QTY</div>
                    <div className="text-right">UNIT PRICE</div>
                    <div className="text-right">AMOUNT</div>
                  </div>

                  <div className="items-table divide-y divide-zinc-50">
                    {pageItems.map((it: OrderItem, i: number) => {
                      const name = it?.product?.name || "-";
                      const sku = it?.product?.sku || "-";
                      const size = it?.variant?.sizeLabel || "-";
                      const qty = Number(it?.qty || 0);
                      const unitPrice = Number(it?.unitPrice || 0);
                      const amount = qty * unitPrice;

                      return (
                        <div
                          key={`${pageIndex}-${i}`}
                          className="table-row grid grid-cols-[1fr_70px_110px_110px] py-2"
                        >
                          <div>
                            <div className="text-[11px] font-black text-zinc-900 uppercase leading-tight">
                              {name}
                            </div>
                            <div className="text-[9px] text-zinc-500 font-semibold">
                              SKU: <span className="mono text-zinc-700">{sku}</span> • {size}
                            </div>
                          </div>
                          <div className="text-center body">{qty}</div>
                          <div className="text-right text-[10px] text-zinc-600 font-semibold">
                            {money(unitPrice)}
                          </div>
                          <div className="text-right text-[12px] font-black text-zinc-900 italic">
                            {money(amount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="footer-block">
                  {isLastPage ? (
                    <div className="summary-block mt-3 flex justify-between items-end">
                      <div className="signature-block w-[48%]">
                        <div className="h-[32px] flex items-end">
                          {signatureSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={signatureSrc}
                              alt="Signature"
                              className="h-full w-auto object-contain opacity-90"
                            />
                          ) : (
                            <div className="text-[9px] text-zinc-400 font-semibold">—</div>
                          )}
                        </div>

                        <div className="mt-1.5 border-t border-zinc-100 pt-1.5 w-[200px]">
                          <div className="text-[9px] font-black uppercase tracking-widest text-zinc-900">
                            AUTHORIZED SIGNATORY
                          </div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                            {signerName || "SYSTEM VERIFIED"}
                          </div>
                        </div>
                      </div>

                      <div className="w-[42%]">
                        <div className="border-t border-zinc-100 pt-2 space-y-1.5">
                          <RightLine label="ITEMS TOTAL" value={`${currency} ${money(derivedItemsTotal)}`} />
                          <RightLine label="FREIGHT" value={`${currency} ${money(freight)}`} />
                          <RightLine label="INSURANCE" value={`${currency} ${money(insurance)}`} />
                          <RightLine label="OTHER" value={`${currency} ${money(otherCharge)}`} />
                          <RightLine label="DISCOUNT" value={`- ${currency} ${money(discount)}`} />

                          <div className="flex items-end justify-between pt-1.5">
                            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 italic">
                              NET PAYABLE
                            </div>
                            <div className="text-[18px] font-black text-zinc-900 italic tracking-tight">
                              {currency} {money(derivedGrandTotal)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-zinc-100 flex justify-between items-center">
                      <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                        Continued on next page
                      </div>
                      <div className="text-[10px] font-black text-zinc-900">
                        Running Items: {Math.min(pageItems.length + itemPages.slice(0, pageIndex).reduce((s, p) => s + p.length, 0), allItems.length)} / {allItems.length}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-end justify-between text-[9px] font-black uppercase tracking-widest text-zinc-400">
                    <div>PO • {poNumber || String(order?.id || "").slice(-8)}</div>
                    <div>PAGE {pageIndex + 1} OF {totalPages}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="leading-none">
      <div className="text-[8px] font-black uppercase tracking-widest text-zinc-300">{label}</div>
      <div className="text-[10px] font-black uppercase tracking-tight text-zinc-900 mt-1">
        {value ? String(value) : "—"}
      </div>
    </div>
  );
}

function RightLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <div className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{label}</div>
      <div className="text-[10px] font-black text-zinc-900">{value}</div>
    </div>
  );
}