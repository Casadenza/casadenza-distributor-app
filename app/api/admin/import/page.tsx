"use client";

import { useState } from "react";

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");

  async function upload() {
    if (!file) return alert("Select Excel file first");
    setMsg("Uploading...");

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/admin/import-products", { method: "POST", body: fd });
    const json = await res.json();

    if (!res.ok) {
      setMsg(json?.error || "Upload failed");
      return;
    }

    const sumRes = await fetch("/api/admin/products-summary", { cache: "no-store" });
    const sum = await sumRes.json();

    setMsg(`Done ✅ Imported: ${json.importedCount}. DB: products=${sum.products}, variants=${sum.variants}`);
  }

  return (
    <div style={{ padding: 18, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Admin: Import Products</h1>
      <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>
        Upload your Excel (Fusion/Lumina/ECO Fusion/ECO Lumina). 3D Fusion variants auto-created from Fusion.
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button
          onClick={upload}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "white",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          Upload & Import
        </button>
      </div>

      {msg && <div style={{ marginTop: 12, fontSize: 13 }}>{msg}</div>}

      <div style={{ marginTop: 18, fontSize: 12, opacity: 0.7 }}>
        After import, open Admin Prices page: <b>/dashboard/admin/prices</b> (products will show)
      </div>
    </div>
  );
}
