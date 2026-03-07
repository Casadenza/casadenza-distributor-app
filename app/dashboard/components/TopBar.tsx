"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, User, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

type TopBarProps = {
  supportEmail?: string;
  userName?: string;
};

export default function TopBar({
  supportEmail = "info@casadenza.com",
  userName = "Partner",
}: TopBarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const initials = getInitials(userName);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (_) {
      // ignore
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className="h-[68px] px-6 lg:px-8 flex items-center justify-end gap-3">
      <div className="hidden md:flex items-center gap-3 rounded-full border border-[#E8E3DA] bg-[#F8F6F1] px-4 py-2 text-[11px] tracking-[0.18em] uppercase text-[#9A927F]">
        <Mail className="h-3.5 w-3.5 text-[#B49A6B]" />
        <span className="font-semibold">Support</span>
        <span className="h-1 w-1 rounded-full bg-[#C5A267]" />
        <span className="normal-case tracking-normal text-[#3A372F] font-medium">
          {supportEmail}
        </span>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-[#E8E3DA] bg-white pl-2 pr-2 py-1.5 shadow-sm hover:bg-[#FBFAF8] transition"
        >
          <div className="h-9 w-9 rounded-full bg-[#111111] text-white flex items-center justify-center text-[11px] font-semibold">
            {initials}
          </div>
          <ChevronDown
            className={`h-4 w-4 text-[#8B857B] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open ? (
          <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-[#ECE7DE] bg-white shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <div className="px-4 py-3 border-b border-[#F2EEE7]">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#A39B8F] font-bold">
                Signed in as
              </div>
              <div className="mt-1 text-sm font-semibold text-[#181818]">
                {userName}
              </div>
            </div>

            <div className="p-2">
              <Link
                href="/dashboard/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#2B2925] hover:bg-[#F8F5EF] transition"
              >
                <User className="h-4 w-4 text-[#B49A6B]" />
                <span>Profile</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#7A1F1F] hover:bg-[#FFF5F5] transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getInitials(name: string) {
  const cleaned = String(name || "").trim();
  if (!cleaned) return "PA";
  const parts = cleaned.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "PA";
}