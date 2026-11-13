"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, MailSearch, ExternalLink, Search, ShieldCheck, RefreshCw } from "lucide-react";

type Mailbox = { mailbox: "info" | "neeraj"; address: string; configured: boolean };
type Pdf = { partId: string; filename: string; size: number };
type Match = { mailbox: "info" | "neeraj"; address: string; messageId: string; subject: string; from: string; date: string; attachments: Pdf[] };
type Issue = { mailbox: string; code: string };
type Order = { id: string; distributorId: string; distributorName: string; country: string | null; poNumber: string; invoiceNumber: string; date: string };

const inputClass = "min-h-[44px] w-full rounded-xl border border-[#DFD7CA] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#B58F55]";
const btn = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#26211C] px-4 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";

export default function ShipmentMailFinder({ orders }: { orders: Order[] }) {
  const [referenceType, setReferenceType] = useState("INVOICE");
  const [reference, setReference] = useState("");
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [results, setResults] = useState<Match[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [searching, setSearching] = useState(false);
  const [importEnabled, setImportEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [selected, setSelected] = useState<{ match: Match; pdf: Pdf } | null>(null);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [orderFilter, setOrderFilter] = useState("");

  const chosen = orders.find(o => o.id === orderId);
  const shownOrders = useMemo(() => {
    const term = orderFilter.trim().toLowerCase();
    if (!term) return orders.slice(0, 80);
    return orders.filter(o =>
      [o.distributorName, o.poNumber, o.invoiceNumber, o.id, o.country || ""]
        .some(part => part.toLowerCase().includes(term))).slice(0, 80);
  }, [orders, orderFilter]);

  useEffect(() => {
    let disposed = false;
    fetch("/api/admin/shipment-mail/search", { cache: "no-store" })
      .then(r => r.json()).then(data => {
        if (!disposed) {
          setMailboxes(data.mailboxes || []);
          setImportEnabled(!!data.importEnabled);
          setLoaded(true);
        }
      }).catch(() => { if (!disposed) setLoaded(true); });
    return () => { disposed = true; };
  }, []);

  async function search() {
    if (searching || reference.trim().length < 3) return;
    setSearching(true); setSelected(null); setApproved(false); setError(""); setNotice("");
    try {
      const res = await fetch("/api/admin/shipment-mail/search?reference=" +
        encodeURIComponent(reference.trim()), { cache: "no-store" });
      const data = await res.json();
      setMailboxes(data.mailboxes || []);
      setImportEnabled(!!data.importEnabled);
      setResults(data.results || []);
      setIssues(data.issues || []);
      if (!res.ok) throw new Error(data.error || "Mailbox search not available");
      if (!(data.results || []).length) setNotice("No PDF attachments were found. Try the AWB, invoice or PO number instead.");
    } catch (e: any) { setResults([]); setError(e?.message || "Search failed"); }
    finally { setSearching(false); }
  }

  function previewUrl(m: Match, pdf: Pdf) {
    const params = new URLSearchParams({ mailbox: m.mailbox, messageId: m.messageId, partId: pdf.partId });
    return "/api/admin/shipment-mail/preview?" + params.toString();
  }

  async function attach() {
    if (!selected || !chosen || !approved || !importEnabled || busy) return;
    if (!window.confirm("Share \"" + selected.pdf.filename + "\" with " +
        chosen.distributorName + " (order " + (chosen.poNumber || chosen.id.slice(-8)) +
        ")? The document will become visible in their Documents section.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/admin/shipment-mail/import", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mailbox: selected.match.mailbox, messageId: selected.match.messageId,
          partId: selected.pdf.partId, orderId: chosen.id, distributorId: chosen.distributorId,
          reference: reference.trim(), confirmation: "SHARE DOCUMENT",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to attach document");
      setNotice("Attached securely to " + chosen.distributorName + "'s order. View it under Documents. No email has been sent.");
      setApproved(false); setSelected(null);
    } catch (e: any) { setError(e?.message || "Unable to attach"); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <header>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B58F55]">Admin / Shipment Documents</p>
      <h1 className="mt-1 font-serif text-[29px] text-[#25201B] sm:text-[36px]">Find AWB, HAWB & Invoices</h1>
      <p className="mt-2 max-w-[900px] text-[13px] leading-6 text-[#756C62]">
        Search shipment emails from both Casadenza mailboxes, preview a PDF, verify the consignee and
        manually approve the correct distributor order before sharing. No automatic forwarding.
      </p>
    </header>

    <section className="rounded-2xl border border-[#EAE2D4] bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2"><MailSearch size={19} className="text-[#B58F55]"/><h2 className="text-[16px] font-semibold">Connected mailbox configuration</h2></div>
      <div className="grid gap-2 sm:grid-cols-2">
        {mailboxes.map(mailbox => <div key={mailbox.mailbox} className="rounded-xl border border-[#EAE4DC] px-3 py-2 text-[12px]">
          <span className="font-semibold">{mailbox.address}</span>
          <span className={"ml-2 font-semibold " + (mailbox.configured ? "text-emerald-700" : "text-amber-700")}>
            {mailbox.configured ? "Configured" : "Not connected"}
          </span>
        </div>)}
      </div>
      {loaded && !mailboxes.every(m => m.configured) && (
        <div className="mt-3 rounded-xl border border-[#E8DCC9] bg-[#FFF9EF] p-4 text-[12px] leading-6 text-[#715D42]">
          <p className="font-semibold">Connect both company mailboxes to enable search</p>
          <p>ChatGPT Gmail connections cannot be reused here. Authorize each mailbox separately using Google OAuth read-only access, then set these server-only Vercel environment variables:</p>
          <p className="my-2 break-all rounded-lg bg-white px-3 py-2 font-mono text-[11px]">
            GMAIL_CLIENT_ID · GMAIL_CLIENT_SECRET · GMAIL_REFRESH_TOKEN_INFO · GMAIL_REFRESH_TOKEN_NEERAJ
          </p>
          <p>Use the Gmail API scope <code className="break-all">https://www.googleapis.com/auth/gmail.readonly</code>. Keep all refresh tokens and secrets out of chat and GitHub.</p>
          <div className="mt-3 flex flex-wrap gap-4">
            <a className="font-semibold underline underline-offset-2" href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>
            <a className="font-semibold underline underline-offset-2" href="https://vercel.com/casadenzas-projects/casadenza-distributor-app/settings/environment-variables" target="_blank" rel="noopener noreferrer">Vercel environment settings</a>
          </div>
        </div>
      )}
    </section>

    <section className="rounded-2xl border border-[#EAE2D4] bg-white p-4 sm:p-5">
      <div className="grid gap-3 md:grid-cols-[200px_1fr_auto] md:items-end">
        <label className="text-[12px] font-medium text-[#5E5346]">Search by
          <select className={inputClass + " mt-1"} value={referenceType} onChange={e => setReferenceType(e.target.value)}>
            <option value="INVOICE">Invoice number</option>
            <option value="AWB">AWB / HAWB number</option>
            <option value="PO">PO number</option>
            <option value="COMPANY">Distributor / company</option>
          </select>
        </label>
        <label className="text-[12px] font-medium text-[#5E5346]">Exact reference or company name
          <input className={inputClass + " mt-1"} value={reference} maxLength={90}
            onChange={e => setReference(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void search(); }}
            placeholder={referenceType === "INVOICE" ? "e.g. 2627/AE/10023" : referenceType === "AWB" ? "AWB or HAWB number" : referenceType === "PO" ? "Purchase order number" : "Company name"} />
        </label>
        <button type="button" className={btn} disabled={searching || reference.trim().length < 3} onClick={() => void search()}>
          {searching ? <RefreshCw size={16} className="animate-spin"/> : <Search size={16}/>}
          {searching ? "Searching…" : "Search both mailboxes"}
        </button>
      </div>
      {issues.length > 0 && <p className="mt-3 text-[12px] text-amber-800">
        Search was incomplete: {issues.map(i => i.mailbox + " (" + i.code + ")").join(", ")}.
      </p>}
      {notice && <p role="status" className="mt-3 rounded-lg bg-[#F7F2E9] p-3 text-[12px] text-[#755D36]">{notice}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-[12px] text-rose-800">{error}</p>}
    </section>

    <section className="rounded-2xl border border-[#EAE2D4] bg-white p-4 sm:p-5">
      <h2 className="text-[16px] font-semibold">Matching emails <span className="ml-2 text-[12px] font-normal text-[#8B8176]">{results.length}</span></h2>
      {!results.length && <p className="mt-3 text-[13px] text-[#90877A]">Search a reference to view email attachments.</p>}
      <div className="mt-3 space-y-3">
        {results.map(m => <div key={m.mailbox + m.messageId} className="rounded-xl border border-[#EDE7DC] p-3">
          <p className="break-words text-[13px] font-semibold">{m.subject || "Untitled shipment email"}</p>
          <p className="mt-1 break-words text-[11px] text-[#81786D]">{m.address} · {m.from} · {m.date}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {m.attachments.map(pdf => <div key={pdf.partId} className="flex max-w-full flex-wrap items-center gap-2 rounded-lg bg-[#F8F5EE] p-2 text-[12px]">
              <FileText size={16} className="text-[#A58A5B]"/>
              <span className="max-w-[250px] truncate" title={pdf.filename}>{pdf.filename}</span>
              <a href={previewUrl(m, pdf)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[#DFD7C8] bg-white px-2 text-[#846739]">Preview <ExternalLink size={13}/></a>
              <button onClick={() => { setSelected({ match: m, pdf }); setApproved(false); setError(""); }}
                className="min-h-[36px] rounded-lg border border-[#DFD7C8] bg-white px-3 font-semibold text-[#564731]">
                {selected?.match.messageId === m.messageId && selected.pdf.partId === pdf.partId && selected.match.mailbox === m.mailbox ? "Selected" : "Select"}
              </button>
            </div>)}
          </div>
        </div>)}
      </div>
    </section>

    {selected && <section className="rounded-2xl border border-[#EAE2D4] bg-white p-4 sm:p-5">
      <h2 className="text-[16px] font-semibold">Approve document sharing</h2>
      <p className="mt-1 text-[12px] text-[#807369]">Selected PDF: <strong>{selected.pdf.filename}</strong></p>
      <label className="mt-4 block text-[12px] text-[#5E5346]">Filter portal orders by distributor, invoice or PO
        <input className={inputClass + " mt-1"} value={orderFilter} onChange={e => setOrderFilter(e.target.value)} placeholder="Search orders…"/>
      </label>
      <label className="mt-3 block text-[12px] text-[#5E5346]">Destination distributor and order
        <select className={inputClass + " mt-1"} value={orderId} onChange={e => { setOrderId(e.target.value); setApproved(false); }}>
          <option value="">Choose an order (required)</option>
          {chosen && !shownOrders.some(o => o.id === chosen.id) && <option value={chosen.id}>{chosen.distributorName} · {chosen.poNumber || chosen.id.slice(-8)}</option>}
          {shownOrders.map(o => <option key={o.id} value={o.id}>
            {o.distributorName} · PO {o.poNumber || o.id.slice(-8)}{o.invoiceNumber ? " · INV " + o.invoiceNumber : ""} · {o.date}
          </option>)}
        </select>
      </label>
      {chosen && <div className="mt-3 rounded-lg bg-[#FAF7F1] p-3 text-[12px] leading-6">
        <strong>Recipient:</strong> {chosen.distributorName} ({chosen.country || "Country not specified"})<br/>
        <strong>Order:</strong> {chosen.poNumber || chosen.id}<br/>
        <strong>Invoice reference:</strong> {chosen.invoiceNumber || "Not recorded in portal"}
      </div>}
      <label className="mt-4 flex items-start gap-2 text-[12px] leading-5 text-[#6F6251]">
        <input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)}
          className="mt-1 h-4 w-4" />
        I inspected the PDF and confirmed the shipment, invoice/PO reference and consignee match this distributor&apos;s order.
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button disabled={!importEnabled || !chosen || !approved || busy} onClick={() => void attach()} className={btn}>
          <ShieldCheck size={16}/>{busy ? "Sharing…" : "Approve & share with distributor"}
        </button>
        {!importEnabled && <p className="text-[12px] text-amber-800">
          Sharing is locked in Preview. It requires a reviewed production release and an explicit environment switch.
        </p>}
      </div>
    </section>}
  </div>;
}
