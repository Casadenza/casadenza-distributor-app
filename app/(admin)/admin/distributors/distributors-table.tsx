"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Edit2, X, Trash2 } from "lucide-react";

export default function DistributorsTable() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // Database se partners load karne ka function
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/distributors", { cache: "no-store" });
      const json = await res.json();
      setData(json.distributors || []);
    } catch (e) { 
      console.error("Fetch error:", e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { load(); }, []);

  // Search filter logic
  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return data.filter(d => 
      d.name.toLowerCase().includes(s) || 
      (d.email || "").toLowerCase().includes(s)
    );
  }, [data, q]);

  const getTierColor = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case "PLATINUM": return "text-zinc-500 border-zinc-300 bg-zinc-50";
      case "GOLD": return "text-[#996515] border-[#996515]/20 bg-[#996515]/5";
      default: return "text-zinc-400 border-zinc-200 bg-zinc-50";
    }
  };

  const handleDelete = async (id: string) => {
    const adminPassword = window.prompt("Security Protocol: Enter Admin Password to delete:");
    if (!adminPassword) return;
    try {
      const res = await fetch(`/api/admin/distributors/${id}`, { 
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword }) 
      });
      if (res.ok) { 
        setEditing(null); 
        load(); 
      }
    } catch (e) { 
      alert("Error deleting partner"); 
    }
  };

  // --- SAVE FUNCTION (PATCH/POST) ---
  const handleSave = async () => {
    if (!editing?.name || !editing?.email) return alert("Required fields missing");
    setSaving(true);
    try {
      const isNew = !editing.id;
      
      const payload = {
        name: editing.name,
        email: editing.email,
        password: editing.password,
        tier: editing.tier,
        defaultCurrency: editing.defaultCurrency || "USD",
        country: editing.country || "", // Primary Country (Identity Section)
        phone: editing.phone || "",
        billingName: editing.billingName || "",
        billingLine1: editing.billingLine1 || "",
        billingLine2: editing.billingLine2 || "",
        billingCity: editing.billingCity || "",
        billingState: editing.billingState || "",
        billingZip: editing.billingZip || "",
        billingCountry: editing.billingCountry || "", // Logistics Country Section
      };

      const res = await fetch(isNew ? "/api/admin/distributors" : `/api/admin/distributors/${editing.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) { 
        setEditing(null); 
        load(); // Table reload taaki naya data dikhe
      } else {
        const err = await res.json();
        alert("Error: " + (err.error || "Save failed"));
      }
    } catch (e) {
      alert("Network Error");
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto p-6 animate-in fade-in duration-500">
      
      {/* SEARCH & ADD BAR */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative w-full max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input 
            className="w-full bg-zinc-50 border border-zinc-100 rounded-lg py-2 pl-9 pr-4 text-[12px] outline-none focus:bg-white focus:ring-1 focus:ring-zinc-200 transition-all"
            placeholder="Filter partners..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setEditing({ tier: "STANDARD", defaultCurrency: "USD", email: "", password: "", country: "", phone: "", billingName: "" })}
          className="bg-zinc-950 text-white px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-zinc-800 transition-all flex items-center gap-2"
        >
          <UserPlus size={14} /> Add Partner
        </button>
      </div>

      {/* DISTRIBUTORS LIST TABLE */}
      <div className="bg-white border border-zinc-100 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/50 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              <th className="px-6 py-4 font-semibold">Identity</th>
              <th className="px-6 py-4 font-semibold text-center">Classification</th>
              <th className="px-6 py-4 font-semibold">Primary Country</th>
              <th className="px-6 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {filtered.map((d) => (
              <tr key={d.id} className="group hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-[13px] font-bold text-zinc-800">{d.name}</div>
                  <div className="text-[11px] text-zinc-400 lowercase">{d.email}</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-[9px] px-2 py-0.5 border rounded-md font-bold ${getTierColor(d.tier)}`}>
                    {d.tier}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {/* Primary Country display */}
                  <div className="text-[12px] text-zinc-600 font-medium">{d.country || "—"}</div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-tighter">{d.defaultCurrency}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => setEditing(d)} className="p-2 text-zinc-300 hover:text-zinc-950 transition-colors">
                    <Edit2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* EDIT/ADD MODAL */}
      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/10 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-100 flex flex-col overflow-hidden">
            
            <div className="px-6 py-4 border-b border-zinc-50 flex justify-between items-center bg-zinc-50/30">
              <h3 className="text-[14px] font-bold text-zinc-900 uppercase tracking-tight">{editing.id ? "Edit Partner" : "New Entry"}</h3>
              <button onClick={() => setEditing(null)} className="text-zinc-400 hover:text-zinc-900 transition-colors"><X size={18}/></button>
            </div>
            
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scroll">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                
                <div className="col-span-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Portal Access</div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400">Email</label>
                  <input className="w-full bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-1.5 text-[12px] outline-none" 
                    value={editing.email || ""} onChange={(e) => setEditing({...editing, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400">Password</label>
                  <input type="password" placeholder={editing.id ? "Leave blank" : ""} className="w-full bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-1.5 text-[12px] outline-none" 
                    value={editing.password || ""} onChange={(e) => setEditing({...editing, password: e.target.value})} />
                </div>

                <div className="col-span-2 pt-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Account Identity</div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400">Partner Legal Name</label>
                  <input className="w-full bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-1.5 text-[12px] font-bold" 
                    value={editing.name || ""} onChange={(e) => setEditing({...editing, name: e.target.value})} />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400">Primary Country (Identity Section)</label>
                  <input className="w-full bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-1.5 text-[12px]" 
                    value={editing.country || ""} 
                    onChange={(e) => setEditing({...editing, country: e.target.value})} 
                    placeholder="e.g. United Kingdom" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400">Phone</label>
                  <input className="w-full bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-1.5 text-[12px]" 
                    value={editing.phone || ""} onChange={(e) => setEditing({...editing, phone: e.target.value})} />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400">Tier</label>
                  <select className="w-full bg-zinc-50 border border-zinc-100 rounded-lg px-2 py-1.5 text-[12px] outline-none"
                    value={editing.tier} onChange={(e) => setEditing({...editing, tier: e.target.value})}>
                    <option value="STANDARD">STANDARD</option>
                    <option value="GOLD">GOLD</option>
                    <option value="PLATINUM">PLATINUM</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400">Default Currency</label>
                  <select className="w-full bg-zinc-50 border border-zinc-100 rounded-lg px-2 py-1.5 text-[12px] outline-none"
                    value={editing.defaultCurrency} onChange={(e) => setEditing({...editing, defaultCurrency: e.target.value})}>
                    <option value="USD">USD</option>
                    <option value="INR">INR</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>

                <div className="col-span-2 pt-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Billing Logistics</div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400">Billing Entity Name</label>
                  <input className="w-full bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-1.5 text-[12px]" 
                    value={editing.billingName || ""} onChange={(e) => setEditing({...editing, billingName: e.target.value})} />
                </div>
                <div className="col-span-2 space-y-2">
                  <input className="w-full bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-1.5 text-[12px]" 
                    value={editing.billingLine1 || ""} onChange={(e) => setEditing({...editing, billingLine1: e.target.value})} placeholder="Address Line 1" />
                </div>
                <div className="flex gap-2 col-span-2">
                  <input className="w-1/2 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-1.5 text-[11px]" 
                    value={editing.billingCity || ""} onChange={(e) => setEditing({...editing, billingCity: e.target.value})} placeholder="City" />
                  <input className="w-1/2 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-1.5 text-[11px]" 
                    value={editing.billingZip || ""} onChange={(e) => setEditing({...editing, billingZip: e.target.value})} placeholder="ZIP" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400">Billing Country (Logistics Section)</label>
                  <input className="w-full bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-1.5 text-[12px]" 
                    value={editing.billingCountry || ""} onChange={(e) => setEditing({...editing, billingCountry: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-50 flex justify-between items-center bg-zinc-50/10">
              {editing.id ? (
                <button onClick={() => handleDelete(editing.id!)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
              ) : <div/>}
              <div className="flex gap-4">
                <button onClick={() => setEditing(null)} className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Discard</button>
                <button onClick={handleSave} disabled={saving} className="bg-black text-white px-8 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all">
                  {saving ? "Saving..." : "Save Partner"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 3px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #EAE7E2; border-radius: 10px; }
      `}</style>
    </div>
  );
}