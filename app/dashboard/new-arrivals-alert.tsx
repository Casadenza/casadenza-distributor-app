"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Sparkles, X } from "lucide-react";

type NewArrivalAlertItem = {
  id: string;
  name: string;
  collection: string;
  launchDate: string | null;
};

type Props = {
  count: number;
  items: NewArrivalAlertItem[];
};

function formatLaunchDate(value?: string | null) {
  if (!value) return "New Launch";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function NewArrivalsAlert({ count, items }: Props) {
  const [open, setOpen] = useState(false);

  // 🔥 NEW: Admin control states
  const [dashboardAlertEnabled, setDashboardAlertEnabled] = useState(true);
  const [popupAlertEnabled, setPopupAlertEnabled] = useState(true);

  const storageKey = useMemo(
    () => `casadenza-new-arrivals-popup-${items.map((item) => item.id).join("-")}-${count}`,
    [count, items]
  );

  // 🔥 Fetch admin settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings/new-arrivals", {
          cache: "no-store",
        });
        const json = await res.json();

        if (res.ok) {
          setDashboardAlertEnabled(json.dashboardAlertEnabled !== false);
          setPopupAlertEnabled(json.popupAlertEnabled !== false);
        }
      } catch {
        // fallback safe
      }
    }

    loadSettings();
  }, []);

  // 🔥 Popup logic (admin controlled)
  useEffect(() => {
    if (!count || !popupAlertEnabled) return;

    try {
      const seen = window.sessionStorage.getItem(storageKey);
      if (!seen) {
        setOpen(true);
        window.sessionStorage.setItem(storageKey, "1");
      }
    } catch {
      setOpen(true);
    }
  }, [count, storageKey, popupAlertEnabled]);

  // 🔥 FULL BLOCK if admin disabled
  if (!count || !dashboardAlertEnabled) return null;

  return (
    <>
      {/* ALERT BAR */}
      <div className="rounded-[22px] border border-[#E7D3A8] bg-[#FFF9F0] px-4 py-3 shadow-[0_10px_30px_rgba(197,162,103,0.10)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C5A267] text-white">
              <Bell size={16} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#C5A267]">
                  New Arrivals Alert
                </span>
                <span className="inline-flex items-center rounded-full bg-[#C5A267] px-2 py-0.5 text-[9px] font-bold text-white">
                  +{count}
                </span>
              </div>

              <p className="mt-1 text-[13px] font-medium text-[#1A1A1A]">
                Fresh products have been added to your distributor catalogue.
              </p>
              <p className="mt-1 text-[11px] text-[#7D7568]">
                Check the latest launches with images, launch dates, and details.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-9 items-center justify-center rounded-full border border-[#E1D4BD] bg-white px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8B7246] transition hover:border-[#C5A267]"
            >
              View Update
            </button>
            <Link
              href="/dashboard/new-arrivals"
              className="inline-flex h-9 items-center justify-center rounded-full bg-[#1A1A1A] px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#2A2A2A]"
            >
              Open Page
            </Link>
          </div>
        </div>
      </div>

      {/* POPUP */}
      {open && popupAlertEnabled ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[26px] border border-[#EFE5D4] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
            <div className="flex items-start justify-between border-b border-[#F3EEE5] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C5A267] text-white">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#C5A267]">
                    New Arrivals
                  </p>
                  <h3 className="text-[18px] font-semibold tracking-tight text-[#1A1A1A]">
                    Latest launches available
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#EDE7DC] bg-white text-[#7B7468] transition hover:bg-[#FAF8F3]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 px-5 py-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#F2ECE3] bg-[#FCFBF8] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#C5A267]">
                        {item.collection || "Collection"}
                      </p>
                      <h4 className="truncate text-[14px] font-semibold text-[#1A1A1A]">
                        {item.name}
                      </h4>
                    </div>
                    <span className="shrink-0 rounded-full border border-[#E9DDC8] bg-white px-2 py-1 text-[10px] font-semibold text-[#8B7246]">
                      {formatLaunchDate(item.launchDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#F3EEE5] px-5 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-full border border-[#E5DED2] bg-white px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6F685D] transition hover:bg-[#FAF8F3]"
              >
                Close
              </button>
              <Link
                href="/dashboard/new-arrivals"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-full bg-[#1A1A1A] px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#2A2A2A]"
              >
                Open New Arrivals
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}