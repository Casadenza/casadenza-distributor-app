"use client";

import { useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  FileUp,
  FileText,
  Download,
  ExternalLink,
  Trash2,
  Loader2,
} from "lucide-react";

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

function formatDate(dt: any) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return "—";
  }
}

function docTypeLabel(d: any) {
  return String(d?.type || d?.docType || d?.title || d?.name || "Document");
}

function docUrl(d: any) {
  const base = String(d?.url || "").trim();
  if (!base) return "";
  if (base.includes("res.cloudinary.com") && base.toLowerCase().endsWith(".pdf")) {
    return `${base}?download=0`;
  }
  return base;
}

function isDataUrl(u: string) {
  return u.startsWith("data:");
}

const labelCls = "text-[9px] font-bold text-[#A39E93] uppercase tracking-[0.1em] mb-1";

const DOC_TYPES = [
  "PROFORMA_INVOICE",
  "COMMERCIAL_INVOICE",
  "PACKING_LIST",
  "BILL_OF_LADING",
  "AIR_WAYBILL",
  "CERTIFICATE_OF_ORIGIN",
  "FUMIGATION_CERTIFICATE",
  "INSURANCE_CERTIFICATE",
  "INSPECTION_CERTIFICATE",
  "PHOTOS_PDF",
  "OTHER",
];

function typePill(type: string) {
  const t = type.toUpperCase();
  if (t.includes("PROFORMA")) return "bg-indigo-50 text-indigo-600 border-indigo-100";
  if (t.includes("COMMERCIAL")) return "bg-emerald-50 text-emerald-600 border-emerald-100";
  if (t.includes("PACK")) return "bg-amber-50 text-amber-700 border-amber-100";
  if (t.includes("BL") || t.includes("BILL") || t.includes("AWB") || t.includes("AIR")) return "bg-slate-50 text-slate-600 border-slate-200";
  if (t.includes("ORIGIN") || t.includes("COO")) return "bg-zinc-50 text-zinc-600 border-zinc-200";
  if (t.includes("FUMIGATION")) return "bg-rose-50 text-rose-600 border-rose-100";
  return "bg-zinc-50 text-zinc-600 border-zinc-200";
}

export default function AdminDocumentsClient({ initialOrders }: { initialOrders: any[] }) {
  const [orders, setOrders] = useState<any[]>(initialOrders || []);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [q, setQ] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("ALL");

  // Upload form state (per order)
  const [uploadState, setUploadState] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({}); // docId -> bool

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
      const distributorName =
        o?.distributor?.name || o?.distributor?.companyName || o?.distributor?.email || "";
      const haystack = `${po} ${distributorName} ${JSON.stringify(meta)} ${JSON.stringify(o?.documents || [])}`.toLowerCase();

      if (q && !haystack.includes(q.toLowerCase())) return false;

      if (docTypeFilter !== "ALL") {
        const has = (o?.documents || []).some((d: any) => docTypeLabel(d) === docTypeFilter);
        if (!has) return false;
      }
      return true;
    });
  }, [orders, q, docTypeFilter]);

  async function refreshOrder(orderId: string) {
    // Optional endpoint (Step 3 me banega) — if not present, fallback to reload
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("No order endpoint");
      const data = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
    } catch {
      // Safe fallback
      window.location.reload();
    }
  }

  async function uploadDoc(orderId: string) {
    const st = uploadState[orderId] || {};
    const file: File | undefined = st.file;
    const type = String(st.type || "OTHER");
    const title = String(st.title || "").trim();

    if (!file) {
      alert("Please select a PDF file.");
      return;
    }

    setBusy((p) => ({ ...p, [orderId]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      fd.append("title", title || type);

      const res = await fetch(`/api/admin/orders/${orderId}/documents`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Upload failed");
      }

      // Clear form
      setUploadState((p) => ({ ...p, [orderId]: { type: "OTHER", title: "", file: undefined } }));

      // Refresh order docs
      await refreshOrder(orderId);
    } catch (e: any) {
      alert(e?.message || "Upload failed");
    } finally {
      setBusy((p) => ({ ...p, [orderId]: false }));
    }
  }

  async function deleteDoc(orderId: string, docId: string) {
    const ok = confirm("Delete this document?");
    if (!ok) return;

    setDeleting((p) => ({ ...p, [docId]: true }));
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Delete failed");
      }
      await refreshOrder(orderId);
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    } finally {
      setDeleting((p) => ({ ...p, [docId]: false }));
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Sticky Header (My Orders style) */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#EEEAE2] shadow-sm">
        <div className="px-4 py-3 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[160px]">
            <h1 className="text-sm font-serif font-bold uppercase tracking-[0.2em]">Admin Documents</h1>
            <p className="text-[9px] text-[#A39E93] font-bold uppercase">{filtered.length} Orders</p>
          </div>

          <div className="w-[210px]">
            <div className={labelCls}>Search</div>
            <div className="relative border-b border-[#EEEAE2]">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full bg-transparent py-1 text-[11px] outline-none"
                placeholder="PO, distributor, BL..."
              />
              <Search className="absolute right-0 top-1 text-[#A39E93]" size={12} />
            </div>
          </div>

          <div className="w-[210px]">
            <div className={labelCls}>Filter by Existing Doc Type</div>
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
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
                setDocTypeFilter("ALL");
              }}
              className="p-1.5 border border-[#E5E0D8] bg-black text-white"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Table Head */}
      <div className="bg-[#FBF9F6] border-b border-[#EEEAE2] grid grid-cols-[1.4fr_1.2fr_0.9fr_0.9fr_40px] px-6 py-2 sticky top-[65px] z-30">
        <div className={labelCls}>Order Detail</div>
        <div className={labelCls}>Distributor</div>
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

          const distributorLabel =
            o?.distributor?.name ||
            o?.distributor?.companyName ||
            o?.distributor?.email ||
            o?.distributorId ||
            "—";

          const form = uploadState[o.id] || { type: "OTHER", title: "", file: undefined };
          const isBusy = !!busy[o.id];

          return (
            <div key={o.id} className="group">
              <div className="grid grid-cols-[1.4fr_1.2fr_0.9fr_0.9fr_40px] px-6 py-3 hover:bg-[#FDFCFB] transition-colors items-center">
                <div className="flex flex-col pr-4 border-r border-[#EEEAE2]">
                  <div className="text-[12px] font-bold text-black">{po}</div>
                  <div className="text-[10px] text-[#A39E93]">{poDate}</div>
                </div>

                <div className="px-2 border-r border-[#EEEAE2] text-[11px] truncate">
                  {String(distributorLabel)}
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

              {/* Expanded: Upload + Documents list */}
              {isOpen && (
                <div className="bg-[#FBF9F6] border-y border-[#EEEAE2] p-6 animate-in fade-in duration-300">
                  {/* Upload box */}
                  <div className="bg-white border border-[#EEEAE2] rounded-sm overflow-hidden mb-4">
                    <div className="px-4 py-2 border-b border-[#F2EFE9] flex items-center justify-between">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[#A39E93]">
                        Upload Document (PDF)
                      </div>
                      <div className="text-[10px] text-[#A39E93] font-mono">Order ID: {o.id}</div>
                    </div>

                    <div className="p-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_1.2fr_auto] gap-3 items-end">
                      <div>
                        <div className={labelCls}>Document Type</div>
                        <select
                          value={form.type}
                          onChange={(e) =>
                            setUploadState((p) => ({ ...p, [o.id]: { ...form, type: e.target.value } }))
                          }
                          className="w-full bg-transparent border-b border-[#EEEAE2] py-1 text-[11px] outline-none"
                        >
                          {DOC_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className={labelCls}>Title (optional)</div>
                        <input
                          value={form.title}
                          onChange={(e) =>
                            setUploadState((p) => ({ ...p, [o.id]: { ...form, title: e.target.value } }))
                          }
                          className="w-full bg-transparent border-b border-[#EEEAE2] py-1 text-[11px] outline-none"
                          placeholder="e.g., Proforma Invoice - Rev 1"
                        />
                      </div>

                      <div>
                        <div className={labelCls}>PDF File</div>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            setUploadState((p) => ({ ...p, [o.id]: { ...form, file: f } }));
                          }}
                          className="block w-full text-[11px]"
                        />
                        <div className="text-[10px] text-[#A39E93] mt-1">
                          Only PDF. Large files better for packing list/BL scans.
                        </div>
                      </div>

                      <button
                        disabled={isBusy}
                        onClick={() => uploadDoc(o.id)}
                        className={cn(
                          "h-9 px-4 rounded-lg border border-[#E5E0D8] bg-black text-white text-[11px] font-semibold inline-flex items-center gap-2 justify-center",
                          isBusy ? "opacity-70 cursor-not-allowed" : "hover:opacity-95"
                        )}
                      >
                        {isBusy ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
                        Upload
                      </button>
                    </div>
                  </div>

                  {/* Documents list */}
                  <div className="bg-white border border-[#EEEAE2] rounded-sm overflow-hidden">
                    <div className="px-4 py-2 border-b border-[#F2EFE9] flex items-center justify-between">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[#A39E93]">
                        Attached Documents
                      </div>
                      <div className="text-[10px] text-[#A39E93]">{docs.length} files</div>
                    </div>

                    {docs.length ? (
                      <div className="divide-y divide-[#F2EFE9]">
                        {docs.map((d) => {
                          const type = docTypeLabel(d);
                          const url = docUrl(d);
                          const canOpen = !!url;
                          const canDownload = !!url && !isDataUrl(url);
                          const delBusy = !!deleting[d.id];

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
                                    {type.replaceAll("_", " ")}
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

                                <button
                                  disabled={delBusy}
                                  onClick={() => deleteDoc(o.id, d.id)}
                                  className={cn(
                                    "text-[10px] px-3 py-1.5 rounded-lg border border-[#E5E0D8] bg-white hover:bg-black hover:text-white transition whitespace-nowrap inline-flex items-center gap-1",
                                    delBusy ? "opacity-70 cursor-not-allowed" : ""
                                  )}
                                >
                                  {delBusy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                  Delete
                                </button>
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

        {!filtered.length && <div className="p-8 text-[11px] text-[#A39E93]">No matching orders.</div>}
      </div>
    </div>
  );
}