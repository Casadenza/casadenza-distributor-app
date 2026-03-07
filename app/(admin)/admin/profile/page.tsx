"use client";

import { useEffect, useState } from "react";
import { User, ShieldCheck, KeyRound, RefreshCcw, Save } from "lucide-react";

type Profile = {
  id: string;
  email: string;
  role: string;
  displayName: string | null;
};

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");

  const [pwSaving, setPwSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/profile", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setProfile(json.profile);
      setDisplayName(json.profile?.displayName || "");
    } catch (e: any) {
      alert("Load Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      if (!res.ok) throw new Error();
      alert("Profile Updated");
    } catch (e) { alert("Save Failed"); } finally { setSaving(false); }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword) return alert("Fields required");
    setPwSaving(true);
    try {
      const res = await fetch("/api/admin/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) throw new Error();
      setCurrentPassword("");
      setNewPassword("");
      alert("Password Changed");
    } catch (e) { alert("Failed"); } finally { setPwSaving(false); }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Slim Header */}
      <div className="flex items-end justify-between border-b border-[#F0EDE8] pb-3">
        <div>
          <h1 className="text-2xl font-serif italic text-[#1A1A1A]">Account</h1>
          <p className="text-[9px] font-bold text-[#C5A267] uppercase tracking-[0.2em]">Security & Identity</p>
        </div>
        <button onClick={load} className="p-1.5 hover:bg-[#FAF9F6] rounded-lg transition-colors">
          <RefreshCcw size={14} className={`${loading ? 'animate-spin' : ''} text-[#A39E93]`} />
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-[12px] text-[#A39E93] italic font-serif">Verifying Credentials...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          
          {/* Profile Section (Left) */}
          <div className="md:col-span-3 bg-white border border-[#EAE7E2] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#F0EDE8] bg-[#FAF9F6] flex items-center gap-2">
              <User size={14} className="text-[#C5A267]" />
              <span className="text-[10px] font-bold uppercase tracking-widest">General Info</span>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-[#A39E93] uppercase ml-1">Display Name</label>
                <input 
                  className="w-full bg-[#FAF9F6] border border-[#EAE7E2] rounded-xl px-4 py-2 text-[12px] focus:bg-white focus:border-[#C5A267] outline-none font-medium"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 opacity-70">
                  <label className="text-[9px] font-bold text-[#A39E93] uppercase ml-1">Email (Read-Only)</label>
                  <div className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-2 text-[11px] font-medium truncate">
                    {profile?.email}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-[#A39E93] uppercase ml-1">Role</label>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-3 py-2 rounded-xl italic">
                    <ShieldCheck size={12} /> {profile?.role}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 bg-[#1A1A1A] text-[#C5A267] px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                >
                  <Save size={12} /> {saving ? "Saving..." : "Update Profile"}
                </button>
              </div>
            </div>
          </div>

          {/* Security Section (Right) */}
          <div className="md:col-span-2 bg-[#1A1A1A] rounded-2xl border border-black shadow-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/5 bg-white/5 flex items-center gap-2">
              <KeyRound size={14} className="text-[#C5A267]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white">Security</span>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-white/40 uppercase ml-1">Current Password</label>
                <input 
                  type="password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[12px] text-white focus:border-[#C5A267] outline-none transition-all"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-white/40 uppercase ml-1">New Password</label>
                <input 
                  type="password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[12px] text-white focus:border-[#C5A267] outline-none transition-all"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <button 
                onClick={changePassword}
                disabled={pwSaving}
                className="w-full bg-[#C5A267] text-white py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#B38F56] transition-all active:scale-95 disabled:opacity-50"
              >
                {pwSaving ? "Updating..." : "Authorize Update"}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}