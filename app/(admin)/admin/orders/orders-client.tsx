"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Search,
  PenLine,
  Image as ImageIcon,
  Printer,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

const STATUSES = [
  "RECEIVED",
  "CONFIRMED",
  "IN_PRODUCTION",
  "PACKED",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
] as const;

type FilterStatus = "ALL" | (typeof STATUSES)[number];

function cn(...a: Array<string | undefined | null | false>) {
  return a.filter(Boolean).join(" ");
}

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
  const v = Number(n || 0);
  return Number.isFinite(v) ? v.toFixed(2) : "0.00";
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

function calcGrandTotalFallback(
  order: any,
  freight: any,
  insurance: any,
  discount: any,
  otherCharge: any
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

function findSignatureDoc(order: any) {
  const docs: any[] = Array.isArray(order?.documents) ? order.documents : [];
  const kw = ["sign", "signature", "signed", "sig"];
  const has = (s: any) => {
    const t = String(s || "").toLowerCase();
    return kw.some((k) => t.includes(k));
  };
  return docs.find((d) => has(d?.title) || has(d?.name) || has(d?.fileName) || has(d?.url)) || null;
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

function statusPill(status: string) {
  switch (status) {
    case "RECEIVED":
      return "bg-[#EEF1F6] text-[#2C3E5B]";
    case "CONFIRMED":
      return "bg-[#EEF0FF] text-[#2C2D6B]";
    case "IN_PRODUCTION":
      return "bg-[#FFF3D8] text-[#6B4E00]";
    case "DISPATCHED":
      return "bg-[#E9F8EF] text-[#0F5132]";
    case "CANCELLED":
      return "bg-[#FFE6EA] text-[#7A1D2B]";
    default:
      return "bg-[#F0EDE8] text-[#6B665C]";
  }
}

function statusAccentBar(status: string) {
  switch (status) {
    case "RECEIVED":
      return "bg-slate-500";
    case "CONFIRMED":
      return "bg-indigo-600";
    case "IN_PRODUCTION":
      return "bg-amber-500";
    case "DISPATCHED":
      return "bg-emerald-600";
    case "CANCELLED":
      return "bg-rose-600";
    default:
      return "bg-zinc-400";
  }
}

function startOfDayTs(dateStr: string) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function endOfDayTs(dateStr: string) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

export default function OrdersAdminClient({
  initialItems,
  userRole,
}: {
  initialItems: any[];
  userRole?: string;
}) {
  const [items, setItems] = useState<any[]>(initialItems || []);
  const [q, setQ] = useState("");

  const [fStatus, setFStatus] = useState<FilterStatus>("ALL");
  const [fDistributor, setFDistributor] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [savingId, setSavingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const canManageOrders = userRole === "ADMIN" || userRole === "ORDER_ADMIN";

  const distributorOptions = useMemo(() => {
    const set = new Set<string>();
    for (const o of items) {
      const name = String(o?.distributor?.companyName || o?.distributor?.name || "").trim();
      if (name) set.add(name);
    }
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const fromTs = startOfDayTs(dateFrom);
    const toTs = endOfDayTs(dateTo);

    return items.filter((o) => {
      const meta = safeParseNotes(o.notes) || {};
      const createdTs = new Date(o?.createdAt || 0).getTime();
      const distName = String(o?.distributor?.companyName || o?.distributor?.name || "").trim();

      if (fStatus !== "ALL" && String(o.status) !== fStatus) return false;
      if (fDistributor !== "ALL" && distName !== fDistributor) return false;
      if (fromTs !== null && createdTs < fromTs) return false;
      if (toTs !== null && createdTs > toTs) return false;

      if (!s) return true;

      const id = String(o.id || "").toLowerCase();
      const status = String(o.status || "").toLowerCase();

      const po = String(meta?.poNumber || "").toLowerCase();
      const buyerPo = String(meta?.buyerPoRef || "").toLowerCase();
      const orderType = String(meta?.orderType || "").toLowerCase();

      const incoterm = String(meta?.incoterm || "").toLowerCase();
      const delivery = String(meta?.deliveryMethod || "").toLowerCase();
      const port = String(meta?.destinationPort || "").toLowerCase();
      const shipName = String(meta?.shipTo?.companyName || meta?.shipTo?.contactName || "").toLowerCase();

      const { signerName } = getSignatureFromNotes(meta);
      const signer = String(signerName || "").toLowerCase();

      return (
        distName.toLowerCase().includes(s) ||
        id.includes(s) ||
        status.includes(s) ||
        po.includes(s) ||
        buyerPo.includes(s) ||
        orderType.includes(s) ||
        incoterm.includes(s) ||
        delivery.includes(s) ||
        port.includes(s) ||
        shipName.includes(s) ||
        signer.includes(s)
      );
    });
  }, [items, q, fStatus, fDistributor, dateFrom, dateTo]);

  async function updateOrder(id: string, patch: { status?: string; eta?: string | null }) {
    if (!canManageOrders) return;
    setSavingId(id);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setItems((prev) => prev.map((o) => (o.id === id ? { ...o, ...json.order } : o)));
    } finally {
      setSavingId(null);
    }
  }

  function toggle(id: string) {
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
  }

  function onPrint(id: string) {
    window.open(`/admin/orders/print/${id}`, "_blank", "noopener,noreferrer");
  }

  function resetFilters() {
    setQ("");
    setFStatus("ALL");
    setFDistributor("ALL");
    setDateFrom("");
    setDateTo("");
  }

  function refreshLikePrices() {
    window.location.reload();
  }

  const premiumFont =
    "font-[ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display','Inter','Geist',Segoe_UI,Roboto,Helvetica,Arial]";

  return (
    <div className={cn("space-y-4 text-[#1A1A1A]", premiumFont, "[-webkit-font-smoothing:antialiased]")}>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] font-normal text-[#A39E93] uppercase tracking-wide">
            Admin / Orders
          </div>
          <div className="text-[16px] font-semibold text-[#1A1A1A] tracking-tight">
            {userRole === "ORDER_ADMIN" ? "Order Hub" : "Orders"}
          </div>
        </div>

        <div className="text-[10px] font-normal uppercase text-[#A39E93]">
          Showing {filtered.length}
        </div>
      </div>

      <div className="sticky top-[64px] z-[60]">
        <div className="bg-[#FAF9F6] border border-[#EAE7E2] rounded-2xl p-3 flex flex-wrap items-center gap-4 shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3 border-r pr-4 border-[#EAE7E2]">
            <MiniSelect
              label="Status"
              value={fStatus}
              onChange={(v) => setFStatus(v as any)}
              options={["ALL", ...STATUSES]}
            />
            <MiniSelect
              label="Distributor"
              value={fDistributor}
              onChange={setFDistributor}
              options={distributorOptions}
            />
            <MiniDate label="From" value={dateFrom} onChange={setDateFrom} />
            <MiniDate label="To" value={dateTo} onChange={setDateTo} />
          </div>

          <div className="relative flex-1 max-w-[340px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A39E93]" />
            <input
              className={cn(
                "w-full bg-white border border-[#EAE7E2] rounded-xl pl-9 pr-3 py-2",
                "text-[12px] font-normal text-[#1A1A1A] outline-none",
                "focus:border-[#C5A267] focus:ring-2 focus:ring-[#C5A267]/25"
              )}
              placeholder="Search PO / Distributor / Port..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <button
            onClick={refreshLikePrices}
            className="ml-auto p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-[#EAE7E2]"
            title="Refresh"
          >
            <RefreshCw size={15} className="text-[#A39E93]" />
          </button>

          <button
            onClick={resetFilters}
            className="px-3 py-2 bg-white border border-[#EAE7E2] rounded-xl text-[10px] font-normal text-[#6B665C] hover:bg-[#1A1A1A] hover:text-white transition-all shadow-sm"
            title="Reset"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#EAE7E2] rounded-2xl overflow-hidden shadow-sm">
        <div
          className={cn(
            "max-h-[calc(100vh-220px)] overflow-y-auto overscroll-contain",
            "divide-y divide-[#F0EDE8] [scrollbar-gutter:stable]",
            "[&::-webkit-scrollbar]:w-2",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:bg-[#EAE7E2]",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
            "hover:[&::-webkit-scrollbar-thumb]:bg-[#D9D4CC]"
          )}
        >
          {filtered.map((o) => {
            const meta = safeParseNotes(o.notes) || {};

            const currency = meta?.currency || "";
            const poNumber = meta?.poNumber || "";
            const poDate = meta?.poDate || "";
            const buyerPoRef = meta?.buyerPoRef || "";
            const orderType = meta?.orderType || "";

            const incoterm = meta?.incoterm || "";
            const deliveryMethod = meta?.deliveryMethod || "";
            const destinationPort = meta?.destinationPort || "";

            const dispatchDate = meta?.requestedDispatchDate || "";
            const containerType = meta?.containerType || "";
            const packingType = meta?.packingType || "";

            const notify = meta?.notifyParty || {};
            const notifyName = notify?.name || "";
            const notifyContact = notify?.contact || "";

            const billing = meta?.billing || {};
            const billingFallback = {
              billingName: o?.distributor?.billingName,
              billingLine1: o?.distributor?.billingLine1,
              billingLine2: o?.distributor?.billingLine2,
              billingCity: o?.distributor?.billingCity,
              billingState: o?.distributor?.billingState,
              billingZip: o?.distributor?.billingZip,
              billingCountry: o?.distributor?.billingCountry,
            };

            const ship = meta?.shipTo || {};

            const freight = meta?.freight ?? 0;
            const insurance = meta?.insurance ?? 0;
            const discount = meta?.discount ?? 0;
            const otherCharge = meta?.otherCharge ?? 0;

            const itemsTotal = meta?.itemsTotal ?? null;
            const grandTotal = meta?.grandTotal ?? null;

            const derivedItemsTotal = itemsTotal ?? calcItemsTotalFallback(o);
            const derivedGrandTotal =
              grandTotal ?? calcGrandTotalFallback(o, freight, insurance, discount, otherCharge);

            const { signerName, signatureDataUrl } = getSignatureFromNotes(meta);
            const signatureInfo = meta?.signatureInfo || "";
            const sigDoc = findSignatureDoc(o);
            const signatureSrc = (sigDoc?.url || "") || signatureDataUrl || "";
            const hasSignature = !!signatureSrc;

            const isOpen = !!expanded[o.id];
            const saving = savingId === o.id;

            const distributorName = String(o?.distributor?.companyName || o?.distributor?.name || "Distributor");

            return (
              <div key={o.id} className="relative">
                <div
                  className={cn(
                    "absolute left-0 top-0 h-full w-[3px]",
                    statusAccentBar(String(o.status || ""))
                  )}
                />

                <div className="pl-4 pr-4 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-[260px]">
                      <div className="text-[9px] font-normal text-[#A39E93] uppercase tracking-wide">
                        {distributorName}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="text-[13px] font-semibold text-[#1A1A1A] tracking-tight">
                          {poNumber ? `PO ${poNumber}` : `Order #${String(o.id).slice(-6)}`}
                        </div>

                        <span
                          className={cn(
                            "px-2 py-[3px] rounded-full text-[9px] font-normal uppercase tracking-wide",
                            statusPill(String(o.status || ""))
                          )}
                        >
                          {String(o.status || "—").replaceAll("_", " ")}
                        </span>

                        <span
                          className={cn(
                            "px-2 py-[3px] rounded-full text-[9px] font-normal uppercase tracking-wide",
                            hasSignature ? "bg-[#E9F8EF] text-[#0F5132]" : "bg-[#F0EDE8] text-[#6B665C]"
                          )}
                        >
                          <span className="inline-flex items-center gap-1">
                            <PenLine size={12} />
                            {hasSignature ? "Signed" : "Unsigned"}
                          </span>
                        </span>
                      </div>

                      <div className="text-[10px] text-[#A39E93] font-normal mt-0.5">
                        {poDate ? `Date: ${poDate}` : "—"}
                        {buyerPoRef ? ` • Buyer PO: ${buyerPoRef}` : ""}
                        {destinationPort ? ` • Port: ${destinationPort}` : ""}
                        {orderType ? ` • Type: ${orderType}` : ""}
                      </div>

                      <div className="text-[10px] text-[#A39E93] font-normal uppercase mt-1 tracking-wide">
                        {incoterm ? `${incoterm} • ` : ""}
                        {deliveryMethod ? `${deliveryMethod}` : ""}
                      </div>

                      {signerName ? (
                        <div className="text-[10px] text-[#6B665C] font-normal mt-1">
                          Signed by <span className="text-[#1A1A1A] font-medium">{signerName}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[8px] font-normal text-[#A39E93] uppercase tracking-wide">Total</div>
                        <div className="text-[13px] font-semibold text-[#1A1A1A]">
                          {currency} {money(derivedGrandTotal)}
                        </div>
                        <div className="text-[10px] text-[#A39E93] font-normal">
                          Items {currency} {money(derivedItemsTotal)}
                        </div>
                      </div>

                      <button
                        onClick={() => onPrint(o.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#EAE7E2] rounded-lg text-[10px] font-normal text-[#6B665C] hover:bg-[#1A1A1A] hover:text-white transition-all shadow-sm"
                        title="Print PO"
                      >
                        <Printer size={12} /> Print
                      </button>

                      <button
                        onClick={() => toggle(o.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#EAE7E2] rounded-lg text-[10px] font-normal text-[#6B665C] hover:bg-[#C5A267] hover:text-white transition-all shadow-sm"
                        title="View"
                      >
                        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {isOpen ? "Hide" : "View"}
                      </button>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "grid transition-all duration-250 ease-out",
                      isOpen ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0 mt-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <Panel title="Order Details">
                          <Row k="Order Type" v={orderType || "-"} />
                          <Row k="Buyer PO Ref" v={buyerPoRef || "-"} />
                          <Row k="Incoterm" v={incoterm || "-"} />
                          <Row k="Delivery" v={deliveryMethod || "-"} />
                          <Row k="Destination Port" v={destinationPort || "-"} />
                          <Row k="Dispatch Date" v={dispatchDate || "-"} />
                          <Row k="Container" v={containerType || "-"} />
                          <Row k="Packing" v={packingType || "-"} />
                        </Panel>

                        <Panel title="Billing">
                          <div className="text-[12px] font-medium text-[#1A1A1A]">
                            {billing?.billingName || billingFallback.billingName || "-"}
                          </div>
                          <div className="text-[11px] text-[#A39E93] font-normal mt-1">
                            {[
                              billing?.billingLine1 || billingFallback.billingLine1,
                              billing?.billingLine2 || billingFallback.billingLine2,
                              billing?.billingCity || billingFallback.billingCity,
                              billing?.billingState || billingFallback.billingState,
                              billing?.billingZip || billingFallback.billingZip,
                              billing?.billingCountry || billingFallback.billingCountry,
                            ]
                              .filter(Boolean)
                              .join(", ") || "-"}
                          </div>
                        </Panel>

                        <Panel title="Shipping">
                          <div className="text-[12px] font-medium text-[#1A1A1A]">{ship.companyName || "-"}</div>
                          <div className="text-[11px] text-[#A39E93] font-normal mt-1 space-y-1">
                            <div>{ship.contactName || "-"}</div>
                            <div>{ship.email || "-"}</div>
                            <div>{ship.phone || "-"}</div>
                            <div>
                              {[ship.address1, ship.address2, ship.city, ship.state, ship.postal, ship.country]
                                .filter(Boolean)
                                .join(", ") || "-"}
                            </div>
                          </div>
                        </Panel>

                        <Panel title="Notify Party">
                          <Row k="Name" v={notifyName || "-"} />
                          <Row k="Contact" v={notifyContact || "-"} />
                        </Panel>

                        <Panel title="Totals">
                          <Row k="Freight" v={`${currency} ${money(freight)}`} />
                          <Row k="Insurance" v={`${currency} ${money(insurance)}`} />
                          <Row k="Discount" v={`- ${currency} ${money(discount)}`} />
                          <Row k="Other" v={`${currency} ${money(otherCharge)}`} />
                          <div className="mt-2 border-t border-[#F0EDE8] pt-2 space-y-2">
                            <Row k="Items Total" v={`${currency} ${money(derivedItemsTotal)}`} />
                            <div className="flex items-start justify-between gap-6">
                              <span className="text-[11px] text-[#A39E93] font-normal">Grand Total</span>
                              <span className="text-[12px] font-semibold text-[#1A1A1A] text-right">
                                {currency} {money(derivedGrandTotal)}
                              </span>
                            </div>
                          </div>
                        </Panel>

                        <Panel title="Status / ETA">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[11px] text-[#A39E93] font-normal">Status</span>
                            <select
                              value={o.status}
                              disabled={saving || !canManageOrders}
                              onChange={(e) => updateOrder(o.id, { status: e.target.value })}
                              className="bg-white border border-[#EAE7E2] rounded-lg px-2 py-1 text-[11px] font-normal uppercase outline-none cursor-pointer focus:border-[#C5A267] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="mt-3">
                            <div className="text-[8px] font-normal text-[#A39E93] uppercase tracking-wide">ETA</div>
                            <input
                              defaultValue={o.eta || ""}
                              disabled={saving || !canManageOrders}
                              placeholder="YYYY-MM-DD"
                              onBlur={(e) => updateOrder(o.id, { eta: e.target.value || null })}
                              className="mt-1 w-full bg-white border border-[#EAE7E2] rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#C5A267] font-normal disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                          </div>
                        </Panel>

                        <div className="lg:col-span-3 bg-white border border-[#EAE7E2] rounded-2xl overflow-hidden shadow-sm">
                          <div className="px-4 py-3 bg-[#FAF9F6] border-b border-[#F0EDE8]">
                            <div className="text-[9px] font-normal text-[#A39E93] uppercase tracking-widest">
                              Items
                            </div>
                          </div>

                          <div className="px-4 py-2">
                            <div className="grid grid-cols-8 gap-2 text-[9px] font-normal text-[#A39E93] uppercase tracking-widest border-b border-[#F0EDE8] pb-2">
                              <div>SKU</div>
                              <div className="col-span-2">Product</div>
                              <div>Variant</div>
                              <div>Unit</div>
                              <div className="text-right">Qty</div>
                              <div className="text-right">Unit Price</div>
                              <div className="text-right">Line Total</div>
                            </div>

                            <div className="divide-y divide-[#F0EDE8]">
                              {(o.items || []).map((it: any, idx: number) => {
                                const notesMeta = safeParseNotes(o.notes) || {};
                                const unitFromMeta = notesMeta?.itemsMeta?.[idx]?.unit || "-";

                                const sku = it?.product?.sku || "-";
                                const name = it?.product?.name || "-";
                                const variant = it?.variant?.sizeLabel || "-";
                                const qty = Number(it?.qty || 0);
                                const unitPrice = Number(it?.unitPrice || 0);

                                return (
                                  <div key={idx} className="grid grid-cols-8 gap-2 py-2 text-[12px] text-[#6B665C]">
                                    <div className="font-mono text-[11px] font-medium text-[#1A1A1A]">{sku}</div>
                                    <div className="col-span-2 font-medium text-[#1A1A1A]">{name}</div>
                                    <div className="text-[#A39E93] font-normal">{variant}</div>
                                    <div className="text-[#A39E93] font-normal">{unitFromMeta}</div>
                                    <div className="text-right font-medium text-[#1A1A1A]">{qty}</div>
                                    <div className="text-right font-normal">{money(unitPrice)}</div>
                                    <div className="text-right font-medium text-[#1A1A1A]">
                                      {money(qty * unitPrice)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {(!o.items || o.items.length === 0) && (
                              <div className="text-[12px] text-[#A39E93] font-normal py-3">No items found.</div>
                            )}
                          </div>
                        </div>

                        <Panel className="lg:col-span-3" title="Notes">
                          <div className="text-[12px] text-[#6B665C] font-normal whitespace-pre-wrap">
                            {meta?.notes ? String(meta.notes) : "-"}
                          </div>
                        </Panel>

                        <div className="lg:col-span-3 bg-[#FAF9F6] border border-[#EAE7E2] rounded-2xl p-2 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="text-[9px] font-normal text-[#A39E93] uppercase tracking-widest">
                              Signature Verification
                            </div>
                            <div className="flex items-center gap-2 text-[9px] font-normal uppercase text-[#6B665C]">
                              <ShieldCheck size={14} className="text-[#C5A267]" /> Verified
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                            <div className="md:col-span-1 bg-white border border-[#EAE7E2] rounded-xl p-2">
                              <div className="text-[8px] font-normal text-[#A39E93] uppercase tracking-wide">
                                Signer
                              </div>
                              <div className="text-[12px] font-medium text-[#1A1A1A] mt-1">
                                {signerName || "—"}
                              </div>
                            </div>

                            <div className="md:col-span-3 bg-white border border-[#EAE7E2] rounded-xl p-2">
                              <div className="flex items-center gap-2 text-[8px] font-normal text-[#A39E93] uppercase tracking-wide">
                                <ImageIcon size={12} /> Signature
                              </div>

                              {signatureSrc ? (
                                <div className="mt-2 relative">
                                  <div className="pointer-events-none absolute right-2 top-2 text-[9px] font-normal uppercase text-[#C5A267]/25 tracking-widest">
                                    VERIFIED
                                  </div>
                                  <img
                                    src={signatureSrc}
                                    alt="Signature"
                                    className="h-[90px] w-full rounded-lg border border-[#F0EDE8] bg-white object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="mt-2 text-[11px] text-[#A39E93] font-normal">
                                  Signature not found.
                                </div>
                              )}

                              {signatureInfo ? (
                                <div className="mt-2 text-[11px] text-[#A39E93] font-normal whitespace-pre-wrap">
                                  {signatureInfo}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-4 text-[12px] text-[#A39E93] font-normal">No orders found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[8px] font-normal text-[#A39E93] uppercase tracking-wide">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[11px] font-normal uppercase outline-none cursor-pointer text-[#1A1A1A]"
      >
        {options.map((t) => (
          <option key={t} value={t}>
            {t.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </div>
  );
}

function MiniDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[8px] font-normal text-[#A39E93] uppercase tracking-wide">{label}</span>
      <div className="relative">
        <CalendarDays size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A39E93]" />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-white border border-[#EAE7E2] rounded-lg pl-7 pr-2 py-1 text-[11px] font-normal uppercase outline-none focus:border-[#C5A267] w-[140px]"
        />
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-white border border-[#EAE7E2] rounded-2xl p-3 shadow-sm", className)}>
      <div className="text-[9px] font-normal text-[#A39E93] uppercase tracking-widest mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <span className="text-[11px] text-[#A39E93] font-normal">{k}</span>
      <span className="text-[11px] font-medium text-[#1A1A1A] text-right">{v}</span>
    </div>
  );
}