"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, RefreshCw, Package, Truck, Calendar, CreditCard, FileSignature } from "lucide-react";

// ---------------- Types ----------------
type Product = { id: string; sku: string; name: string };

type PricingRow = {
  variant: { id: string; sizeLabel: string };
  product: { sku: string; name: string; collection: string; stoneType: string };
  price: {
    tier: string;
    currency: string;
    unitPrices: { SHEET: number | null; SQM: number | null; SQFT: number | null };
  };
};

type PricingResponse = {
  ok: boolean;
  distributor: { tier: string; country: string; allowedCurrencies: string[]; currency: string };
  rows: PricingRow[];
  error?: string;
};

type DistributorProfileResponse = {
  ok: boolean;
  distributor: {
    country?: string;
    billing: {
      billingName?: string;
      billingLine1?: string;
      billingLine2?: string;
      billingCity?: string;
      billingState?: string;
      billingZip?: string;
      billingCountry?: string;
    };
  };
};

type OrdersListResponse = { ok: boolean; items?: any[]; orders?: any[] };

// ---------------- Constants ----------------
const UNITS = ["SHEET", "SQM", "SQFT"] as const;
const ORDER_TYPES = ["Sample", "Trial", "Regular", "Project", "Repeat"] as const;
const INCOTERMS = ["EXW", "FOB", "CIF", "DAP", "DDP"] as const;
const DELIVERY = ["Sea", "Air", "Courier"] as const;
const CONTAINERS = ["20ft", "40ft", "LCL"] as const;
const PACKING = ["Pallet", "Crate", "Roll"] as const;

type Unit = (typeof UNITS)[number];

type Line = {
  collection: string;
  sku: string;
  productName: string;
  variantId: string;
  sizeLabel: string;
  unit: Unit;
  qty: number;
  unitPrice: number;
};

function money(n: any) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function safeJson(str: any) {
  if (!str) return {};
  try {
    const o = JSON.parse(String(str));
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("File read failed"));
    r.readAsDataURL(file);
  });
}

export default function PlaceOrderClient({ products }: { products: Product[] }) {
  // SKU -> productId
  const skuToProductId = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) m.set(String(p.sku).trim(), p.id);
    return m;
  }, [products]);

  // ---- Header / Identity ----
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState("");

  // ---- Pricing ----
  const [pricingRows, setPricingRows] = useState<PricingRow[]>([]);
  const [rowByVariantId, setRowByVariantId] = useState<Map<string, PricingRow>>(new Map());
  const [currency, setCurrency] = useState("USD");
  const [allowedCurrencies, setAllowedCurrencies] = useState<string[]>(["USD"]);
  const [loadingPricing, setLoadingPricing] = useState(false);

  // ---- Order fields ----
  const [buyerPoRef, setBuyerPoRef] = useState("");
  const [orderType, setOrderType] = useState<(typeof ORDER_TYPES)[number]>("Regular");
  const [repeatOrderId, setRepeatOrderId] = useState("");
  const [previousOrders, setPreviousOrders] = useState<any[]>([]);
  const [loadingRepeat, setLoadingRepeat] = useState(false);

  const [incoterm, setIncoterm] = useState<(typeof INCOTERMS)[number]>("FOB");
  const [deliveryMethod, setDeliveryMethod] = useState<(typeof DELIVERY)[number]>("Sea");
  const [containerType, setContainerType] = useState<"" | (typeof CONTAINERS)[number]>("20ft");
  const [packingType, setPackingType] = useState<(typeof PACKING)[number]>("Pallet");

  const [destinationPort, setDestinationPort] = useState("");
  const [requestedDispatchDate, setRequestedDispatchDate] = useState("");

  const [notifyParty, setNotifyParty] = useState({ name: "", contact: "" });

  // ---- Billing / Shipping ----
  const [billing, setBilling] = useState({
    billingName: "",
    billingLine1: "",
    billingLine2: "",
    billingCity: "",
    billingState: "",
    billingZip: "",
    billingCountry: "",
  });

  const [shipTo, setShipTo] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postal: "",
    country: "",
  });

  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(false);

  // ---- Notes + Totals ----
  const [notes, setNotes] = useState("");
  const [freight, setFreight] = useState(0);
  const [insurance, setInsurance] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [otherCharge, setOtherCharge] = useState(0);

  // ---- Signature ----
  const [signerName, setSignerName] = useState("");
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");
  const [signatureInfo, setSignatureInfo] = useState<string>("");

  // ---- Items ----
  const [lines, setLines] = useState<Line[]>([
    { collection: "All", sku: "", productName: "", variantId: "", sizeLabel: "", unit: "SHEET", qty: 1, unitPrice: 0 },
  ]);

  // ---- UI status ----
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // ---------------- Derived ----------------
  const itemsTotal = useMemo(() => lines.reduce((sum, l) => sum + Number(l.qty || 0) * Number(l.unitPrice || 0), 0), [lines]);
  const grandTotal = useMemo(
    () => itemsTotal + Number(freight || 0) + Number(insurance || 0) + Number(otherCharge || 0) - Number(discount || 0),
    [itemsTotal, freight, insurance, otherCharge, discount]
  );

  const collections = useMemo(() => {
    const s = new Set<string>();
    for (const r of pricingRows) if (r.product?.collection) s.add(r.product.collection);
    return ["All", ...Array.from(s).sort()];
  }, [pricingRows]);

  function rowsForCollection(collection: string) {
    if (collection === "All") return pricingRows;
    return pricingRows.filter((r) => r.product.collection === collection);
  }

  function skusForCollection(collection: string) {
    const rows = rowsForCollection(collection);
    return Array.from(new Set(rows.map((r) => r.product.sku))).sort();
  }

  function variantsForSku(collection: string, sku: string) {
    return rowsForCollection(collection).filter((r) => r.product.sku === sku);
  }

  function unitPriceForVariant(variantId: string, unit: Unit) {
    const row = rowByVariantId.get(variantId);
    const v = row?.price?.unitPrices?.[unit];
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  }

  function setLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function addLine() {
    setLines((p) => [
      ...p,
      { collection: "All", sku: "", productName: "", variantId: "", sizeLabel: "", unit: "SHEET", qty: 1, unitPrice: 0 },
    ]);
  }

  function removeLine(i: number) {
    setLines((p) => (p.length === 1 ? p : p.filter((_, idx) => idx !== i)));
  }

  // ---------------- Loaders ----------------
  async function loadNextPo() {
    const res = await fetch("/api/orders/next-po");
    const json = await res.json();
    if (res.ok && json?.ok) {
      setPoNumber(json.poNumber || "");
      setPoDate(json.poDate || "");
    }
  }

  async function loadPricing(cur: string) {
    setLoadingPricing(true);
    try {
      const res = await fetch(`/api/pricing?currency=${encodeURIComponent(cur)}`);
      const d: PricingResponse = await res.json();
      if (!res.ok || !d?.ok) throw new Error(d?.error || "Pricing load failed");

      setAllowedCurrencies(d.distributor?.allowedCurrencies || ["USD"]);
      setPricingRows(d.rows || []);

      const m = new Map<string, PricingRow>();
      for (const r of d.rows || []) m.set(r.variant.id, r);
      setRowByVariantId(m);

      // IMPORTANT: refresh all existing lines with latest distributor scheme pricing
      setLines((prev) =>
        prev.map((line) => {
          if (!line.variantId) return line;
          const row = m.get(line.variantId);
          const nextPrice = typeof row?.price?.unitPrices?.[line.unit] === "number" ? Number(row?.price?.unitPrices?.[line.unit] || 0) : 0;

          return {
            ...line,
            collection: row?.product?.collection || line.collection,
            sku: row?.product?.sku || line.sku,
            productName: row?.product?.name || line.productName,
            sizeLabel: row?.variant?.sizeLabel || line.sizeLabel,
            unitPrice: nextPrice,
          };
        })
      );
    } finally {
      setLoadingPricing(false);
    }
  }

  async function loadProfile() {
    const res = await fetch("/api/distributor/profile");
    const json: DistributorProfileResponse = await res.json();
    if (res.ok && json?.ok) {
      const b = json.distributor?.billing || {};
      setBilling((p) => ({
        ...p,
        billingName: b.billingName || "",
        billingLine1: b.billingLine1 || "",
        billingLine2: b.billingLine2 || "",
        billingCity: b.billingCity || "",
        billingState: b.billingState || "",
        billingZip: b.billingZip || "",
        billingCountry: b.billingCountry || "",
      }));

      if (!shipTo.country) {
        const c = json.distributor?.country || b.billingCountry || "";
        if (c) setShipTo((p) => ({ ...p, country: c }));
      }
    }
  }

  async function loadPreviousOrders() {
    setLoadingRepeat(true);
    try {
      const res = await fetch("/api/orders");
      const json: OrdersListResponse = await res.json();
      const list = (json as any)?.items || (json as any)?.orders || [];
      if (res.ok && json?.ok) setPreviousOrders(Array.isArray(list) ? list : []);
      else setPreviousOrders([]);
    } finally {
      setLoadingRepeat(false);
    }
  }

  // ---------------- Repeat apply ----------------
  function applyRepeatOrder(order: any) {
    const meta = safeJson(order?.notes);

    if (meta?.incoterm) setIncoterm(meta.incoterm);
    if (meta?.deliveryMethod) setDeliveryMethod(meta.deliveryMethod);
    if (meta?.containerType) setContainerType(meta.containerType);
    if (meta?.packingType) setPackingType(meta.packingType);
    if (meta?.destinationPort) setDestinationPort(meta.destinationPort || "");
    if (meta?.requestedDispatchDate) setRequestedDispatchDate(meta.requestedDispatchDate || "");

    if (meta?.notifyParty) setNotifyParty((p) => ({ ...p, ...(meta.notifyParty || {}) }));
    if (meta?.shipTo) setShipTo((p) => ({ ...p, ...(meta.shipTo || {}) }));

    if (typeof meta?.freight === "number") setFreight(meta.freight);
    if (typeof meta?.insurance === "number") setInsurance(meta.insurance);
    if (typeof meta?.discount === "number") setDiscount(meta.discount);
    if (typeof meta?.otherCharge === "number") setOtherCharge(meta.otherCharge);

    if (typeof meta?.notes === "string") setNotes(meta.notes);

    const itemsMeta = Array.isArray(meta?.itemsMeta) ? meta.itemsMeta : [];
    if (itemsMeta.length) {
      const newLines: Line[] = itemsMeta.map((it: any) => {
        const variantId = String(it.variantId || "");
        const r = rowByVariantId.get(variantId);
        const unit: Unit = (it.unit || "SHEET") as Unit;
        const collection = r?.product?.collection || "All";
        const sku = r?.product?.sku || "";
        const productName = r?.product?.name || "";
        const sizeLabel = r?.variant?.sizeLabel || "";
        const unitPrice = unitPriceForVariant(variantId, unit);

        return {
          collection,
          sku,
          productName,
          variantId,
          sizeLabel,
          unit,
          qty: Number(it.qty || 1),
          unitPrice,
        };
      });
      if (newLines.length) setLines(newLines);
      return;
    }

    const dbItems: any[] = Array.isArray(order?.items) ? order.items : [];
    if (dbItems.length) {
      const newLines: Line[] = dbItems.map((it: any) => {
        const variantId = String(it?.variantId || it?.variant?.id || "");
        const unit: Unit = (it?.unit || "SHEET") as Unit;
        const r = rowByVariantId.get(variantId);

        return {
          collection: r?.product?.collection || "All",
          sku: it?.product?.sku || r?.product?.sku || "",
          productName: it?.product?.name || r?.product?.name || "",
          variantId,
          sizeLabel: it?.variant?.sizeLabel || r?.variant?.sizeLabel || "",
          unit,
          qty: Number(it?.qty || 1),
          unitPrice: unitPriceForVariant(variantId, unit),
        };
      });
      setLines(newLines);
    }
  }

  async function onPickRepeat(id: string) {
    setRepeatOrderId(id);
    const found = previousOrders.find((o) => o.id === id);
    if (found) applyRepeatOrder(found);
  }

  // ---------------- Shipping same as billing ----------------
  useEffect(() => {
    if (!shippingSameAsBilling) return;
    setShipTo((p) => ({
      ...p,
      companyName: billing.billingName || p.companyName,
      address1: billing.billingLine1 || p.address1,
      address2: billing.billingLine2 || p.address2,
      city: billing.billingCity || p.city,
      state: billing.billingState || p.state,
      postal: billing.billingZip || p.postal,
      country: billing.billingCountry || p.country,
    }));
  }, [shippingSameAsBilling, billing]);

  useEffect(() => {
    if (deliveryMethod !== "Sea") setContainerType("");
    else if (!containerType) setContainerType("20ft");
  }, [deliveryMethod]);

  // ---------------- Initial load ----------------
  useEffect(() => {
    loadNextPo();
    loadProfile();
    loadPreviousOrders();
  }, []);

  useEffect(() => {
    loadPricing(currency);
  }, [currency]);

  // ---------------- Submit ----------------
  async function submit() {
    setSaving(true);
    setMsg(null);

    try {
      if (!shipTo.country || !shipTo.address1 || !shipTo.phone) {
        setMsg("❌ Shipping required: Country, Address 1, Phone");
        setSaving(false);
        return;
      }

      if (orderType === "Repeat" && !repeatOrderId) {
        setMsg("❌ Repeat order selected, please choose a previous order");
        setSaving(false);
        return;
      }

      const cleanItems = lines
        .filter((l) => l.variantId && l.sku && Number(l.qty) > 0)
        .map((l) => {
          const productId = skuToProductId.get(String(l.sku).trim()) || "";
          return {
            productId,
            variantId: l.variantId,
            unit: l.unit,
            qty: Number(l.qty),
            unitPrice: Number(l.unitPrice || 0),
          };
        })
        .filter((x) => x.productId);

      if (!cleanItems.length) {
        setMsg("❌ Add at least 1 item (SKU + Size)");
        setSaving(false);
        return;
      }

      const payload = {
        poNumber,
        poDate,
        buyerPoRef,
        orderType,
        repeatOrderId: orderType === "Repeat" ? repeatOrderId : null,

        currency,
        incoterm,
        deliveryMethod,
        containerType: deliveryMethod === "Sea" ? containerType : "",
        packingType,
        destinationPort,
        requestedDispatchDate,

        notifyParty,
        billing,
        shipTo,
        shippingSameAsBilling,

        notes,

        freight,
        insurance,
        discount,
        otherCharge,
        itemsTotal,
        grandTotal,

        items: cleanItems,

        itemsMeta: cleanItems.map((it: any) => ({
          variantId: it.variantId,
          unit: it.unit,
          qty: it.qty,
          unitPrice: it.unitPrice,
        })),

        signature: {
          signerName: signerName.trim() || undefined,
          dataUrl: signatureDataUrl || undefined,
        },
        signatureInfo: signatureInfo.trim() || undefined,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Order create failed");

      setMsg("✅ Order Submitted");
      setTimeout(() => setMsg(null), 2000);

      setLines([{ collection: "All", sku: "", productName: "", variantId: "", sizeLabel: "", unit: "SHEET", qty: 1, unitPrice: 0 }]);
      setBuyerPoRef("");
      setNotes("");
      setFreight(0);
      setInsurance(0);
      setDiscount(0);
      setOtherCharge(0);
      setSignerName("");
      setSignatureFile(null);
      setSignatureDataUrl("");
      setSignatureInfo("");
      setOrderType("Regular");
      setRepeatOrderId("");
      setShippingSameAsBilling(false);

      await loadNextPo();
      await loadPreviousOrders();
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Error"}`);
      setTimeout(() => setMsg(null), 2200);
    } finally {
      setSaving(false);
    }
  }

  // ---------------- UI ----------------
  return (
    <div className="bg-[#fcfcfc] min-h-screen pb-20 font-sans text-zinc-900">
      <div className="bg-white border-b border-zinc-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 bg-black rounded flex items-center justify-center text-white">
              <Package size={18} />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-bold tracking-[0.2em] uppercase">New Purchase Order</h1>
              <div className="text-[10px] text-zinc-400 font-bold tracking-widest">
                PO {poNumber || "—"} • {poDate || "—"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Grand Total</p>
              <p className="text-sm font-black">
                {currency} {money(grandTotal)}
              </p>
            </div>

            <button
              onClick={submit}
              disabled={saving}
              className="bg-black text-white px-6 py-2 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50"
            >
              {saving ? "Processing..." : "Submit Order"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-6">
        {msg ? (
          <div className="bg-white border border-zinc-100 rounded-xl px-4 py-3 text-xs font-semibold text-zinc-700 shadow-sm">
            {msg}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Section title="Order Identity" icon={<Calendar size={14} />}>
            <div className="grid grid-cols-2 gap-3">
              <ReadOnly label="PO Number" value={poNumber} />
              <ReadOnly label="PO Date" value={poDate} />

              <div className="col-span-2">
                <Field label="Buyer PO Reference" value={buyerPoRef} onChange={setBuyerPoRef} placeholder="Customer internal PO" />
              </div>

              <div className="col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Order Type</Label>
                  <button
                    type="button"
                    onClick={loadPreviousOrders}
                    className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-700 inline-flex items-center gap-1"
                  >
                    <RefreshCw size={12} /> Refresh
                  </button>
                </div>

                <select
                  value={orderType}
                  onChange={(e) => {
                    const v = e.target.value as any;
                    setOrderType(v);
                    if (v !== "Repeat") setRepeatOrderId("");
                  }}
                  className="w-full h-9 text-xs bg-zinc-50 border border-zinc-100 rounded px-3 outline-none focus:border-black transition-all"
                >
                  {ORDER_TYPES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>

                <div className={`mt-2 ${orderType === "Repeat" ? "" : "opacity-50 pointer-events-none"}`}>
                  <Label>Repeat From</Label>
                  <select
                    value={repeatOrderId}
                    disabled={orderType !== "Repeat" || loadingRepeat}
                    onChange={(e) => onPickRepeat(e.target.value)}
                    className="w-full h-9 text-xs bg-zinc-50 border border-zinc-100 rounded px-3 outline-none focus:border-black transition-all"
                  >
                    <option value="">Select previous order</option>
                    {previousOrders.map((o) => {
                      const meta = safeJson(o?.notes);
                      const label = meta?.poNumber ? `PO ${meta.poNumber}` : `Order ${String(o.id).slice(-6)}`;
                      return (
                        <option key={o.id} value={o.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Commercial Terms" icon={<Truck size={14} />}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Currency</Label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-9 text-xs bg-zinc-50 border border-zinc-100 rounded px-3 outline-none focus:border-black transition-all"
                >
                  {allowedCurrencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Incoterm</Label>
                <select
                  value={incoterm}
                  onChange={(e) => setIncoterm(e.target.value as any)}
                  className="w-full h-9 text-xs bg-zinc-50 border border-zinc-100 rounded px-3 outline-none focus:border-black transition-all"
                >
                  {INCOTERMS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Delivery</Label>
                <select
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value as any)}
                  className="w-full h-9 text-xs bg-zinc-50 border border-zinc-100 rounded px-3 outline-none focus:border-black transition-all"
                >
                  {DELIVERY.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Container</Label>
                <select
                  value={containerType}
                  onChange={(e) => setContainerType(e.target.value as any)}
                  disabled={deliveryMethod !== "Sea"}
                  className="w-full h-9 text-xs bg-zinc-50 border border-zinc-100 rounded px-3 outline-none focus:border-black transition-all disabled:opacity-50"
                >
                  <option value="">—</option>
                  {CONTAINERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Packing</Label>
                <select
                  value={packingType}
                  onChange={(e) => setPackingType(e.target.value as any)}
                  className="w-full h-9 text-xs bg-zinc-50 border border-zinc-100 rounded px-3 outline-none focus:border-black transition-all"
                >
                  {PACKING.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <Field label="Destination Port" value={destinationPort} onChange={setDestinationPort} />
              <Field label="Requested Dispatch Date" value={requestedDispatchDate} onChange={setRequestedDispatchDate} placeholder="YYYY-MM-DD" />
            </div>
          </Section>

          <Section title="Notify Party" icon={<Truck size={14} />}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" value={notifyParty.name} onChange={(v: any) => setNotifyParty((p) => ({ ...p, name: v }))} />
              <Field label="Contact" value={notifyParty.contact} onChange={(v: any) => setNotifyParty((p) => ({ ...p, contact: v }))} />
            </div>
          </Section>
        </div>

        <Section title="Order Items" icon={<Package size={14} />}>
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              <div className="col-span-2">Collection</div>
              <div className="col-span-2">SKU</div>
              <div className="col-span-3">Size</div>
              <div className="col-span-1">Unit</div>
              <div className="col-span-1 text-right">Qty</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {lines.map((l, i) => {
              const skuList = skusForCollection(l.collection);
              const variants = l.sku ? variantsForSku(l.collection, l.sku) : [];

              return (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    value={l.collection}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLine(i, { collection: v, sku: "", variantId: "", sizeLabel: "", productName: "", unitPrice: 0 });
                    }}
                    className="col-span-2 h-9 text-xs bg-zinc-50 border border-zinc-100 rounded px-3 outline-none focus:border-black"
                  >
                    {collections.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <select
                    value={l.sku}
                    onChange={(e) => {
                      const sku = e.target.value;
                      setLine(i, {
                        sku,
                        variantId: "",
                        sizeLabel: "",
                        productName: "",
                        unitPrice: 0,
                      });
                    }}
                    className="col-span-2 h-9 text-xs bg-zinc-50 border border-zinc-100 rounded px-3 outline-none focus:border-black"
                  >
                    <option value="">Select SKU</option>
                    {skuList.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <select
                    value={l.variantId}
                    onChange={(e) => {
                      const variantId = e.target.value;
                      const r = rowByVariantId.get(variantId);
                      const sizeLabel = r?.variant?.sizeLabel || "";
                      const productName = r?.product?.name || "";
                      const nextPrice = unitPriceForVariant(variantId, l.unit);

                      setLine(i, {
                        variantId,
                        sizeLabel,
                        productName,
                        unitPrice: nextPrice,
                      });
                    }}
                    className="col-span-3 h-9 text-xs bg-zinc-50 border border-zinc-100 rounded px-3 outline-none focus:border-black"
                    disabled={!l.sku}
                  >
                    <option value="">Select Size</option>
                    {variants.map((r) => (
                      <option key={r.variant.id} value={r.variant.id}>
                        {r.variant.sizeLabel}
                      </option>
                    ))}
                  </select>

                  <select
                    value={l.unit}
                    onChange={(e) => {
                      const unit = e.target.value as Unit;
                      const nextPrice = l.variantId ? unitPriceForVariant(l.variantId, unit) : 0;
                      setLine(i, { unit, unitPrice: nextPrice });
                    }}
                    className="col-span-1 h-9 text-xs bg-zinc-50 border border-zinc-100 rounded px-3 outline-none focus:border-black"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    value={l.qty}
                    onChange={(e) => setLine(i, { qty: Number(e.target.value || 0) })}
                    className="col-span-1 h-9 text-xs bg-zinc-50 border border-zinc-100 rounded px-3 outline-none focus:border-black text-right"
                    min={1}
                  />

                  <input
                    type="number"
                    value={l.unitPrice}
                    readOnly
                    className="col-span-2 h-9 text-xs bg-zinc-50 border border-zinc-100 rounded px-3 outline-none text-right text-zinc-700 cursor-not-allowed"
                    title="Unit Price is auto-applied from your distributor pricing scheme"
                  />

                  <div className="col-span-1 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      className="h-9 w-9 rounded bg-white border border-zinc-100 hover:border-zinc-300 flex items-center justify-center"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-black"
              >
                <Plus size={14} /> Add Line
              </button>

              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                {loadingPricing ? "Loading pricing..." : ""}
              </div>
            </div>
          </div>
        </Section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Section title="Billing" icon={<CreditCard size={14} />}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Billing Name" value={billing.billingName} onChange={(v: any) => setBilling((p) => ({ ...p, billingName: v }))} />
              <Field label="Country" value={billing.billingCountry} onChange={(v: any) => setBilling((p) => ({ ...p, billingCountry: v }))} />

              <div className="col-span-2">
                <Field label="Address 1" value={billing.billingLine1} onChange={(v: any) => setBilling((p) => ({ ...p, billingLine1: v }))} />
              </div>
              <div className="col-span-2">
                <Field label="Address 2" value={billing.billingLine2} onChange={(v: any) => setBilling((p) => ({ ...p, billingLine2: v }))} />
              </div>

              <Field label="City" value={billing.billingCity} onChange={(v: any) => setBilling((p) => ({ ...p, billingCity: v }))} />
              <Field label="State" value={billing.billingState} onChange={(v: any) => setBilling((p) => ({ ...p, billingState: v }))} />
              <Field label="Postal" value={billing.billingZip} onChange={(v: any) => setBilling((p) => ({ ...p, billingZip: v }))} />
            </div>
          </Section>

          <Section title="Shipping" icon={<Truck size={14} />}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ship To</div>
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                <input
                  type="checkbox"
                  checked={shippingSameAsBilling}
                  onChange={(e) => setShippingSameAsBilling(e.target.checked)}
                  className="h-4 w-4"
                />
                Billing = Shipping
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Company" value={shipTo.companyName} onChange={(v: any) => setShipTo((p) => ({ ...p, companyName: v }))} />
              <Field label="Contact" value={shipTo.contactName} onChange={(v: any) => setShipTo((p) => ({ ...p, contactName: v }))} />
              <Field label="Email" value={shipTo.email} onChange={(v: any) => setShipTo((p) => ({ ...p, email: v }))} />
              <Field label="Phone *" value={shipTo.phone} onChange={(v: any) => setShipTo((p) => ({ ...p, phone: v }))} />

              <div className="col-span-2">
                <Field label="Address 1 *" value={shipTo.address1} onChange={(v: any) => setShipTo((p) => ({ ...p, address1: v }))} />
              </div>
              <div className="col-span-2">
                <Field label="Address 2" value={shipTo.address2} onChange={(v: any) => setShipTo((p) => ({ ...p, address2: v }))} />
              </div>

              <Field label="City" value={shipTo.city} onChange={(v: any) => setShipTo((p) => ({ ...p, city: v }))} />
              <Field label="State" value={shipTo.state} onChange={(v: any) => setShipTo((p) => ({ ...p, state: v }))} />
              <Field label="Postal" value={shipTo.postal} onChange={(v: any) => setShipTo((p) => ({ ...p, postal: v }))} />
              <Field label="Country *" value={shipTo.country} onChange={(v: any) => setShipTo((p) => ({ ...p, country: v }))} />
            </div>
          </Section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Section title="Notes & Signature" icon={<FileSignature size={14} />}>
            <div className="space-y-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-24 bg-zinc-50 border border-zinc-200 rounded p-3 text-xs outline-none focus:border-black transition-all"
                placeholder="Additional instructions..."
              />

              <div className="grid grid-cols-2 gap-3">
                <Field label="Signer Name" value={signerName} onChange={setSignerName} placeholder="Optional" />
                <div>
                  <Label>Signature Upload</Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0] || null;
                      setSignatureFile(f);
                      if (!f) {
                        setSignatureDataUrl("");
                        return;
                      }
                      const dataUrl = await fileToDataUrl(f);
                      setSignatureDataUrl(dataUrl);
                      setSignatureInfo(f.name || "");
                    }}
                    className="w-full text-xs"
                  />
                </div>

                <div className="col-span-2">
                  <Field
                    label="Signature Info"
                    value={signatureInfo}
                    onChange={setSignatureInfo}
                    placeholder="Optional note about signature"
                  />
                </div>

                {signatureDataUrl ? (
                  <div className="col-span-2 bg-white border border-zinc-100 rounded-xl p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={signatureDataUrl} alt="Signature preview" className="h-20 w-full object-contain" />
                  </div>
                ) : null}
              </div>
            </div>
          </Section>

          <Section title="Final Calculation" icon={<CreditCard size={14} />}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="flex justify-between items-center text-xs text-zinc-500 col-span-2">
                <span>Items Subtotal</span>
                <span>
                  {currency} {money(itemsTotal)}
                </span>
              </div>

              <NumberField label="Freight" value={freight} onChange={setFreight} />
              <NumberField label="Insurance" value={insurance} onChange={setInsurance} />
              <NumberField label="Discount" value={discount} onChange={setDiscount} />
              <NumberField label="Other" value={otherCharge} onChange={setOtherCharge} />

              <div className="col-span-2 h-[1px] bg-zinc-100 my-2" />

              <div className="col-span-2 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total Payable</span>
                <span className="text-xl font-black">
                  {currency} {money(grandTotal)}
                </span>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

// ---------------- UI Components ----------------
function Section({ title, icon, children }: any) {
  return (
    <div className="bg-white border border-zinc-100 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4 border-b border-zinc-50 pb-2">
        <span className="text-zinc-400">{icon}</span>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Label({ children }: any) {
  return <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">{children}</div>;
}

function Field({ label, value, onChange, placeholder }: any) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 text-xs bg-zinc-50 border border-zinc-100 rounded px-3 outline-none focus:border-black transition-all"
      />
    </div>
  );
}

function NumberField({ label, value, onChange }: any) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        className="w-full h-9 text-xs bg-zinc-50 border border-zinc-100 rounded px-3 outline-none focus:border-black transition-all"
      />
    </div>
  );
}

function ReadOnly({ label, value }: any) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="w-full h-9 text-xs bg-white border border-zinc-100 rounded px-3 flex items-center text-zinc-700">
        {value || "—"}
      </div>
    </div>
  );
}