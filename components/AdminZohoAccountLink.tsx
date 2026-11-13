"use client";
import { useState } from "react";
import { Link2, Save } from "lucide-react";

export default function AdminZohoAccountLink({
  distributorId, initialId,
}: { distributorId: string; initialId: string | null }) {
  const [accountId, setAccountId] = useState(initialId || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/distributors/" + encodeURIComponent(distributorId) + "/zoho-link", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ zohoAccountId: accountId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Zoho Account linking failed");
      window.location.reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to link Zoho Account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[18px] border border-[#E9E2D8] bg-[#FCFAF6] p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Link2 size={18} className="text-[#B58F55]" />
        <h2 className="text-[16px] font-semibold">Zoho CRM Account</h2>
      </div>
      <p className="mt-2 text-[12px] leading-5 text-[#80776B]">
        Enter the exact Zoho Accounts record ID. The portal verifies it in Zoho before saving.
        Company names are not used as identifiers.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="min-w-[190px] flex-1 text-[12px] text-[#665B4B]">
          Zoho Account ID
          <input inputMode="numeric" value={accountId} onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 block min-h-[44px] w-full rounded-xl border border-[#DCD2C3] bg-white px-3 text-[14px]"
            placeholder="Zoho Account record ID" />
        </label>
        <button type="button" onClick={save} disabled={busy || accountId.trim() === (initialId || "")}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#24211D] px-4 text-[13px] font-semibold text-white disabled:opacity-50">
          <Save size={15} />{busy ? "Verifying…" : "Save account"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-[12px] text-red-700">{error}</p>}
      <p className="mt-2 text-[11px] text-[#8C8376]">Linking does not change Zoho CRM records.</p>
    </section>
  );
}
