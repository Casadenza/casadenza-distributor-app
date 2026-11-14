"use client";
import { useEffect, useState } from "react";
import { Link2, Save, Search } from "lucide-react";

type Account = { id: string; name: string; country: string | null };

export default function AdminZohoAccountLink({
  distributorId, initialId,
}: { distributorId: string; initialId: string | null }) {
  const [accountId, setAccountId] = useState(initialId || "");
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [matches, setMatches] = useState<Account[]>([]);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    const word = query.trim();
    if (word.length < 3 || word === selectedName) {
      setMatches([]);
      setSearchError("");
      setSearching(false);
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch("/api/admin/zoho/accounts/search?word=" + encodeURIComponent(word), {
          cache: "no-store", credentials: "same-origin",
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Account search unavailable");
        if (!cancelled) {
          setMatches(body.accounts || []);
          setSearchError("");
        }
      } catch (err) {
        if (!cancelled) {
          setMatches([]);
          setSearchError(err instanceof Error ? err.message : "Account search unavailable");
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 400);
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [query, selectedName]);

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/distributors/" + encodeURIComponent(distributorId) + "/zoho-link", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ zohoAccountId: accountId.trim() }),
      });
      const response = await res.json();
      if (!res.ok) throw new Error(response.error || "Zoho Account linking failed");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to link Zoho Account");
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
        Search the Zoho Accounts module and select the correct company.
        The record ID is verified before linking; similar company names never link automatically.
      </p>
      <div className="mt-4 max-w-[700px] space-y-3">
        <label className="block text-[12px] text-[#665B4B]">
          Find Zoho Account
          <span className="relative mt-1 block">
            <Search size={16} className="absolute left-3 top-3.5 text-[#9B8A6E]" />
            <input value={query} onChange={e => { setQuery(e.target.value); setSelectedName(""); }}
              placeholder="Type at least 3 characters of a company name"
              autoComplete="off"
              className="block min-h-[44px] w-full rounded-xl border border-[#DCD2C3] bg-white py-2 pl-10 pr-3 text-[14px] outline-none focus:border-[#B9955D]" />
          </span>
        </label>
        {searching && <p className="text-[12px] text-[#81776B]">Searching Zoho Accounts…</p>}
        {searchError && <p role="alert" className="text-[12px] text-amber-800">{searchError}</p>}
        {matches.length > 0 && (
          <div className="max-h-[240px] overflow-y-auto rounded-xl border border-[#E5DCCF] bg-white">
            {matches.map(account => (
              <button type="button" key={account.id} onClick={() => {
                setAccountId(account.id); setQuery(account.name); setSelectedName(account.name); setMatches([]); setError("");
              }} className="flex min-h-[52px] w-full items-center justify-between gap-3 border-b border-[#F0EBE5] px-3 py-2 text-left hover:bg-[#F7F1E7]">
                <span className="min-w-0">
                  <span className="block break-words text-[13px] font-semibold text-[#28231D]">{account.name}</span>
                  <span className="block text-[11px] text-[#82796D]">{account.country || "Country not listed"} · {account.id}</span>
                </span>
                <span className="text-[12px] text-[#987343]">Select</span>
              </button>
            ))}
          </div>
        )}
        <label className="block text-[12px] text-[#665B4B]">
          Verified Account ID (or enter directly)
          <input inputMode="numeric" value={accountId} onChange={e => { setAccountId(e.target.value); setSelectedName(""); }}
            className="mt-1 block min-h-[44px] w-full rounded-xl border border-[#DCD2C3] bg-white px-3 text-[14px]"
            placeholder="Zoho Account record ID" />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-[#8C8376]">No Zoho records are changed. Only the mapping in this portal is saved.</p>
          <button type="button" onClick={() => { void save(); }}
            disabled={busy || accountId.trim() === (initialId || "")}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#24211D] px-4 text-[13px] font-semibold text-white disabled:opacity-50">
            <Save size={15} />{busy ? "Verifying…" : "Save account"}
          </button>
        </div>
        {error && <p role="alert" className="text-[12px] text-red-700">{error}</p>}
      </div>
    </section>
  );
}
