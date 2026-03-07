"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, Mail, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextParam = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data?.error || "Login failed");
        return;
      }

      const target = (data?.redirectTo as string) || nextParam || "/dashboard";
      router.push(target);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F9F8F6] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#E8D7B8]/25 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-[#F1E7D4]/35 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#EFE7DB]/30 blur-3xl" />
      </div>

      <div className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2">
        <div className="hidden lg:flex items-center justify-center px-12 xl:px-20">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E7DED1] bg-white/80 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#A68A5B] shadow-sm backdrop-blur">
              <ShieldCheck className="h-4 w-4" />
              Distributor Portal Access
            </div>

            <h1 className="mt-6 text-5xl font-light tracking-[0.04em] text-[#171717] leading-tight">
              Welcome back to
              <span className="block font-semibold text-[#C5A267]">Casadenza</span>
            </h1>

            <p className="mt-5 max-w-lg text-[15px] leading-7 text-[#6F6A62]">
              Access your distributor dashboard, product pricing, order workflow,
              and business documents from one secure premium workspace.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-4">
              <FeatureRow
                title="Secure portal access"
                text="Protected sign-in for distributor accounts with session-based access."
              />
              <FeatureRow
                title="Unified dashboard"
                text="View products, prices, orders, and important business tools in one place."
              />
              <FeatureRow
                title="Premium workflow"
                text="Clean, minimal, professional interface aligned with your project design language."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-10 lg:px-10">
          <div className="w-full max-w-md">
            <div className="rounded-[30px] border border-[#EAE7E2] bg-white/95 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-xl overflow-hidden">
              <div className="border-b border-[#F1EEE8] px-8 pt-8 pb-6">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#B49A6B]">
                  Account Login
                </div>
                <h2 className="mt-2 text-[30px] font-semibold tracking-tight text-[#161616]">
                  Sign in
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#7B766E]">
                  Enter your registered email and password to continue to your dashboard.
                </p>
              </div>

              <form onSubmit={onSubmit} className="px-8 py-7 space-y-5">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#9C9589]">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B49A6B]" />
                    <input
                      className="h-12 w-full rounded-2xl border border-[#E6E1D8] bg-[#FCFBF9] pl-11 pr-4 text-[14px] text-[#171717] outline-none transition focus:border-[#C5A267] focus:bg-white"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#9C9589]">
                    Password
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B49A6B]" />
                    <input
                      className="h-12 w-full rounded-2xl border border-[#E6E1D8] bg-[#FCFBF9] pl-11 pr-4 text-[14px] text-[#171717] outline-none transition focus:border-[#C5A267] focus:bg-white"
                      placeholder="Enter your password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                {msg ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {msg}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-[#222] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{loading ? "Signing in..." : "Login to Dashboard"}</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </button>

                <div className="pt-1 text-center text-[12px] text-[#928B80]">
                  Secure distributor access for authorized users only.
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-[#ECE6DC] bg-white/80 px-5 py-4 shadow-sm">
      <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[#C5A267]" />
      <div>
        <div className="text-sm font-semibold text-[#181818]">{title}</div>
        <div className="mt-1 text-sm leading-6 text-[#726D65]">{text}</div>
      </div>
    </div>
  );
}