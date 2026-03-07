"use client";

import { useEffect, useMemo } from "react";
import { Printer } from "lucide-react";

function safeParseNotes(notes: any) {
  if (!notes) return null;
  try {
    const obj = JSON.parse(String(notes));
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

function money(n: any) {
  const v = Number(n ?? 0);
  return Number.isFinite(v)
    ? v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";
}

function calcItemsTotalFallback(order: any) {
  if (order?.items?.length) {
    return order.items.reduce(
      (sum: number, it: any) => sum + Number(it?.qty || 0) * Number(it?.unitPrice || 0),
      0
    );
  }
  return 0;
}

function calcGrandTotalFallback(order: any, freight: any, insurance: any, discount: any, otherCharge: any) {
  const itemsTotal = calcItemsTotalFallback(order);
  return itemsTotal + Number(freight || 0) + Number(insurance || 0) + Number(otherCharge || 0) - Number(discount || 0);
}

function findSignatureDoc(order: any) {
  const docs: any[] = Array.isArray(order?.documents) ? order.documents : [];
  const kw = ["sign", "signature", "signed", "sig"];
  const has = (s: any) => {
    const t = String(s || "").toLowerCase();
    return kw.some((k) => t.includes(k));
  };
  return docs.find((d) => has(d?.title) || has(d?.name) || has(d?.fileName) || has(d?.url) || has(d?.type)) || null;
}

function getSignatureFromNotes(meta: any) {
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

export default function PrintClient({ order }: { order: any }) {
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
  const derivedGrandTotal = grandTotal ?? calcGrandTotalFallback(order, freight, insurance, discount, otherCharge);

  const { signerName, signatureDataUrl } = getSignatureFromNotes(meta);
  const sigDoc = findSignatureDoc(order);
  const signatureSrc = (sigDoc?.url || "") || signatureDataUrl || "";

  // strict 1-page fit
  const MAX_ITEMS = 12;
  const allItems = Array.isArray(order?.items) ? order.items : [];
  const visibleItems = allItems.slice(0, MAX_ITEMS);
  const hiddenCount = Math.max(0, allItems.length - visibleItems.length);

  useEffect(() => {
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100 flex justify-center print:bg-white">
      <style>{`
        @page { size: A4; margin: 0; }
        html, body { height: 100%; }
        @media print {
          header, nav, aside, footer, .no-print,
          [role="navigation"], [role="complementary"],
          .sidebar, .topbar, .app-header {
            display: none !important;
          }
          body { background: #fff !important; margin: 0 !important; }
          .sheet { box-shadow: none !important; border: none !important; border-radius: 0 !important; }
        }
        .sheet{
          width: 210mm;
          height: 297mm;
          background:#fff;
          overflow:hidden;
          border:1px solid #f1f1f1;
          box-shadow: 0 10px 24px rgba(0,0,0,0.08);
          border-radius: 12px;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, "SF Pro Text", "SF Pro Display", Arial;
        }
        .pad{ padding: 10mm 10mm; }
        .tiny{ font-size: 8px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color:#9CA3AF; }
        .sub{ font-size: 9.5px; font-weight: 600; color:#9CA3AF; }
        .h1{ font-size: 24px; font-weight: 900; letter-spacing:-0.02em; line-height:1; color:#0f172a; }
        .body{ font-size: 10px; font-weight: 500; color:#0f172a; }
        .divider{ border-bottom:1px solid #0f172a; }
        .rowhead { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: .16em; color:#9CA3AF; }
      `}</style>

      <div className="no-print fixed top-4 right-4 flex gap-2">
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

      <div className="sheet">
        <div className="pad">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[11px] font-black">
                CASADENZA <span className="text-zinc-400 font-semibold">DISTRIBUTION</span>
              </div>
              <div className="h1 mt-1">PURCHASE ORDER</div>
              <div className="sub">DISTRIBUTOR COPY</div>
            </div>

            <div className="text-right">
              <div className="tiny text-zinc-500">GRAND TOTAL</div>
              <div className="text-[22px] font-black text-zinc-400 leading-none">
                {currency} {money(derivedGrandTotal)}
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
                  <span className="text-zinc-900 font-extrabold tracking-normal">{poDate || "—"}</span>
                </div>
                {buyerPoRef ? (
                  <div className="tiny text-zinc-500">
                    BUYER PO:{" "}
                    <span className="text-zinc-900 font-extrabold tracking-normal">{buyerPoRef}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-3 divider" />

          <div className="grid grid-cols-3 gap-4 mt-3">
            <div>
              <div className="rowhead">Order</div>
              <div className="mt-1 space-y-1 body">
                <div>Type: <span className="font-semibold">{orderType || "—"}</span></div>
                <div>Incoterm: <span className="font-semibold">{incoterm || "—"}</span></div>
                <div>Delivery: <span className="font-semibold">{deliveryMethod || "—"}</span></div>
                <div>Port: <span className="font-semibold">{destinationPort || "—"}</span></div>
                <div>Dispatch: <span className="font-semibold">{requestedDispatchDate || "—"}</span></div>
                <div>Container: <span className="font-semibold">{containerType || "—"}</span></div>
                <div>Packing: <span className="font-semibold">{packingType || "—"}</span></div>
              </div>
            </div>

            <div>
              <div className="rowhead">Ship To</div>
              <div className="mt-1 space-y-1 body">
                <div className="font-semibold">{ship?.companyName || "—"}</div>
                <div>{ship?.contactName || ""}</div>
                <div>{ship?.phone || ""}</div>
                <div>{ship?.email || ""}</div>
                <div>
                  {[ship?.address1, ship?.address2, ship?.city, ship?.state, ship?.postal, ship?.country]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            </div>

            <div>
              <div className="rowhead">Billing / Notify</div>
              <div className="mt-1 space-y-1 body">
                <div className="font-semibold">{billing?.billingName || "—"}</div>
                <div>
                  {[billing?.billingLine1, billing?.billingLine2, billing?.billingCity, billing?.billingState, billing?.billingZip, billing?.billingCountry]
                    .filter(Boolean)
                    .join(", ")}
                </div>
                <div className="mt-2">Notify: <span className="font-semibold">{notify?.name || "—"}</span></div>
                <div>{notify?.contact || ""}</div>
              </div>
            </div>
          </div>

          <div className="mt-3 divider" />

          <div className="mt-3">
            <div className="rowhead">Items</div>
            <div className="mt-2 border border-zinc-200 rounded-lg overflow-hidden">
              <table className="w-full text-[10px]">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="text-left px-2 py-1">SKU / Product</th>
                    <th className="text-left px-2 py-1">Size</th>
                    <th className="text-right px-2 py-1">Qty</th>
                    <th className="text-right px-2 py-1">Unit Price</th>
                    <th className="text-right px-2 py-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((it: any) => (
                    <tr key={it.id} className="border-t">
                      <td className="px-2 py-1">
                        <span className="text-zinc-500">{it?.product?.sku || ""}</span>
                        <span className="ml-2">{it?.product?.name || "Item"}</span>
                      </td>
                      <td className="px-2 py-1">{it?.variant?.sizeLabel || "—"}</td>
                      <td className="px-2 py-1 text-right">{it?.qty}</td>
                      <td className="px-2 py-1 text-right">{currency} {money(it?.unitPrice)}</td>
                      <td className="px-2 py-1 text-right">{currency} {money(Number(it?.qty || 0) * Number(it?.unitPrice || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hiddenCount ? (
              <div className="tiny mt-1">+{hiddenCount} more items not shown (1-page print limit)</div>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-4 mt-3">
            <div className="col-span-2">
              <div className="rowhead">Signature</div>
              <div className="mt-2 body">Signer: <span className="font-semibold">{signerName || "—"}</span></div>
              {signatureSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={signatureSrc} alt="Signature" className="mt-2 h-16 w-full object-contain border border-zinc-200 rounded-lg" />
              ) : (
                <div className="tiny mt-2">No signature attached</div>
              )}
            </div>

            <div>
              <div className="rowhead">Totals</div>
              <div className="mt-2 space-y-1 body">
                <div className="flex justify-between"><span>Items</span><span>{currency} {money(derivedItemsTotal)}</span></div>
                <div className="flex justify-between"><span>Freight</span><span>{currency} {money(freight)}</span></div>
                <div className="flex justify-between"><span>Insurance</span><span>{currency} {money(insurance)}</span></div>
                <div className="flex justify-between"><span>Other</span><span>{currency} {money(otherCharge)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>- {currency} {money(discount)}</span></div>
                <div className="mt-2 divider" />
                <div className="flex justify-between font-semibold"><span>Grand Total</span><span>{currency} {money(derivedGrandTotal)}</span></div>
              </div>
            </div>
          </div>

          <div className="tiny mt-4">Generated: {new Date().toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
