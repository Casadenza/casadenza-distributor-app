"use client";
import { useEffect, useState } from "react";
import { FileText, MailOpen, RefreshCcw, ShieldCheck, Search } from "lucide-react";
type Pdf = { partId: string; filename: string; size: number };
type Candidate = {
  messageId: string; mailbox: "alex"; from: string; subject: string;
  date: string; snippet: string; pdfs: Pdf[];
};
export default function OrderEmailIntake() {
  const [items, setItems] = useState<Candidate[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  async function refresh() {
    if (loading) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/order-intake", { cache: "no-store" });
      const data = await res.json();
      setConnected(!!data.connected);
      if (!res.ok) throw Error(data.error || "Unable to search order emails");
      setItems(data.items || []);
    } catch (err: any) { setItems([]); setError(err?.message || "Order search unavailable"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  return <div className="space-y-5">
    <header>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B58F55]">Casadenza / Email Intake</p>
      <h1 className="mt-1 font-serif text-[30px] text-[#26221C]">New Order Email Review</h1>
      <p className="mt-2 text-[13px] leading-6 text-[#756C62]">Potential purchase orders received by alex@casadenza.in over the last 60 days. An email is not a confirmed order. Review its PO number, distributor, quantities, prices and duplicates before entering it into the Orders Hub.</p>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EAE2D4] bg-white p-4">
      <div className="text-[13px]"><strong>alex@casadenza.in</strong>
        <span className={"ml-2 " + (connected ? "text-emerald-700" : "text-amber-700")}>{connected === null ? "Checking…" : connected ? "Configured" : "Not connected"}</span>
      </div>
      <button onClick={() => void refresh()} disabled={loading} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#28221C] px-4 text-[12px] font-semibold text-white disabled:opacity-50">
        <RefreshCcw size={16}/>{loading ? "Searching…" : "Check New Orders"}
      </button>
    </div>
    <div className="rounded-xl border border-[#E8E2D5] bg-[#FAF7F0] p-4 text-[12px] leading-6 text-[#776B59]">
      <ShieldCheck size={17} className="mr-2 inline"/>Read-only screening. No email is marked read, sent, deleted or moved. No portal order is created automatically. Candidates require admin review and duplicate checks.
    </div>
    {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">{error}</p>}
    <section className="space-y-3">
      <h2 className="text-[16px] font-semibold">Possible purchase orders <span className="text-[12px] font-normal text-[#8A8070]">({items.length})</span></h2>
      {!items.length && !loading && <p className="rounded-xl bg-white p-5 text-[13px] text-[#8A8070]">No email candidates are available. If the mailbox is connected, try checking the sender and subject search terms directly in Gmail.</p>}
      {items.map(item => <article key={item.messageId} className="rounded-2xl border border-[#E8E3D9] bg-white p-4">
        <div className="flex flex-wrap items-center gap-2"><MailOpen size={16} className="text-[#A8864E]"/><h3 className="text-[14px] font-semibold">{item.subject}</h3></div>
        <p className="mt-1 break-all text-[11px] text-[#84796D]">{item.from} · {item.date}</p>
        <p className="mt-3 whitespace-pre-wrap text-[12px] text-[#60584E]">{item.snippet || "No preview text available"}</p>
        {item.pdfs.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
          {item.pdfs.map(pdf => {
            const params = new URLSearchParams({mailbox:"alex", messageId:item.messageId,partId:pdf.partId});
            return <a key={pdf.partId} href={"/api/admin/shipment-mail/preview?" + params.toString()}
              target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[36px] items-center gap-2 rounded-lg border border-[#DAD1C3] px-3 text-[12px] text-[#80643B]">
              <FileText size={15}/>{pdf.filename} — Preview PDF
            </a>;
          })}
        </div>}
        <p className="mt-3 text-[11px] text-amber-800">Pending verification: compare PO/invoice references against existing portal orders and Zoho records before creating an order.</p>
      </article>)}
    </section>
  </div>;
}
