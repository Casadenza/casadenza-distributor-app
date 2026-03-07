"use client";

import { useEffect, useMemo, useState } from "react";

type VariantRow = {
  id: string; // variantId
  sizeLabel: string;
  product: {
    sku: string;
    name: string;
    collection: string;
    stoneType: string | null;
    thicknessMm: number | null;
  };
};

const TIERS = ["STANDARD", "GOLD", "PLATINUM"];
const CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY"];
const COLLECTIONS = ["All", "Fusion", "Lumina", "Eco Fusion", "Eco Lumina", "3D Fusion"];

export default function AdminPricesPage() {
  const [tier, setTier] = useState("STANDARD");
  const [currency, setCurrency] = useState("USD");
  const [collection, setCollection] = useState("All");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [values, setValues] = useState<
    Record<string, { priceSheet: string; priceSqm: string; priceSqft: string }>
  >({});

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (collection !== "All") params.set("collection", collection);
      if (q.trim()) params.set("q", q.trim());

      const res = await fetch(`/api/admin/variants?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) return alert(json?.error || "Failed to load variants");
      setRows(json.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => rows, [rows]);

  function setField(variantId: string, key: "priceSheet" | "priceSqm" | "priceSqft", v: string) {
    setValues((prev) => ({
      ...prev,
      [variantId]: {
        ...(prev[variantId] || {
          priceSheet: "",
          priceSqm: "",
          priceSqft: "",
        }),
        [key]: v,
      },
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const items = filtered.map((r) => ({
        variantId: r.id,
        priceSheet: values[r.id]?.priceSheet ?? "",
        priceSqm: values[r.id]?.priceSqm ?? "",
        priceSqft: values[r.id]?.priceSqft ?? "",
      }));

      const res = await fetch("/api/admin/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, currency, items }),
      });

      const json = await res.json();
      if (!res.ok) return alert(json?.error || "Save failed");
      alert("Saved prices!");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 18, maxWidth: 1300, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Admin: Prices</h1>
      <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>
        Prices are saved per <b>Size (Variant)</b> + Tier + Currency. (sheet/sqm/sqft)
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Tier</span>
          <select value={tier} onChange={(e) => setTier(e.target.value)} style={inputStyle}>
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Currency</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Collection</span>
          <select value={collection} onChange={(e) => setCollection(e.target.value)} style={inputStyle}>
            {COLLECTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6, flex: 1, minWidth: 240 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Search</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or SKU" style={inputStyle} />
        </label>

        <button onClick={load} disabled={loading} style={btnStyle}>
          {loading ? "Loading..." : "Load"}
        </button>

        <button onClick={save} disabled={saving || loading} style={btnStyle}>
          {saving ? "Saving..." : "Save (visible rows)"}
        </button>
      </div>

      <div style={{ marginTop: 14, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.02)" }}>
          <span style={{ fontSize: 13, opacity: 0.85 }}>{filtered.length} size rows</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.85 }}>
                <th style={{ padding: 10 }}>Collection</th>
                <th style={{ padding: 10 }}>SKU</th>
                <th style={{ padding: 10 }}>Product</th>
                <th style={{ padding: 10 }}>Size</th>
                <th style={{ padding: 10 }}>Stone</th>
                <th style={{ padding: 10 }}>Thk</th>
                <th style={{ padding: 10 }}>Price/Sheet</th>
                <th style={{ padding: 10 }}>Price/Sqm</th>
                <th style={{ padding: 10 }}>Price/Sqft</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <td style={{ padding: 10, fontSize: 13 }}>{r.product.collection}</td>
                  <td style={{ padding: 10, fontSize: 13 }}>{r.product.sku}</td>
                  <td style={{ padding: 10, fontWeight: 900 }}>{r.product.name}</td>
                  <td style={{ padding: 10, fontSize: 13 }}>{r.sizeLabel}</td>
                  <td style={{ padding: 10, fontSize: 13 }}>{r.product.stoneType || "-"}</td>
                  <td style={{ padding: 10, fontSize: 13 }}>
                    {r.product.thicknessMm ? `${r.product.thicknessMm}mm` : "-"}
                  </td>
                  <td style={{ padding: 10 }}>
                    <input
                      style={cellInput}
                      value={values[r.id]?.priceSheet ?? ""}
                      onChange={(e) => setField(r.id, "priceSheet", e.target.value)}
                    />
                  </td>
                  <td style={{ padding: 10 }}>
                    <input
                      style={cellInput}
                      value={values[r.id]?.priceSqm ?? ""}
                      onChange={(e) => setField(r.id, "priceSqm", e.target.value)}
                    />
                  </td>
                  <td style={{ padding: 10 }}>
                    <input
                      style={cellInput}
                      value={values[r.id]?.priceSqft ?? ""}
                      onChange={(e) => setField(r.id, "priceSqft", e.target.value)}
                    />
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: 16, opacity: 0.75 }}>
                    No variants found. Import first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, opacity: 0.75 }}>
        After saving, test distributor API: <b>/api/pricing</b>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.15)",
};

const btnStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.15)",
  background: "white",
  cursor: "pointer",
  fontWeight: 900,
  height: 42,
};

const cellInput: React.CSSProperties = {
  width: 120,
  padding: 8,
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.15)",
};