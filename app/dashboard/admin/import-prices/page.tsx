"use client";

import { useState } from "react";

const TIERS = ["STANDARD", "GOLD", "PLATINUM"];
const CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY"];
const UNITS = ["SQFT", "SQM", "SHEET"]; // choose what your Excel values represent

export default function AdminImportPricesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [tier, setTier] = useState("STANDARD");
  const [currency, setCurrency] = useState("INR");
  const [unit, setUnit] = useState("SQFT");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) return alert("Select Excel file first");
    setBusy(true);
    setMsg("Importing...");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("tier", tier);
      fd.append("currency", currency);
      fd.append("unit", unit);

      const res = await fetch("/api/admin/import-prices", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) {
        setMsg(json?.error || "Import failed");
        return;
      }

      setMsg(
        `Done ✅ updated=${json.updated}, skipped=${json.skipped}. Tier=${json.tier}, Currency=${json.currency}, Unit=${json.unit}`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 18, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Admin: Import Prices</h1>
      <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>
        Upload your Excel price file. Choose Tier + Currency + which unit the Excel contains (SQFT/SQM/SHEET).
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
          <span style={{ fontSize: 12, opacity: 0.8 }}>Excel Unit</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value)} style={inputStyle}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>

        <div style={{ flex: 1, minWidth: 240 }}>
          <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>

        <button onClick={upload} disabled={busy} style={btnStyle}>
          {busy ? "Importing..." : "Upload & Import"}
        </button>
      </div>

      {msg && <div style={{ marginTop: 12, fontSize: 13 }}>{msg}</div>}

      <div style={{ marginTop: 18, fontSize: 12, opacity: 0.7 }}>
        After import: open <b>/dashboard/admin/prices</b> or test distributor API <b>/api/pricing</b>.
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
