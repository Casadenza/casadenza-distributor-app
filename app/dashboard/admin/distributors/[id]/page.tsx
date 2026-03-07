"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const TIERS = ["STANDARD", "GOLD", "PLATINUM"];
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "INR"];

export default function EditDistributorPage({ params }: { params: { id: string } }) {
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [tier, setTier] = useState("STANDARD");
  const [country, setCountry] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [phone, setPhone] = useState("");

  const [billingName, setBillingName] = useState("");
  const [billingLine1, setBillingLine1] = useState("");
  const [billingLine2, setBillingLine2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingZip, setBillingZip] = useState("");
  const [billingCountry, setBillingCountry] = useState("");

  const [forceReset, setForceReset] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/distributors/${id}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) return alert(json?.error || "Load failed");

    const d = json.item;
    setName(d.name || "");
    setUserEmail(d.user?.email || "");
    setTier(d.tier || "STANDARD");
    setCountry(d.country || "");
    setDefaultCurrency(d.defaultCurrency || "USD");
    setPhone(d.phone || "");

    setBillingName(d.billingName || "");
    setBillingLine1(d.billingLine1 || "");
    setBillingLine2(d.billingLine2 || "");
    setBillingCity(d.billingCity || "");
    setBillingState(d.billingState || "");
    setBillingZip(d.billingZip || "");
    setBillingCountry(d.billingCountry || "");

    setForceReset(Boolean(d.user?.forcePasswordReset));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/distributors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          userEmail,
          tier,
          country: country || null,
          defaultCurrency,
          phone: phone || null,
          billingName: billingName || null,
          billingLine1: billingLine1 || null,
          billingLine2: billingLine2 || null,
          billingCity: billingCity || null,
          billingState: billingState || null,
          billingZip: billingZip || null,
          billingCountry: billingCountry || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) return alert(json?.error || "Save failed");
      alert("Saved ✅");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    const ok = confirm("Reset password and force reset on next login?");
    if (!ok) return;

    const res = await fetch(`/api/admin/distributors/${id}/reset-password`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) return alert(json?.error || "Reset failed");

    alert(`New temp password ✅\nEmail: ${json.loginEmail}\nTemp Password: ${json.tempPassword}`);
    load();
  }

  if (loading) return <div style={{ padding: 18 }}>Loading...</div>;

  return (
    <div style={{ padding: 18, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Edit Distributor</h1>
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>
            ID: <b>{id}</b> • Reset Required: <b>{forceReset ? "Yes" : "No"}</b>
          </div>
        </div>
        <Link href="/dashboard/admin/distributors" style={{ fontWeight: 900 }}>
          ← Back
        </Link>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <Section title="Basic">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} style={inp} />
          </Field>

          <Field label="Login Email">
            <input value={userEmail} onChange={(e) => setUserEmail(e.target.value)} style={inp} />
          </Field>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Field label="Tier">
              <select value={tier} onChange={(e) => setTier(e.target.value)} style={inp}>
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Country">
              <input value={country} onChange={(e) => setCountry(e.target.value)} style={inp} placeholder="India / Japan" />
            </Field>

            <Field label="Default Currency">
              <select value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)} style={inp}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Phone">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inp} />
            </Field>
          </div>
        </Section>

        <Section title="Billing Address">
          <Field label="Billing Name">
            <input value={billingName} onChange={(e) => setBillingName(e.target.value)} style={inp} />
          </Field>

          <Field label="Line 1">
            <input value={billingLine1} onChange={(e) => setBillingLine1(e.target.value)} style={inp} />
          </Field>

          <Field label="Line 2">
            <input value={billingLine2} onChange={(e) => setBillingLine2(e.target.value)} style={inp} />
          </Field>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Field label="City">
              <input value={billingCity} onChange={(e) => setBillingCity(e.target.value)} style={inp} />
            </Field>
            <Field label="State">
              <input value={billingState} onChange={(e) => setBillingState(e.target.value)} style={inp} />
            </Field>
            <Field label="Zip">
              <input value={billingZip} onChange={(e) => setBillingZip(e.target.value)} style={inp} />
            </Field>
            <Field label="Country">
              <input value={billingCountry} onChange={(e) => setBillingCountry(e.target.value)} style={inp} />
            </Field>
          </div>
        </Section>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={save} disabled={saving} style={btn}>
            {saving ? "Saving..." : "Save"}
          </button>

          <button onClick={resetPassword} style={btnDanger}>
            Reset Password
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, opacity: 0.8 }}>{label}</span>
      {children}
    </label>
  );
}

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
const btnDanger: React.CSSProperties = {
  ...btn,
  border: "1px solid rgba(200,0,0,0.35)",
};
