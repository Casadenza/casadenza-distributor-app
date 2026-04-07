"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  ExternalLink,
  Minus,
  Plus,
  Filter,
  File,
  FileImage,
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

function docTypeLabel(d: any) {
  return String(d?.type || d?.docType || d?.title || d?.name || "Document");
}

function formatDate(dt: any) {
  try {
    return new Date(dt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function getOpenUrl(docId: string) {
  return `/api/documents/${docId}`;
}

function getDownloadUrl(docId: string) {
  return `/api/documents/${docId}/download`;
}

function isDataUrl(u: string) {
  return String(u || "").startsWith("data:");
}

function getDownloadFileName(doc: any) {
  const raw = String(doc?.title || doc?.name || docTypeLabel(doc) || "document")
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return raw.toLowerCase().endsWith(".pdf") ? raw : `${raw}.pdf`;
}

async function forceDownloadFile(url: string, fileName: string) {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error("Download failed");

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.URL.revokeObjectURL(blobUrl);
}

function FileIcon({
  fileName,
  className,
}: {
  fileName: string;
  className?: string;
}) {
  const ext = fileName?.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    return <FileText className={cn("text-rose-600", className)} size={20} />;
  }

  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
    return <FileImage className={cn("text-sky-600", className)} size={20} />;
  }

  return <File className={cn("text-slate-400", className)} size={20} />;
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: string;
}) {
  const styles: Record<string, string> = {
    default: "bg-slate-100 text-slate-600 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    danger: "bg-rose-50 text-rose-700 border-rose-100",
    info: "bg-sky-50 text-sky-700 border-sky-100",
  };

  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight border",
        styles[variant]
      )}
    >
      {children}
    </span>
  );
}

function getStatusVariant(status: string) {
  const s = String(status || "").toLowerCase();

  if (
    s.includes("delivered") ||
    s.includes("completed") ||
    s.includes("approved") ||
    s.includes("paid")
  ) {
    return "success";
  }

  if (
    s.includes("processing") ||
    s.includes("in progress") ||
    s.includes("ready") ||
    s.includes("production")
  ) {
    return "warning";
  }

  if (
    s.includes("dispatch") ||
    s.includes("shipped") ||
    s.includes("transit")
  ) {
    return "info";
  }

  if (
    s.includes("cancel") ||
    s.includes("reject") ||
    s.includes("failed")
  ) {
    return "danger";
  }

  return "default";
}

function DocumentPreviewLightbox({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: any | null;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);

  if (!open || !item) return null;

  const src = getOpenUrl(String(item.id));
  const title = item.title || item.name || "Preview Document";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative flex h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileIcon
              fileName={String(item.url || item.name || "")}
              className="h-5 w-5 flex-shrink-0"
            />
            <span className="line-clamp-1 text-sm font-semibold text-slate-800">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1">
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
                className="rounded p-1 hover:bg-slate-50"
              >
                <Minus size={14} />
              </button>

              <span className="w-12 text-center text-[11px] font-medium text-slate-500">
                {Math.round(zoom * 100)}%
              </span>

              <button
                onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}
                className="rounded p-1 hover:bg-slate-50"
              >
                <Plus size={14} />
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 transition-colors hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 justify-center overflow-auto bg-slate-50 p-6">
          <iframe
            src={`${src}#view=FitH&zoom=${Math.round(zoom * 100)}`}
            className="h-full w-full max-w-4xl rounded-sm bg-white shadow-lg"
            title={title}
          />
        </div>
      </div>
    </div>
  );
}

export default function DocumentsClient({
  initialOrders,
}: {
  initialOrders: any[];
}) {
  const [orders] = useState<any[]>(initialOrders || []);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [q, setQ] = useState("");
  const [docType, setDocType] = useState("ALL");

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const meta = safeParseNotes(o.notes) || {};
      const po = meta?.poNumber
        ? `PO-${meta.poNumber}`
        : `ORD-${String(o.id).slice(-6)}`;
      const haystack = `${po} ${JSON.stringify(meta)} ${JSON.stringify(
        o?.documents || []
      )} ${String(o?.status || "")}`.toLowerCase();

      if (q && !haystack.includes(q.toLowerCase())) return false;

      if (
        docType !== "ALL" &&
        !(o?.documents || []).some((d: any) => docTypeLabel(d) === docType)
      ) {
        return false;
      }

      return true;
    });
  }, [orders, q, docType]);

  const docTypeOptions = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) =>
      o.documents?.forEach((d: any) => set.add(docTypeLabel(d)))
    );
    return ["ALL", ...Array.from(set).sort()];
  }, [orders]);

  return (
    <>
      <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 antialiased">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="h-8 w-1 rounded-full bg-indigo-600" />
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  Document Management
                </h1>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Distributor documents and order files
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden md:block group">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search orders..."
                  className="h-9 w-64 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                />
                {q ? (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                  >
                    <X size={13} />
                  </button>
                ) : null}
              </div>

              <button
                onClick={() => window.location.reload()}
                className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-6 py-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="h-8 cursor-pointer rounded-md border-none bg-transparent pr-6 text-xs font-bold text-slate-700 outline-none"
              >
                {docTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t === "ALL" ? "All Documents" : t}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-medium text-slate-500">
              Showing {filtered.length} total orders
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Reference / PO</th>
                  <th className="px-6 py-4">Order Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Files</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtered.map((o) => {
                  const meta = safeParseNotes(o.notes) || {};
                  const po = meta?.poNumber
                    ? `PO-${meta.poNumber}`
                    : `ORD-${String(o.id).slice(-6)}`;
                  const isExpanded = !!expanded[o.id];
                  const docs = (o?.documents || []) as any[];
                  const statusText = String(o.status || "Pending");

                  return (
                    <React.Fragment key={o.id}>
                      <tr
                        className={cn(
                          "group transition-colors hover:bg-slate-50/50",
                          isExpanded && "bg-slate-50/50"
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "h-2 w-2 rounded-full",
                                docs.length > 0 ? "bg-emerald-500" : "bg-slate-300"
                              )}
                            />
                            <span className="text-sm font-bold text-slate-800">
                              {po}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-600">
                          {formatDate(o.createdAt)}
                        </td>

                        <td className="px-6 py-4">
                          <Badge variant={getStatusVariant(statusText)}>
                            {statusText}
                          </Badge>
                        </td>

                        <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                          {docs.length} Files
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() =>
                              setExpanded((p) => ({ ...p, [o.id]: !isExpanded }))
                            }
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200",
                              isExpanded &&
                                "border-indigo-600 bg-indigo-600 text-white"
                            )}
                          >
                            {isExpanded ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </button>
                        </td>
                      </tr>

                      {isExpanded ? (
                        <tr className="bg-white">
                          <td
                            colSpan={5}
                            className="border-b border-slate-200 px-8 py-6"
                          >
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                              {docs.length > 0 ? (
                                docs.map((d) => (
                                  <div
                                    key={d.id}
                                    className="flex flex-col rounded-lg border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-200/5 transition-all hover:ring-indigo-100"
                                  >
                                    <div className="mb-3 flex items-start justify-between gap-2">
                                      <div className="flex min-w-0 flex-col gap-0.5">
                                        <span className="text-[9px] font-bold uppercase text-indigo-600">
                                          {docTypeLabel(d)}
                                        </span>
                                        <span className="line-clamp-1 text-xs font-bold text-slate-800">
                                          {d.title || "Unnamed Document"}
                                        </span>
                                      </div>

                                      <FileIcon
                                        fileName={String(
                                          d.url || d.name || d.title || ""
                                        )}
                                        className="flex-shrink-0"
                                      />
                                    </div>

                                    <div className="mb-3 text-[10px] text-slate-500">
                                      PDF document
                                    </div>

                                    <div className="mt-auto flex items-center gap-2">
                                      {d?.id ? (
                                        <button
                                          onClick={() => setPreviewDoc(d)}
                                          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-slate-900 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-slate-800"
                                        >
                                          <ExternalLink size={12} />
                                          Preview
                                        </button>
                                      ) : null}

                                      {d?.id && !isDataUrl(String(d?.url || "")) ? (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await forceDownloadFile(
                                                getDownloadUrl(String(d.id)),
                                                getDownloadFileName(d)
                                              );
                                            } catch {
                                              window.open(
                                                getDownloadUrl(String(d.id)),
                                                "_blank"
                                              );
                                            }
                                          }}
                                          className="flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                                          title="Download"
                                        >
                                          <Download size={14} />
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="col-span-full py-4 text-center text-xs italic text-slate-400">
                                  No files attached.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      <DocumentPreviewLightbox
        open={!!previewDoc}
        item={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </>
  );
}