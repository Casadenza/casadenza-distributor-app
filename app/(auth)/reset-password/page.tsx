"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token") || "";
    setToken(value);
    setReady(true);
    if (value) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST", headers: { "content-type": "application/json" },
        credentials: "same-origin", body: JSON.stringify({ token, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Unable to change password");
      setSuccess(true);
      setToken("");
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password");
    } finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#F9F8F6] px-4">
    <section className="w-full max-w-[450px] rounded-[28px] border border-[#EAE5DE] bg-white p-6 shadow-lg sm:p-9">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B49A6B]">Casadenza Distributor Portal</p>
      <h1 className="mt-3 text-3xl font-semibold">Choose a new password</h1>
      {success ? <div className="mt-5 space-y-4">
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Password updated. You can now sign in with your new password.</p>
        <Link href="/login" className="inline-flex min-h-[44px] items-center rounded-xl bg-black px-5 text-sm font-semibold text-white">Return to login</Link>
      </div> : !ready ? <p className="mt-5 text-sm">Checking link...</p> :
        !token ? <div className="mt-5 space-y-4">
          <p role="alert" className="text-sm text-red-700">This page needs a fresh email reset link.</p>
          <Link href="/forgot-password" className="text-sm font-semibold text-[#96724E]">Request a new link</Link>
        </div> : <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">New password
            <span className="relative mt-2 block">
              <LockKeyhole size={17} className="absolute left-3 top-3.5 text-[#B49A6B]"/>
              <input required type="password" minLength={12} maxLength={128} autoComplete="new-password"
                value={password} onChange={e=>setPassword(e.target.value)}
                className="min-h-[46px] w-full rounded-xl border border-[#DDD2C2] px-10 outline-none focus:border-[#B79A69]"/>
            </span>
          </label>
          <label className="block text-sm font-semibold">Confirm new password
            <input required type="password" minLength={12} maxLength={128} autoComplete="new-password"
              value={confirm} onChange={e=>setConfirm(e.target.value)}
              className="mt-2 min-h-[46px] w-full rounded-xl border border-[#DDD2C2] px-3 outline-none focus:border-[#B79A69]"/>
          </label>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <p className="text-xs text-[#7D7468]">Use 12 or more characters. The link expires after 15 minutes and cannot be reused.</p>
          <button type="submit" disabled={busy} className="min-h-[46px] w-full rounded-xl bg-black text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Updating..." : "Set new password"}
          </button>
        </form>}
      <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm text-[#8D724D]"><ArrowLeft size={15}/>Back to login</Link>
    </section>
  </main>;
}
