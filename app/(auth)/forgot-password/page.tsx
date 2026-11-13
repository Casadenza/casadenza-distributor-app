"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST", headers: { "content-type": "application/json" },
        credentials: "same-origin", body: JSON.stringify({ email }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not request reset link");
      setSuccess(body.message || "Check your registered email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request link");
    } finally { setBusy(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#F9F8F6] px-4">
    <section className="w-full max-w-[450px] rounded-[28px] border border-[#EAE5DE] bg-white p-6 shadow-lg sm:p-9">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B49A6B]">Casadenza Distributor Portal</p>
      <h1 className="mt-3 text-3xl font-semibold text-[#201A16]">Forgot password?</h1>
      <p className="mt-2 text-sm leading-6 text-[#70695F]">
        Enter the email address registered in the portal. We will send you a link to choose a new password.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold text-[#4B4237]">Registered email address
          <span className="relative mt-2 block">
            <Mail size={17} className="absolute left-3 top-3.5 text-[#B49A6B]"/>
            <input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="you@company.com" className="min-h-[46px] w-full rounded-xl border border-[#DDD2C2] px-10 outline-none focus:border-[#B79A69]"/>
          </span>
        </label>
        {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button type="submit" disabled={busy} className="min-h-[46px] w-full rounded-xl bg-black text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Sending..." : "Email me a reset link"}
        </button>
      </form>
      <Link href="/login" className="mt-5 inline-flex items-center gap-2 text-sm text-[#8D724D]"><ArrowLeft size={15}/>Back to login</Link>
      <p className="mt-4 text-xs leading-5 text-[#8B8173]">
        Reset links expire after 15 minutes and can only be used once. If this is a protected Preview, open your Preview access link first in the same browser.
      </p>
    </section>
  </main>;
}
