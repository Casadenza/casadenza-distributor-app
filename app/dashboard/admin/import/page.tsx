"use client";

import { useState } from "react";

type Result = { ok?: boolean; error?: string; [k: string]: any };

const TIERS = ["STANDARD", "GOLD", "PLATINUM"] as const;
const CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY"] as const;
const UNITS = [
  { value: "SQFT", label: "Sq Ft" },
  { value: "SQM", label: "Sq M" },
  { value: "SHEET", label: "Per Sheet" },
] as const;

export default function AdminImportPage() {
  const [productsFile, setProductsFile] = useState<File | null>(null);
  const [pricesFile, setPricesFile] = useState<File | null>(null);

  const [tier, setTier] = useState<(typeof TIERS)[number]>("STANDARD");
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("USD");
  const [unit, setUnit] = useState<(typeof UNITS)[number]["value"]>("SQFT");

  const [productsRes, setProductsRes] = useState<Result | null>(null);
  const [pricesRes, setPricesRes] = useState<Result | null>(null);

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);

  async function uploadProducts(file: File) {
    const fd = new FormData();
    fd.append("file", file);

    // ✅ your working products import
    const res = await fetch("/api/admin/import", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data;
  }

  async function uploadPrices(file: File) {
    const fd = new FormData();
    fd.append("file", file);

    // ✅ important: send these 3 exactly as backend expects
    fd.append("tier", tier);
    fd.append("currency", currency);
    fd.append("unit", unit); // SHEET / SQM / SQFT

    const res = await fetch("/api/admin/import-prices", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data;
  }

  async function onImportProducts() {
    if (!productsFile) return alert("Please choose a Products Excel file first.");
    setLoadingProducts(true);
    setProductsRes(null);
    try {
      const data = await uploadProducts(productsFile);
      setProductsRes(data);
    } catch (e: any) {
      setProductsRes({ ok: false, error: e?.message || "Import failed" });
    } finally {
      setLoadingProducts(false);
    }
  }

  async function onImportPrices() {
    if (!pricesFile) return alert("Please choose a Prices Excel file first.");
    setLoadingPrices(true);
    setPricesRes(null);
    try {
      const data = await uploadPrices(pricesFile);
      setPricesRes(data);
    } catch (e: any) {
      setPricesRes({ ok: false, error: e?.message || "Import failed" });
    } finally {
      setLoadingPrices(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Admin Imports</h1>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>1) Import Products (Excel)</h2>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setProductsFile(e.target.files?.[0] ?? null)}
        />
        <div style={{ marginTop: 10 }}>
          <button
            onClick={onImportProducts}
            disabled={loadingProducts}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #999",
              cursor: loadingProducts ? "not-allowed" : "pointer",
            }}
          >
            {loadingProducts ? "Importing..." : "Import Products"}
          </button>
        </div>

        {productsRes && (
          <pre
            style={{
              marginTop: 12,
              background: "#f7f7f7",
              padding: 12,
              borderRadius: 10,
              overflow: "auto",
            }}
          >
            {JSON.stringify(productsRes, null, 2)}
          </pre>
        )}
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>2) Import Prices (Excel)</h2>

        {/* ✅ NEW: Tier, Currency, Unit selections */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#555" }}>Tier</span>
            <select value={tier} onChange={(e) => setTier(e.target.value as any)}>
              {TIERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#555" }}>Currency</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as any)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#555" }}>Prices Unit</span>
            <select value={unit} onChange={(e) => setUnit(e.target.value as any)}>
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </label>
        </div>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setPricesFile(e.target.files?.[0] ?? null)}
        />

        <div style={{ marginTop: 10 }}>
          <button
            onClick={onImportPrices}
            disabled={loadingPrices}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #999",
              cursor: loadingPrices ? "not-allowed" : "pointer",
            }}
          >
            {loadingPrices ? "Importing..." : "Import Prices"}
          </button>
        </div>

        {pricesRes && (
          <pre
            style={{
              marginTop: 12,
              background: "#f7f7f7",
              padding: 12,
              borderRadius: 10,
              overflow: "auto",
            }}
          >
            {JSON.stringify(pricesRes, null, 2)}
          </pre>
        )}
      </div>

      <p style={{ marginTop: 14, color: "#666" }}>
        Note: Browser me <code>/api/admin/import-prices</code> open karoge to GET hota hai, isliye 405 aata hai.
        Import yahan button se hoga (POST).
      </p>
    </div>
  );
}
