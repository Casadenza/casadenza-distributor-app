import { Suspense } from "react";
import LoginPageClient from "./login-page-client";

export const dynamic = "force-dynamic";

function LoginFallback() {
  return (
    <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-[28px] border border-[#EAE7E2] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.06)] p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-3 w-24 rounded bg-[#EEE9E1]" />
          <div className="h-9 w-40 rounded bg-[#F3EFE8]" />
          <div className="h-4 w-full rounded bg-[#F6F3EE]" />
          <div className="h-12 w-full rounded-2xl bg-[#F3EFE8]" />
          <div className="h-12 w-full rounded-2xl bg-[#F3EFE8]" />
          <div className="h-12 w-full rounded-2xl bg-[#E8DFD0]" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageClient />
    </Suspense>
  );
}