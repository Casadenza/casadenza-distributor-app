"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Search,
  Upload,
  Loader2,
  Save,
  Trash2,
  Star,
  ImagePlus,
  Bell,
  MonitorSmartphone,
} from "lucide-react";

type Item = {
  id: string;
  sku: string;
  name: string;
  image: string | null;
  images: string[];
  collection: string | null;
  stoneType: string | null;
  isActive: boolean;
  isNewArrival: boolean;
  newArrivalPriority: number;
  updatedAt: string;
  launchDate: string | null;
  description: string | null;
};

type Draft = {
  collection: string;
  isNewArrival: boolean;
  newArrivalPriority: number;
  images: string[];
  launchDate: string;
  description: string;
};

const MAX_SIZE = 10 * 1024 * 1024;

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const direct = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function NewArrivalsAdminClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("ALL");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [uploadingMap, setUploadingMap] = useState<Record<string, boolean>>({});

  const [dashboardAlertEnabled, setDashboardAlertEnabled] = useState(true);
  const [popupAlertEnabled, setPopupAlertEnabled] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  async function load(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const [itemsRes, settingsRes] = await Promise.all([
        fetch("/api/admin/new-arrivals", { cache: "no-store" }),
        fetch("/api/settings/new-arrivals", { cache: "no-store" }),
      ]);

      const itemsJson = await itemsRes.json();
      const settingsJson = await settingsRes.json().catch(() => ({}));

      if (!itemsRes.ok) {
        throw new Error(itemsJson?.error || "Failed to load");
      }

      setItems(itemsJson.items || []);
      setDrafts({});

      if (settingsRes.ok) {
        setDashboardAlertEnabled(settingsJson.dashboardAlertEnabled !== false);
        setPopupAlertEnabled(settingsJson.popupAlertEnabled !== false);
      }
    } catch (error: any) {
      alert(error?.message || "Failed to load new arrivals");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSettingsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const collections = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const value = (item.collection || "").trim();
      if (value) set.add(value);
    }
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const search = q.trim().toLowerCase();
      const inSearch =
        !search ||
        item.name.toLowerCase().includes(search) ||
        item.sku.toLowerCase().includes(search) ||
        (item.collection || "").toLowerCase().includes(search);

      const inCollection =
        collectionFilter === "ALL" || (item.collection || "") === collectionFilter;

      return inSearch && inCollection;
    });
  }, [items, q, collectionFilter]);

  function getDraft(item: Item): Draft {
    return (
      drafts[item.id] || {
        collection: item.collection || "",
        isNewArrival: item.isNewArrival,
        newArrivalPriority: item.newArrivalPriority || 0,
        images: item.images || [],
        launchDate: toDateInputValue(item.launchDate),
        description: item.description || "",
      }
    );
  }

  function patchDraft(itemId: string, patch: Partial<Draft>) {
    const item = items.find((row) => row.id === itemId);
    if (!item) return;

    const current = getDraft(item);

    setDrafts((prev) => ({
      ...prev,
      [itemId]: {
        ...current,
        ...patch,
      },
    }));
  }

  async function uploadFiles(item: Item, fileList: FileList | null) {
    if (!fileList?.length) return;

    const files = Array.from(fileList);

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        alert(`${file.name}: only image files are allowed`);
        return;
      }

      if (file.size > MAX_SIZE) {
        alert(`${file.name}: max 10 MB allowed`);
        return;
      }
    }

    setUploadingMap((prev) => ({ ...prev, [item.id]: true }));

    try {
      const urls: string[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error || `Upload failed for ${file.name}`);
        }

        if (Array.isArray(json?.urls)) {
          urls.push(
            ...json.urls
              .filter((value: unknown): value is string => typeof value === "string")
              .map((value: string) => value.trim())
              .filter(Boolean)
          );
        } else if (json?.url && typeof json.url === "string") {
          urls.push(json.url.trim());
        }
      }

      const current = getDraft(item);

      patchDraft(item.id, {
        images: Array.from(new Set([...(current.images || []), ...urls])),
      });
    } catch (error: any) {
      alert(error?.message || "Upload failed");
    } finally {
      setUploadingMap((prev) => ({ ...prev, [item.id]: false }));
    }
  }

  async function saveItem(item: Item) {
    const draft = getDraft(item);

    setSavingMap((prev) => ({ ...prev, [item.id]: true }));

    try {
      const res = await fetch("/api/admin/new-arrivals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: item.id,
          collection: draft.collection,
          isNewArrival: draft.isNewArrival,
          newArrivalPriority: draft.newArrivalPriority,
          images: draft.images,
          launchDate: draft.launchDate,
          description: draft.description,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Save failed");
      }

      setItems((prev) => prev.map((row) => (row.id === item.id ? json.item : row)));

      setDrafts((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch (error: any) {
      alert(error?.message || "Save failed");
    } finally {
      setSavingMap((prev) => ({ ...prev, [item.id]: false }));
    }
  }

  async function saveAlertSettings() {
    setSettingsSaving(true);

    try {
      const res = await fetch("/api/settings/new-arrivals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboardAlertEnabled,
          popupAlertEnabled,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save alert settings");
      }

      setDashboardAlertEnabled(json.dashboardAlertEnabled !== false);
      setPopupAlertEnabled(json.popupAlertEnabled !== false);
    } catch (error: any) {
      alert(error?.message || "Failed to save alert settings");
    } finally {
      setSettingsSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1320px] animate-pulse space-y-3">
        <div className="h-24 rounded-2xl border border-zinc-100 bg-white" />
        <div className="h-20 rounded-2xl border border-zinc-100 bg-white" />
        <div className="h-28 rounded-2xl border border-zinc-100 bg-white" />
        <div className="h-28 rounded-2xl border border-zinc-100 bg-white" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1320px] space-y-3">
      <div className="sticky top-0 z-30 -mx-2 border-b border-[#F0EDE8] bg-[#FCFBF8]/95 px-2 pb-3 pt-2 backdrop-blur">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-[28px] font-serif italic tracking-tight text-[#1A1A1A]">
                New Arrivals
              </h1>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.28em] text-[#C5A267]">
                Compact Control Panel · Launch Date · Description
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => load(true)}
                className="inline-flex h-8 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-[10px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                {refreshing ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <RefreshCw size={13} />
                )}
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 xl:grid-cols-[1fr_auto]">
            <div className="rounded-2xl border border-zinc-100 bg-white p-2.5 shadow-sm">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_190px_90px]">
                <div className="relative">
                  <Search
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search SKU, name, collection"
                    className="h-8 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-[11px] outline-none transition focus:border-zinc-300 focus:bg-white"
                  />
                </div>

                <select
                  value={collectionFilter}
                  onChange={(e) => setCollectionFilter(e.target.value)}
                  className="h-8 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[11px] outline-none transition focus:border-zinc-300 focus:bg-white"
                >
                  {collections.map((collection) => (
                    <option key={collection} value={collection}>
                      {collection === "ALL" ? "All Collections" : collection}
                    </option>
                  ))}
                </select>

                <div className="flex h-8 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-[10px] font-semibold text-zinc-600">
                  {filtered.length} Items
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E9DECC] bg-[#FFF9F0] p-2.5 shadow-sm">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex h-8 items-center justify-between gap-3 rounded-xl border border-[#ECDDBF] bg-white px-3 text-[10px] font-semibold text-[#6D5B3C]">
                  <span className="inline-flex items-center gap-2">
                    <MonitorSmartphone size={13} />
                    Dashboard Alert
                  </span>
                  <button
                    type="button"
                    onClick={() => setDashboardAlertEnabled((prev) => !prev)}
                    className={cn(
                      "inline-flex h-5 min-w-[46px] items-center rounded-full px-1 transition",
                      dashboardAlertEnabled ? "bg-[#C5A267] justify-end" : "bg-zinc-300 justify-start"
                    )}
                  >
                    <span className="h-3.5 w-3.5 rounded-full bg-white shadow-sm" />
                  </button>
                </label>

                <label className="flex h-8 items-center justify-between gap-3 rounded-xl border border-[#ECDDBF] bg-white px-3 text-[10px] font-semibold text-[#6D5B3C]">
                  <span className="inline-flex items-center gap-2">
                    <Bell size={13} />
                    Popup Alert
                  </span>
                  <button
                    type="button"
                    onClick={() => setPopupAlertEnabled((prev) => !prev)}
                    className={cn(
                      "inline-flex h-5 min-w-[46px] items-center rounded-full px-1 transition",
                      popupAlertEnabled ? "bg-[#C5A267] justify-end" : "bg-zinc-300 justify-start"
                    )}
                  >
                    <span className="h-3.5 w-3.5 rounded-full bg-white shadow-sm" />
                  </button>
                </label>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[9px] leading-4 text-[#8A7A60]">
                  Distributor dashboard alert and popup visibility.
                </p>

                <button
                  type="button"
                  disabled={settingsSaving || settingsLoading}
                  onClick={() => void saveAlertSettings()}
                  className="inline-flex h-7 items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#2A2A2A] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {settingsSaving ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Saving
                    </>
                  ) : (
                    <>
                      <Save size={12} />
                      Save Alerts
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {filtered.map((item) => {
          const draft = getDraft(item);
          const saving = !!savingMap[item.id];
          const uploading = !!uploadingMap[item.id];

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-zinc-100 bg-white p-2.5 shadow-sm"
            >
              <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[170px_minmax(0,1fr)_140px]">
                <div className="space-y-2">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] border border-zinc-100 bg-zinc-50">
                    {draft.images[0] ? (
                      <img
                        src={draft.images[0]}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-300">
                        <ImagePlus size={20} />
                      </div>
                    )}

                    <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/90 px-2 py-1 text-[9px] font-semibold text-zinc-700 backdrop-blur">
                      <Star size={9} />
                      {draft.images.length}
                    </div>
                  </div>

                  <label className="inline-flex h-7 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-[10px] font-semibold text-zinc-700 transition hover:bg-zinc-50">
                    {uploading ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={12} />
                        Upload Images
                      </>
                    )}
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void uploadFiles(item, e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>

                  <p className="text-[9px] text-zinc-400">Max 10 MB each</p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex flex-col gap-2 border-b border-zinc-100 pb-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#C5A267]">
                        {item.sku}
                      </div>
                      <h3 className="truncate text-[15px] font-semibold tracking-tight text-zinc-900">
                        {item.name}
                      </h3>
                      <p className="text-[10px] text-zinc-400">
                        Last updated: {formatDate(item.updatedAt)}
                      </p>
                    </div>

                    <label className="inline-flex h-7 items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 text-[10px] font-semibold text-zinc-700">
                      <input
                        type="checkbox"
                        checked={draft.isNewArrival}
                        onChange={(e) =>
                          patchDraft(item.id, { isNewArrival: e.target.checked })
                        }
                        className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-300"
                      />
                      Show in New Arrivals
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                        Collection
                      </label>
                      <input
                        value={draft.collection}
                        onChange={(e) => patchDraft(item.id, { collection: e.target.value })}
                        className="h-8 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[11px] outline-none transition focus:border-zinc-300 focus:bg-white"
                        placeholder="Collection name"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                        Launch Date
                      </label>
                      <input
                        type="date"
                        value={draft.launchDate}
                        onChange={(e) => patchDraft(item.id, { launchDate: e.target.value })}
                        className="h-8 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[11px] outline-none transition focus:border-zinc-300 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                        Priority
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={draft.newArrivalPriority}
                        onChange={(e) =>
                          patchDraft(item.id, {
                            newArrivalPriority: Number(e.target.value || 0),
                          })
                        }
                        className="h-8 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[11px] outline-none transition focus:border-zinc-300 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                      Description
                    </label>
                    <textarea
                      value={draft.description}
                      onChange={(e) => patchDraft(item.id, { description: e.target.value })}
                      rows={2}
                      placeholder="Short launch description for distributor page"
                      className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] outline-none transition focus:border-zinc-300 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                      Images
                    </div>

                    {draft.images.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-4 text-center text-[10px] text-zinc-400">
                        No images uploaded
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {draft.images.map((imageUrl, index) => (
                          <div
                            key={`${item.id}-${index}-${imageUrl}`}
                            className="group relative h-12 w-12 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"
                          >
                            <img
                              src={imageUrl}
                              alt={`${item.name}-${index + 1}`}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                patchDraft(item.id, {
                                  images: draft.images.filter((_, i) => i !== index),
                                })
                              }
                              className="absolute right-0.5 top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition group-hover:opacity-100"
                            >
                              <Trash2 size={9} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-2">
                  <div className="rounded-[18px] border border-zinc-100 bg-zinc-50 p-2.5">
                    <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                      Status
                    </div>
                    <div className="mt-2 space-y-1.5 text-[10px] text-zinc-700">
                      <div className="flex items-center justify-between gap-2">
                        <span>Active Product</span>
                        <span
                          className={cn(
                            "font-semibold",
                            item.isActive ? "text-emerald-600" : "text-red-500"
                          )}
                        >
                          {item.isActive ? "Yes" : "No"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span>New Arrival</span>
                        <span
                          className={cn(
                            "font-semibold",
                            draft.isNewArrival ? "text-emerald-600" : "text-zinc-400"
                          )}
                        >
                          {draft.isNewArrival ? "Enabled" : "Hidden"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span>Launch Date</span>
                        <span className="font-semibold text-zinc-700">
                          {draft.launchDate || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span>Images</span>
                        <span className="font-semibold text-zinc-700">{draft.images.length}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveItem(item)}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Saving
                      </>
                    ) : (
                      <>
                        <Save size={13} />
                        Save Card
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center text-[11px] text-zinc-400">
            No products found
          </div>
        )}
      </div>
    </div>
  );
}