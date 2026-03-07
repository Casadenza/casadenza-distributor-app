"use client";

import { useEffect, useMemo, useState } from "react";
import { User, CreditCard, X, Lock } from "lucide-react";

type ProfileDTO = {
  email: string;
  role: string;
  distributorId: string | null;
  name: string;
  country: string | null;
  defaultCurrency: string;
  phone: string | null;
  billingName: string | null;
  billingLine1: string | null;
  billingLine2: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingZip: string | null;
  billingCountry: string | null;
};

// --- CLASSIC COMPACT FIELD ---
function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  className,
  type = "text",
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  type?: string;
}) {
  return (
    <div className={className}>
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 block ml-1">
        {label}
      </label>
      <div className="relative group">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={[
            "w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-[12px] outline-none transition-all",
            disabled ? "bg-zinc-50 text-zinc-400 border-zinc-100 cursor-not-allowed" : "focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950/5",
          ].join(" ")}
        />
        {disabled && (
          <Lock size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300" />
        )}
      </div>
    </div>
  );
}

export default function DistributorProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [data, setData] = useState<ProfileDTO | null>(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load profile");
      setData(json.profile);
    } catch (e: any) { setMsg(e?.message); } 
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!data) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          // Fixed fields: country and currency are NOT sent in the patch to protect them
          billingName: data.billingName,
          billingLine1: data.billingLine1,
          billingLine2: data.billingLine2,
          billingCity: data.billingCity,
          billingState: data.billingState,
          billingZip: data.billingZip,
          billingCountry: data.billingCountry,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setMsg("✅ Profile updated");
      await load();
    } catch (e: any) { setMsg("❌ Error saving"); } 
    finally { setSaving(false); setTimeout(() => setMsg(null), 2500); }
  }

  async function changePassword() {
    setPwSaving(true);
    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (!res.ok) throw new Error("Failed");
      setPwMsg("✅ Password updated");
      setTimeout(() => { setPwOpen(false); setPwMsg(null); setCurrentPw(""); setNewPw(""); }, 1000);
    } catch (e) { setPwMsg("❌ Failed"); } 
    finally { setPwSaving(false); }
  }

  return (
    <div className="max-w-[1000px] mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-5">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Profile Settings</h1>
          <p className="text-[11px] text-zinc-400 font-medium tracking-tight">Manage your distributor identity and billing logistics.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setPwOpen(true)} className="px-4 py-2 border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all">
            Security
          </button>
          <button onClick={save} disabled={saving || loading} className="px-6 py-2 bg-zinc-950 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all">
            {saving ? "..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* ACCOUNT IDENTITY */}
        <div className="border border-zinc-100 rounded-xl p-5 bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-50 pb-3">
            <User size={14} className="text-zinc-400" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-800">Account Identity</h2>
          </div>
          
          <div className="space-y-4">
            <Field label="Login Email" value={data?.email || ""} disabled />
            <Field label="Legal Entity Name" value={data?.name || ""} onChange={(v) => setData(p => p ? {...p, name: v} : p)} />
            
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone" value={data?.phone || ""} onChange={(v) => setData(p => p ? {...p, phone: v} : p)} />
              {/* COUNTRY - LOCKED */}
              <Field label="Country" value={data?.country || ""} disabled />
            </div>

            {/* CURRENCY - NOW LOCKED */}
            <Field label="Default Currency" value={data?.defaultCurrency || "USD"} disabled />
          </div>
        </div>

        {/* BILLING LOGISTICS */}
        <div className="border border-zinc-100 rounded-xl p-5 bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-50 pb-3">
            <CreditCard size={14} className="text-zinc-400" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-800">Billing Logistics</h2>
          </div>
          
          <div className="space-y-4">
            <Field label="Billing Entity Name" value={data?.billingName || ""} onChange={(v) => setData(p => p ? {...p, billingName: v} : p)} />
            <Field label="Address Line 1" value={data?.billingLine1 || ""} onChange={(v) => setData(p => p ? {...p, billingLine1: v} : p)} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="City" value={data?.billingCity || ""} onChange={(v) => setData(p => p ? {...p, billingCity: v} : p)} />
              <Field label="State" value={data?.billingState || ""} onChange={(v) => setData(p => p ? {...p, billingState: v} : p)} />
              <Field label="ZIP" value={data?.billingZip || ""} onChange={(v) => setData(p => p ? {...p, billingZip: v} : p)} />
              <Field label="Billing Country" value={data?.billingCountry || ""} onChange={(v) => setData(p => p ? {...p, billingCountry: v} : p)} />
            </div>
          </div>
        </div>
      </div>

      {/* MODAL REMAINING THE SAME */}
      {pwOpen && (
        <div className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 w-full max-w-xs rounded-xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-800">Security</h3>
              <button onClick={() => setPwOpen(false)}><X size={16}/></button>
            </div>
            <div className="space-y-4">
              <Field label="Current Password" type="password" value={currentPw} onChange={setCurrentPw} />
              <Field label="New Password" type="password" value={newPw} onChange={setNewPw} />
              <button onClick={changePassword} className="w-full bg-zinc-950 text-white py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest mt-2">
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}