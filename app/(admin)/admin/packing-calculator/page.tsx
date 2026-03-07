"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  RefreshCw,
  Save,
  Trash2,
  Pencil,
  Eye,
  ChevronRight,
  Layers,
  Settings2,
  Download,
  Upload,
} from "lucide-react";

// --- Casadenza Theme Logic & Components ---
const toNum = (v: any, fallback = 0) => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
};
const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));

// Reusable Slim UI Components
const SlimLabel = ({ children }: { children: any }) => (
  <div className="text-[9px] font-bold text-[#A39E93] uppercase tracking-[0.15em] mb-1 ml-0.5">{children}</div>
);

const SlimInput = (props: any) => (
  <input
    {...props}
    className={`w-full bg-[#FDFDFD] border border-[#EAE7E2] rounded px-3 py-1.5 text-[12px] transition-all outline-none focus:border-[#C5A267] ${
      props.className || ""
    }`}
  />
);

const SlimSelect = (props: any) => (
  <div className="relative">
    <select
      {...props}
      className={`w-full bg-[#FDFDFD] border border-[#EAE7E2] rounded px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider outline-none focus:border-[#C5A267] appearance-none cursor-pointer ${
        props.className || ""
      }`}
    />
    <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#C5A267] rotate-90 pointer-events-none" />
  </div>
);

const SlimButton = ({ variant = "primary", children, ...props }: any) => {
  const styles = {
    primary: "bg-black text-white hover:bg-[#2A2A2A]",
    secondary: "bg-white border border-[#EAE7E2] text-black hover:bg-[#F9F8F6]",
    danger: "bg-[#FFF5F5] text-[#9B1C1C] border border-[#F2C7C7] hover:bg-[#FEE2E2]",
  };
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded text-[10px] font-bold tracking-[0.1em] uppercase transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 ${
        (styles as any)[variant]
      }`}
    >
      {children}
    </button>
  );
};

// --- API Helpers ---
async function jget(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || j?.detail || `HTTP ${r.status}`);
  return j;
}

async function jsend(url: string, method: string, body: any) {
  const r = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || j?.detail || `HTTP ${r.status}`);
  return j;
}

async function uploadFile(url: string, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(url, { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || j?.detail || `HTTP ${r.status}`);
  return j;
}

function parseVariants(data: any) {
  const itemsRaw = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  const out: any[] = [];
  for (const it of itemsRaw) {
    const v = it?.variant ?? it;
    const p = it?.product ?? it;
    const id = String(v?.id || it?.id || "").trim();
    const collection = String(p?.collection ?? v?.collection ?? "").trim();
    const stoneType = String(p?.stoneType ?? v?.stoneType ?? "").trim();
    const sizeLabel = String(v?.sizeLabel ?? v?.sizeName ?? v?.size ?? it?.sizeLabel ?? "").trim();
    if (!id || !collection || !stoneType || !sizeLabel) continue;
    out.push({ id, collection, stoneType, sizeLabel });
  }
  const seen = new Set<string>();
  const dedup: any[] = [];
  for (const x of out) {
    const k = `${x.collection}|||${x.stoneType}|||${x.sizeLabel}`;
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(x);
  }
  return dedup.sort((a, b) => a.collection.localeCompare(b.collection));
}

// --- Main Page Component ---
export default function AdminPackingCalculatorPage() {
  const [tab, setTab] = useState<"sheet" | "rules">("sheet");

  return (
    <div className="min-h-screen bg-[#F9F8F6] p-4 lg:p-8 font-sans text-[#1A1A1A]">
      <div className="max-w-[1500px] mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-xl font-light tracking-widest text-[#1A1A1A]">
              LOGISTICS <span className="font-bold text-[#C5A267]">STUDIO</span>
            </h1>
            <p className="text-[10px] text-[#A39E93] font-bold uppercase tracking-widest mt-1">
              Management of weights and rule engines
            </p>
          </div>

          <div className="flex bg-[#EAE7E2]/50 p-1 rounded border border-[#EAE7E2]">
            <button
              onClick={() => setTab("sheet")}
              className={`px-5 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase transition-all ${
                tab === "sheet" ? "bg-white text-black shadow-sm" : "text-[#8C877D]"
              }`}
            >
              Weight Master
            </button>
            <button
              onClick={() => setTab("rules")}
              className={`px-5 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase transition-all ${
                tab === "rules" ? "bg-white text-black shadow-sm" : "text-[#8C877D]"
              }`}
            >
              Packing Rules
            </button>
          </div>
        </header>

        {tab === "sheet" ? <SheetWeightMaster /> : <PackingRulesMaster />}
      </div>
    </div>
  );
}

/* ========================= Module: Sheet Weight Master ========================= */
function SheetWeightMaster() {
  const [isPending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  const importRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    id: "",
    collection: "",
    stoneType: "",
    sizeLabel: "",
    perSheet: "",
    active: true,
  });

  const loadAll = async () => {
    setErr(null);
    try {
      let vData;
      try {
        vData = await jget("/api/admin/packing/variants?take=10000&active=1");
      } catch {
        vData = await jget("/api/packing/variants?take=10000&active=1");
      }
      setVariants(parseVariants(vData));
      const list = await jget("/api/admin/packing/sheet-weights?take=5000");
      setRows(list?.items || []);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    start(loadAll);
  }, []);

  const collections = useMemo(() => uniq(variants.map((v) => v.collection)), [variants]);
  const stoneTypes = useMemo(
    () => uniq(variants.filter((v) => !form.collection || v.collection === form.collection).map((v) => v.stoneType)),
    [variants, form.collection]
  );
  const sizes = useMemo(
    () =>
      uniq(
        variants
          .filter((v) => (!form.collection || v.collection === form.collection) && (!form.stoneType || v.stoneType === form.stoneType))
          .map((v) => v.sizeLabel)
      ),
    [variants, form.collection, form.stoneType]
  );

  const filtered = rows.filter((r) => `${r.collection} ${r.stoneType} ${r.sizeLabel}`.toLowerCase().includes(q.toLowerCase()));

  const save = () => {
    setErr(null);
    start(async () => {
      try {
        if (!form.collection || !form.stoneType || !form.sizeLabel) throw new Error("Missing selection.");

        const { id, perSheet, active, ...rest } = form;

        await jsend("/api/admin/packing/sheet-weights", "POST", {
          ...rest,
          id: id || undefined,
          perSheetWeightKg: toNum(perSheet),
          isActive: active,
        });

        setForm({ id: "", collection: "", stoneType: "", sizeLabel: "", perSheet: "5", active: true });
        loadAll();
      } catch (e: any) {
        setErr(e.message);
      }
    });
  };

  const downloadTemplate = () => {
    window.location.href = "/api/admin/packing/sheet-weights-template";
  };

  const openImport = () => {
    if (importRef.current) importRef.current.click();
  };

  const onImport = (file?: File | null) => {
    if (!file) return;
    setErr(null);
    start(async () => {
      try {
        const res = await uploadFile("/api/admin/packing/import-sheet-weights", file);
        const updated = res?.updated ?? 0;
        const skipped = res?.skipped ?? 0;
        alert(`Weight Master Import Done\nUpdated: ${updated}\nSkipped: ${skipped}`);
        await loadAll();
      } catch (e: any) {
        setErr(e.message);
      } finally {
        if (importRef.current) importRef.current.value = "";
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4">
        <div className="bg-white rounded-xl p-6 border border-[#EAE7E2] shadow-sm sticky top-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-[#C5A267]">
              <Layers className="w-4 h-4" />
              <h2 className="text-[11px] font-bold uppercase tracking-widest">Weight Master</h2>
            </div>
            <button onClick={() => start(loadAll)}>
              <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${isPending && "animate-spin"}`} />
            </button>
          </div>

          {err && <div className="mb-4 p-2 text-[10px] bg-red-50 border border-red-100 text-red-600 rounded">{err}</div>}

          <div className="space-y-4">
            <div>
              <SlimLabel>Collection</SlimLabel>
              <SlimSelect
                value={form.collection}
                onChange={(e: any) => setForm({ ...form, collection: e.target.value, stoneType: "", sizeLabel: "" })}
              >
                <option value="">Choose...</option>
                {collections.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </SlimSelect>
            </div>
            <div>
              <SlimLabel>Stone Type</SlimLabel>
              <SlimSelect
                value={form.stoneType}
                disabled={!form.collection}
                onChange={(e: any) => setForm({ ...form, stoneType: e.target.value, sizeLabel: "" })}
              >
                <option value="">Choose...</option>
                {stoneTypes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SlimSelect>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <SlimLabel>Size</SlimLabel>
                <SlimSelect
                  value={form.sizeLabel}
                  disabled={!form.stoneType}
                  onChange={(e: any) => setForm({ ...form, sizeLabel: e.target.value })}
                >
                  <option value="">Choose...</option>
                  {sizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </SlimSelect>
              </div>
              <div>
                <SlimLabel>Weight (KG)</SlimLabel>
                <SlimInput value={form.perSheet} onChange={(e: any) => setForm({ ...form, perSheet: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <label className="flex items-center gap-2 text-[10px] font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="accent-black"
                />
                ACTIVE
              </label>
              <SlimButton onClick={save} disabled={isPending}>
                {form.id ? "Update Entry" : "Save Entry"}
              </SlimButton>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 bg-white rounded-xl border border-[#EAE7E2] overflow-hidden shadow-sm">
        <div className="p-3 bg-[#FBFAF8] border-b border-[#EAE7E2] flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <input
            className="bg-transparent text-[12px] outline-none w-full md:w-[55%]"
            placeholder="Quick Search Master..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <div className="flex items-center gap-2 justify-end">
            <SlimButton variant="secondary" onClick={downloadTemplate} disabled={isPending}>
              <Download className="w-3.5 h-3.5" /> Template
            </SlimButton>

            <SlimButton variant="secondary" onClick={openImport} disabled={isPending}>
              <Upload className="w-3.5 h-3.5" /> Import
            </SlimButton>

            <button
              onClick={() => start(loadAll)}
              className="p-2 rounded border border-transparent hover:border-[#EAE7E2] hover:bg-white/70 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${isPending && "animate-spin"}`} />
            </button>

            <input
              ref={importRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => onImport(e.target.files?.[0])}
            />
          </div>
        </div>

        <table className="w-full text-left text-[11px]">
          <thead className="bg-[#FDFDFD] text-[#A39E93] border-b border-[#F0EEE9]">
            <tr>
              <th className="px-6 py-3 font-bold uppercase tracking-widest">Collection / Type</th>
              <th className="px-6 py-3 font-bold uppercase tracking-widest text-right">Unit Weight</th>
              <th className="px-6 py-3 font-bold uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EEE9]">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-[#F9F8F6] transition-colors group">
                <td className="px-6 py-2.5">
                  <div className="font-bold">{r.collection}</div>
                  <div className="text-[10px] text-[#8C877D]">
                    {r.stoneType} • {r.sizeLabel}
                  </div>
                </td>
                <td className="px-6 py-2.5 text-right font-mono text-[13px]">
                  {r.perSheetWeightKg} <span className="text-[9px] text-gray-400">KG</span>
                </td>
                <td className="px-6 py-2.5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() =>
                        setForm({
                          id: r.id,
                          collection: r.collection,
                          stoneType: r.stoneType,
                          sizeLabel: r.sizeLabel,
                          perSheet: String(r.perSheetWeightKg),
                          active: r.isActive,
                        })
                      }
                      className="p-1.5 hover:text-[#C5A267]"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        start(async () => {
                          await jsend("/api/admin/packing/sheet-weights", "DELETE", { id: r.id });
                          loadAll();
                        })
                      }
                      className="p-1.5 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-[11px] text-[#8C877D]">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ========================= Module: Packing Rules Master ========================= */
function PackingRulesMaster() {
  const [isPending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<any>(null);

  const importRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    id: "",
    packingType: "PALLET",
    sizeLabel: "",
    qtyMin: "0",
    qtyMax: "5",
    dimLIn: "50",
    dimWIn: "25",
    dimHIn: "15",
    packingWeightKg: "20",
    isDefault: false,
    isActive: true,
    previewQty: "5",
  });

  const loadAll = async () => {
    setErr(null);
    try {
      let vData;
      try {
        vData = await jget("/api/admin/packing/variants?take=10000&active=1");
      } catch {
        vData = await jget("/api/packing/variants?take=10000&active=1");
      }
      setVariants(parseVariants(vData));
      const rData = await jget("/api/admin/packing/packing-rules?take=5000");
      setRows(rData?.items || []);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    start(loadAll);
  }, []);

  const sizes = useMemo(() => uniq(variants.map((v) => v.sizeLabel)), [variants]);

  const save = () => {
    setErr(null);
    start(async () => {
      try {
        if (!form.sizeLabel) throw new Error("Size is required.");

        const { previewQty, ...rest } = form;

        await jsend("/api/admin/packing/packing-rules", "POST", {
          ...rest,
          id: rest.id || undefined,
          qtyMin: toNum(rest.qtyMin),
          qtyMax: toNum(rest.qtyMax),
          dimLIn: toNum(rest.dimLIn),
          dimWIn: toNum(rest.dimWIn),
          dimHIn: toNum(rest.dimHIn),
          packingWeightKg: toNum(rest.packingWeightKg),
        });

        setForm({ ...form, id: "" });
        loadAll();
      } catch (e: any) {
        setErr(e.message);
      }
    });
  };

  const doPreview = () => {
    const qty = toNum(form.previewQty);
    const list = rows
      .filter((r) => r.isActive && r.packingType === form.packingType && r.sizeLabel === form.sizeLabel)
      .sort((a, b) => a.qtyMin - b.qtyMin);
    const match = list.find((r) => qty >= r.qtyMin && qty <= r.qtyMax) || list.find((r) => r.isDefault);
    setPreview(match || { error: "No rule found" });
  };

  const downloadTemplate = () => {
    window.location.href = "/api/admin/packing/packing-rules-template";
  };

  const openImport = () => {
    if (importRef.current) importRef.current.click();
  };

  const onImport = (file?: File | null) => {
    if (!file) return;
    setErr(null);
    start(async () => {
      try {
        const res = await uploadFile("/api/admin/packing/import-packing-rules", file);
        const updated = res?.updated ?? 0;
        const skipped = res?.skipped ?? 0;
        alert(`Packing Rules Import Done\nUpdated: ${updated}\nSkipped: ${skipped}`);
        await loadAll();
      } catch (e: any) {
        setErr(e.message);
      } finally {
        if (importRef.current) importRef.current.value = "";
      }
    });
  };

  const filtered = rows.filter((r) => `${r.packingType} ${r.sizeLabel} ${r.qtyMin}-${r.qtyMax}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4">
        <div className="bg-white rounded-xl p-6 border border-[#EAE7E2] shadow-sm sticky top-6">
          <div className="flex items-center gap-2 mb-6 text-[#C5A267]">
            <Settings2 className="w-4 h-4" />
            <h2 className="text-[11px] font-bold uppercase tracking-widest">Logic Engine</h2>
          </div>

          {err && <div className="mb-4 p-2 text-[10px] bg-red-50 border border-red-100 text-red-600 rounded">{err}</div>}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <SlimLabel>Packing Type</SlimLabel>
                <SlimSelect value={form.packingType} onChange={(e: any) => setForm({ ...form, packingType: e.target.value })}>
                  <option value="ROLL">ROLL</option>
                  <option value="PALLET">PALLET</option>
                  <option value="CRATE">CRATE</option>
                </SlimSelect>
              </div>
              <div>
                <SlimLabel>Sheet Size</SlimLabel>
                <SlimSelect value={form.sizeLabel} onChange={(e: any) => setForm({ ...form, sizeLabel: e.target.value })}>
                  <option value="">Select Size</option>
                  {sizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </SlimSelect>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <SlimLabel>Qty Min</SlimLabel>
                <SlimInput value={form.qtyMin} onChange={(e: any) => setForm({ ...form, qtyMin: e.target.value })} />
              </div>
              <div>
                <SlimLabel>Qty Max</SlimLabel>
                <SlimInput value={form.qtyMax} onChange={(e: any) => setForm({ ...form, qtyMax: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <SlimLabel>L (In)</SlimLabel>
                <SlimInput value={form.dimLIn} onChange={(e: any) => setForm({ ...form, dimLIn: e.target.value })} />
              </div>
              <div>
                <SlimLabel>W (In)</SlimLabel>
                <SlimInput value={form.dimWIn} onChange={(e: any) => setForm({ ...form, dimWIn: e.target.value })} />
              </div>
              <div>
                <SlimLabel>H (In)</SlimLabel>
                <SlimInput value={form.dimHIn} onChange={(e: any) => setForm({ ...form, dimHIn: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <SlimLabel>Weight (KG)</SlimLabel>
                <SlimInput
                  value={form.packingWeightKg}
                  onChange={(e: any) => setForm({ ...form, packingWeightKg: e.target.value })}
                />
              </div>
              <div className="flex flex-col justify-end gap-1 pb-1">
                <label className="text-[10px] font-bold flex items-center gap-2 cursor-pointer uppercase">
                  <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />{" "}
                  Default
                </label>
                <label className="text-[10px] font-bold flex items-center gap-2 cursor-pointer uppercase">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />{" "}
                  Active
                </label>
              </div>
            </div>

            <div className="mt-4 p-3 bg-[#FBFAF8] rounded border border-[#EAE7E2]">
              <SlimLabel>Rule Simulator</SlimLabel>
              <div className="flex gap-2 mb-2">
                <SlimInput value={form.previewQty} onChange={(e: any) => setForm({ ...form, previewQty: e.target.value })} placeholder="Qty" />
                <SlimButton variant="secondary" onClick={doPreview}>
                  <Eye className="w-3 h-3" /> Test
                </SlimButton>
              </div>
              {preview && (
                <div className="text-[10px] text-[#8C877D] italic border-t pt-2 border-gray-100">
                  {preview.error
                    ? preview.error
                    : `Matched: ${preview.dimLIn}x${preview.dimWIn}x${preview.dimHIn} | ${
                        preview.isDefault ? "Using Default" : "Range Match"
                      }`}
                </div>
              )}
            </div>

            <SlimButton onClick={save} disabled={isPending} className="w-full mt-2">
              <Save className="w-4 h-4" /> {form.id ? "Update Protocol" : "Deploy Rule"}
            </SlimButton>
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 bg-white rounded-xl border border-[#EAE7E2] overflow-hidden shadow-sm">
        <div className="p-3 bg-[#FBFAF8] border-b border-[#EAE7E2] flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <input
            className="bg-transparent text-[12px] outline-none w-full md:w-[55%]"
            placeholder="Search rules (type / size / range)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <div className="flex items-center gap-2 justify-end">
            <SlimButton variant="secondary" onClick={downloadTemplate} disabled={isPending}>
              <Download className="w-3.5 h-3.5" /> Template
            </SlimButton>

            <SlimButton variant="secondary" onClick={openImport} disabled={isPending}>
              <Upload className="w-3.5 h-3.5" /> Import
            </SlimButton>

            <button
              onClick={() => start(loadAll)}
              className="p-2 rounded border border-transparent hover:border-[#EAE7E2] hover:bg-white/70 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${isPending && "animate-spin"}`} />
            </button>

            <input
              ref={importRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => onImport(e.target.files?.[0])}
            />
          </div>
        </div>

        <table className="w-full text-left text-[11px]">
          <thead className="bg-[#FBFAF8] text-[#A39E93] border-b border-[#EAE7E2]">
            <tr>
              <th className="px-6 py-4 font-bold uppercase tracking-widest">Protocol</th>
              <th className="px-6 py-4 font-bold uppercase tracking-widest">Dimensions & Weight</th>
              <th className="px-6 py-4 font-bold uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EEE9]">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-[#F9F8F6] transition-colors group">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] bg-black text-white px-1.5 py-0.5 rounded font-bold">{r.packingType}</span>
                    <span className="font-bold">{r.sizeLabel}</span>
                    {r.isDefault && (
                      <span className="text-[8px] border border-[#C5A267] text-[#C5A267] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#8C877D] font-medium tracking-wide italic">
                    {r.qtyMin}–{r.qtyMax} PCS
                  </div>
                </td>
                <td className="px-6 py-3 font-mono text-[#8C877D] text-[12px]">
                  {r.dimLIn}×{r.dimWIn}×{r.dimHIn}″ <span className="mx-2 text-gray-300">|</span> {r.packingWeightKg} KG
                </td>
                <td className="px-6 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => {
                        setForm({
                          ...form,
                          id: r.id,
                          packingType: r.packingType,
                          sizeLabel: r.sizeLabel,
                          qtyMin: String(r.qtyMin),
                          qtyMax: String(r.qtyMax),
                          dimLIn: String(r.dimLIn),
                          dimWIn: String(r.dimWIn),
                          dimHIn: String(r.dimHIn),
                          packingWeightKg: String(r.packingWeightKg),
                          isDefault: r.isDefault,
                          isActive: r.isActive,
                        });
                        setPreview(null);
                      }}
                      className="p-1.5 hover:text-[#C5A267] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        start(async () => {
                          await jsend("/api/admin/packing/packing-rules", "DELETE", { id: r.id });
                          loadAll();
                        })
                      }
                      className="p-1.5 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-[11px] text-[#8C877D]">
                  No rules found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}