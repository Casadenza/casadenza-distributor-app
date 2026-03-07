"use client";
import { useEffect, useMemo, useState } from "react";

type Product = { id: string; name: string; category: string; moq: number };
type PriceRow = { productId: string; unitPrice: number; currency: string };

export default function NewOrderPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceRow>>({});
  const [items, setItems] = useState<Array<{ productId: string; name: string; qty: number; unitPrice: number }>>([]);
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/products").then(r => r.json()), fetch("/api/pricing").then(r => r.json())])
      .then(([p, pr]) => {
        setProducts(p.items ?? []);
        const map: Record<string, PriceRow> = {};
        for (const row of (pr.items ?? [])) map[row.productId] = row;
        setPrices(map);
      })
      .catch(() => {});
  }, []);

  function addItem(productId: string) {
    const p = products.find(x => x.id === productId);
    if (!p) return;

    const pr = prices[productId];
    const unitPrice = pr?.unitPrice ?? 0;

    setItems((prev) => {
      // if already added, just increment qty
      const idx = prev.findIndex(i => i.productId === productId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { productId, name: p.name, qty: Math.max(1, p.moq), unitPrice }];
    });
  }

  const total = useMemo(() => items.reduce((s, i) => s + i.qty * i.unitPrice, 0), [items]);

  async function submit() {
    setMsg(null);
    if (!items.length) {
      setMsg("Please add at least one product.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          notes,
          items: items.map(i => ({ productId: i.productId, qty: Number(i.qty), unitPrice: Number(i.unitPrice) })),
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setMsg(d.error || "Failed");
        return;
      }
      window.location.href = "/orders";
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Place Order</h1>

      <div className="border rounded-2xl p-4 space-y-3">
        <div className="font-medium">Add Products</div>
        <select className="border rounded-lg p-2 w-full" onChange={(e) => addItem(e.target.value)} defaultValue="">
          <option value="" disabled>Select product</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={it.productId} className="border rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{it.name}</div>
                <button
                  className="text-xs border rounded-lg px-2 py-1 hover:bg-zinc-50"
                  onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  className="border rounded-lg p-2"
                  type="number"
                  min={1}
                  value={it.qty}
                  onChange={(e) => {
                    const v = Number(e.target.value || 1);
                    setItems(prev => prev.map((x, i) => i === idx ? { ...x, qty: v } : x));
                  }}
                  placeholder="Qty"
                />
                <input
                  className="border rounded-lg p-2"
                  type="number"
                  min={0}
                  value={it.unitPrice}
                  onChange={(e) => {
                    const v = Number(e.target.value || 0);
                    setItems(prev => prev.map((x, i) => i === idx ? { ...x, unitPrice: v } : x));
                  }}
                  placeholder="Unit Price"
                />
              </div>

              <div className="text-xs text-zinc-600 mt-2">
                Line Total: {(it.qty * it.unitPrice).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <textarea
          className="border rounded-lg p-2 w-full"
          placeholder="Order notes (packing/urgent/etc.)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="text-zinc-600">Total:</span> <span className="font-semibold">{total.toFixed(2)}</span>
          </div>
          <button className="bg-black text-white rounded-lg px-4 py-2 disabled:opacity-60" onClick={submit} disabled={busy}>
            {busy ? "Submitting..." : "Submit Order"}
          </button>
        </div>

        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </div>
    </div>
  );
}
