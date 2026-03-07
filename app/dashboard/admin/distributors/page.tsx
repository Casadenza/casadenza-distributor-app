"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  name: string;
  tier: string;
  country: string | null;
  defaultCurrency: string;
  user: { email: string; forcePasswordReset: boolean; role: string };
  createdAt: string;
};

const TIERS = ["STANDARD", "GOLD", "PLATINUM"];
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "INR"];

export default function AdminDistributorsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  // create form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState("STANDARD");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("USD");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/distributors", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) return alert(json?.error || "Failed to load distributors");
      setItems(json.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => x.name.toLowerCase().includes(s) || x.user.email.toLowerCase().includes(s) || x.id.includes(s));
  }, [items, q]);

  async function createDistributor() {
    if (!name.trim() || !email.trim()) return alert("Name + Email required");

    const res = await fetch("/api/admin/distributors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        tier,
        country: country.trim() || null,
        defaultCurrency: currency,
      }),
    });

    const json = await res.json();
    if (!res.ok) return alert(json?.error || "Create failed");

    alert(`Created ✅\nEmail: ${json.loginEmail}\nTemp Password: ${json.tempPassword}`);
    setName("");
    setEmail("");
    setCountry("");
    setTier("STANDARD");
    setCurrency("USD");
    load();
  }

  return (
    <div style={{ padding: 18, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Admin: Distributors</h1>
      <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>
        Create, edit profile, and reset password. Distributor Unique ID = <b>Distributor.id</b>
      </div>

      {/* Create */}
      <div style={{ marginTop: 14, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Create Distributor</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={lbl}>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inp} placeholder="Distributor name" />
          </label>

          <label style={{ display: "grid", gap: 6, minWidth: 260 }}>
            <span style={lbl}>Login Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} style={inp} placeholder="email@domain.com" />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={lbl}>Tier</span>
            <select value={tier} onChange={(e) => setTier(e.target.value)} style={inp}>
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={lbl}>Country</span>
            <input value={country} onChange={(e) => setCountry(e.target.value)} style={inp} placeholder="India / Japan" />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={lbl}>Default Currency</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inp}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <button onClick={createDistributor} style={btn}>
            Create
          </button>
        </div>
      </div>

      {/* Search + List */}
      <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span style={lbl}>Search</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} style={inp} placeholder="Search by name/email/id" />
        </label>
        <button onClick={load} style={btn}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div style={{ marginTop: 12, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: 12, background: "rgba(0,0,0,0.02)", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
          <span style={{ fontSize: 13, opacity: 0.85 }}>{filtered.length} distributors</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.85 }}>
                <th style={th}>Distributor ID</th>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Tier</th>
                <th style={th}>Country</th>
                <th style={th}>Currency</th>
                <th style={th}>Reset Required</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <td style={tdMono}>{d.id}</td>
                  <td style={td}>{d.name}</td>
                  <td style={td}>{d.user.email}</td>
                  <td style={td}>{d.tier}</td>
                  <td style={td}>{d.country || "-"}</td>
                  <td style={td}>{d.defaultCurrency}</td>
                  <td style={td}>{d.user.forcePasswordReset ? "Yes" : "No"}</td>
                  <td style={td}>
                    <Link href={`/dashboard/admin/distributors/${d.id}`} style={{ fontWeight: 900 }}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 16, opacity: 0.75 }}>
                    No distributors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 12, opacity: 0.8 };
const inp: React.CSSProperties = { padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)" };
const btn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.15)",
  background: "white",
  cursor: "pointer",
  fontWeight: 900,
  height: 42,
};
const th: React.CSSProperties = { padding: 10 };
const td: React.CSSProperties = { padding: 10, fontSize: 13 };
const tdMono: React.CSSProperties = { padding: 10, fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
