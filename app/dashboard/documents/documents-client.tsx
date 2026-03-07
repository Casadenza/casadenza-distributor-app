"use client";

import { useMemo, useState } from "react";
import { Search, RefreshCw, X, ChevronDown, ChevronUp, FileText, Download, ExternalLink } from "lucide-react";

function cn(...a: Array<string | undefined | null | false>) {
  return a.filter(Boolean).join(" ");
}

function safeParseNotes(notes: any) {
  if (!notes) return null;
  try {
    const obj = JSON.parse(String(notes));
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

function docTypeLabel(d: any) {
  return String(d?.type || d?.docType || d?.title || d?.name || "Document");
}

function docUrl(d: any) {
  return String(d?.url || "");
}

function isDataUrl(u: string) {
  return u.startsWith("data:");
}

function formatDate(dt: any) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return "—";
  }
}

const labelCls = "text-[9px] font-bold text-[#A39E93] uppercase tracking-[0.1em] mb-1";

function typePill(type: string) {
  const t = type.toUpperCase();
  if (t.includes("PROFORMA")) return "bg-indigo-50 text-indigo-600 border-indigo-100";
  if (t.includes("COMMERCIAL")) return "bg-emerald-50 text-emerald-600 border-emerald-100";
  if (t.includes("PACK")) return "bg-amber-50 text-amber-700 border-amber-100";
  if (t.includes("BL") || t.includes("BILL") || t.includes("AWB")) return "bg-slate-50 text-slate-600 border-slate-200";
  if (t.includes("ORIGIN") || t.includes("COO")) return "bg-zinc-50 text-zinc-600 border-zinc-200";
  if (t.includes("FUMIGATION")) return "bg-rose-50 text-rose-600 border-rose-100";
  return "bg-zinc-50 text-zinc-600 border-zinc-200";
}

export default function DocumentsClient({ initialOrders }: { initialOrders: any[] }) {
  const [orders] = useState<any[]>(initialOrders || []);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [q, setQ] = useState("");
  const [docType, setDocType] = useState("ALL");

  const docTypeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const o of orders) {
      for (const d of o?.documents || []) set.add(docTypeLabel(d));
    }
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const meta = safeParseNotes(o.notes) || {};
      const po = meta?.poNumber ? `PO-${meta.poNumber}` : `ORD-${String(o.id).slice(-6)}`;
      const haystack = `${po} ${JSON.stringify(meta)} ${JSON.stringify(o?.documents || [])}`.toLowerCase();

      if (q && !haystack.includes(q.toLowerCase())) return false;

      if (docType !== "ALL") {
        const has = (o?.documents || []).some((d: any) => docTypeLabel(d) === docType);
        if (!has) return false;
      }
      return true;
    });
  }, [orders, q, docType]);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Sticky Header (My Orders style) */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#EEEAE2] shadow-sm">
        <div className="px-4 py-3 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[160px]">
            <h1 className="text-sm font-serif font-bold uppercase tracking-[0.2em]">Documents</h1>
            <p className="text-[9px] text-[#A39E93] font-bold uppercase">{filtered.length} Orders</p>
          </div>

          <div className="w-[190px]">
            <div className={labelCls}>Search</div>
            <div className="relative border-b border-[#EEEAE2]">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full bg-transparent py-1 text-[11px] outline-none"
                placeholder="PO, BL, invoice..."
              />
              <Search className="absolute right-0 top-1 text-[#A39E93]" size={12} />
            </div>
          </div>

          <div className="w-[190px]">
            <div className={labelCls}>Document Type</div>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full bg-transparent border-b border-[#EEEAE2] py-1 text-[11px] outline-none"
            >
              {docTypeOptions.map((t) => (
                <option key={t} value={t}>
                  {t === "ALL" ? "All Types" : t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => window.location.reload()} className="p-1.5 border border-[#E5E0D8]">
              <RefreshCw size={13} />
            </button>
            <button
              onClick={() => {
                setQ("");
                setDocType("ALL");
              }}
              className="p-1.5 border border-[#E5E0D8] bg-black text-white"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Table Head */}
      <div className="bg-[#FBF9F6] border-b border-[#EEEAE2] grid grid-cols-[1.4fr_1fr_1fr_0.9fr_40px] px-6 py-2 sticky top-[65px] z-30">
        <div className={labelCls}>Order Detail</div>
        <div className={labelCls}>Status</div>
        <div className={labelCls}>Docs</div>
        <div className={labelCls}>Created</div>
        <div></div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#F2EFE9]">
        {filtered.map((o) => {
          const meta = safeParseNotes(o.notes) || {};
          const isOpen = !!expanded[o.id];
          const po = meta?.poNumber ? `PO-${meta.poNumber}` : `ORD-${String(o.id).slice(-6)}`;
          const poDate = meta?.poDate || new Date(o.createdAt).toLocaleDateString();
          const docs = (o?.documents || []) as any[];

          return (
            <div key={o.id} className="group">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_0.9fr_40px] px-6 py-3 hover:bg-[#FDFCFB] transition-colors items-center">
                <div className="flex flex-col pr-4 border-r border-[#EEEAE2]">
                  <div className="text-[12px] font-bold text-black">{po}</div>
                  <div className="text-[10px] text-[#A39E93]">{poDate}</div>
                </div>

                <div className="px-2 border-r border-[#EEEAE2] text-[11px] truncate">
                  {String(o.status || "—").replaceAll("_", " ")}
                </div>

                <div className="px-2 border-r border-[#EEEAE2] text-[11px]">
                  {docs.length ? (
                    <span className="inline-flex items-center gap-1">
                      <FileText size={14} className="text-[#A39E93]" />
                      <span className="font-semibold">{docs.length}</span>
                    </span>
                  ) : (
                    <span className="text-[#A39E93]">0</span>
                  )}
                </div>

                <div className="px-2 text-[11px] text-[#1A1A1A]">{formatDate(o.createdAt)}</div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setExpanded((p) => ({ ...p, [o.id]: !isOpen }))}
                    className={cn("p-1 transition-all", isOpen ? "bg-black text-white" : "text-[#A39E93]")}
                    aria-label="Expand"
                  >
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Expanded: Documents list */}
              {isOpen && (
                <div className="bg-[#FBF9F6] border-y border-[#EEEAE2] p-6 animate-in fade-in duration-300">
                  <div className="bg-white border border-[#EEEAE2] rounded-sm overflow-hidden">
                    <div className="px-4 py-2 border-b border-[#F2EFE9] flex items-center justify-between">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[#A39E93]">
                        Attached Documents
                      </div>
                      <div className="text-[10px] text-[#A39E93] font-mono">Order ID: {o.id}</div>
                    </div>

                    {docs.length ? (
                      <div className="divide-y divide-[#F2EFE9]">
                        {docs
                          .filter((d) => (docType === "ALL" ? true : docTypeLabel(d) === docType))
                          .map((d) => {
                            const type = docTypeLabel(d);
                            const url = docUrl(d);
                            const canOpen = !!url;
                            const canDownload = !!url && !isDataUrl(url); // dataURL ko download avoid (browser heavy)
                            return (
                              <div key={d.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        "text-[8px] font-bold border px-1.5 py-0.5 rounded-sm uppercase whitespace-nowrap",
                                        typePill(type)
                                      )}
                                    >
                                      {type}
                                    </span>
                                    <div className="text-[11px] font-semibold text-black truncate">
                                      {d?.title || d?.name || type}
                                    </div>
                                  </div>
                                  <div className="text-[10px] text-[#A39E93] mt-1">
                                    Uploaded: {formatDate(d?.createdAt || o.createdAt)}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {canOpen ? (
                                    <a
                                      href={url}
                                      target="_blank"
                                      className="text-[10px] px-3 py-1.5 rounded-lg border border-[#E5E0D8] bg-white hover:bg-black hover:text-white transition whitespace-nowrap inline-flex items-center gap-1"
                                    >
                                      <ExternalLink size={13} />
                                      Open
                                    </a>
                                  ) : (
                                    <span className="text-[10px] text-[#A39E93]">No File</span>
                                  )}

                                  {canDownload ? (
                                    <a
                                      href={url}
                                      className="text-[10px] px-3 py-1.5 rounded-lg border border-[#E5E0D8] bg-white hover:bg-black hover:text-white transition whitespace-nowrap inline-flex items-center gap-1"
                                    >
                                      <Download size={13} />
                                      Download
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="p-6 text-[11px] text-[#A39E93]">No documents uploaded yet for this order.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!filtered.length && <div className="p-8 text-[11px] text-[#A39E93]">No matching orders/documents.</div>}
      </div>
    </div>
  );
}