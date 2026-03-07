"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mail, User, LogOut, ChevronDown, Shield } from "lucide-react";

export default function AdminTopBar({ supportEmail = "info@casadenza.com" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-md border-b border-[#F0EDE8]">
      <div className="flex items-center justify-between px-8 py-3.5">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold bg-[#1A1A1A] text-white px-3 py-1 rounded-full uppercase tracking-widest">Admin</span>
          <span className="text-[10px] text-[#A39E93] font-medium uppercase tracking-[0.1em] hidden sm:inline">System Management Interface</span>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden sm:flex items-center gap-2.5 bg-[#FAF9F6] border border-[#EAE7E2] px-4 py-1.5 rounded-full hover:border-[#C5A267] group cursor-default">
            <Mail size={12} className="text-[#A39E93] group-hover:text-[#C5A267]" />
            <span className="text-[9px] font-bold text-[#A39E93] uppercase tracking-widest">{supportEmail}</span>
          </div>

          <div ref={ref} className="relative">
            <button onClick={() => setOpen(!open)} className="flex items-center gap-3 group">
              <div className="h-8 w-8 rounded-full bg-[#1A1A1A] text-[#C5A267] flex items-center justify-center text-[10px] font-bold">AD</div>
              <ChevronDown size={14} className={`text-[#A39E93] transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
              <div className="absolute right-0 mt-3 w-52 rounded-[24px] border border-[#EAE7E2] bg-white shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="px-5 py-4 border-b border-[#FAF9F6] bg-[#FAF9F6]/50">
                  <p className="text-[9px] font-bold text-[#A39E93] uppercase tracking-[0.2em]">Management Session</p>
                </div>
                <Link href="/admin/profile" className="flex items-center gap-3 px-5 py-3.5 text-[13px] font-medium text-[#6B665C] hover:bg-[#FAF9F6] hover:text-[#1A1A1A]">
                  <User size={15} className="text-[#C5A267]" /> Profile Settings
                </Link>
                <form action="/api/auth/logout" method="post" className="border-t border-[#FAF9F6]">
                  <button className="w-full flex items-center gap-3 px-5 py-3.5 text-[13px] font-medium text-red-500 hover:bg-red-50 transition-colors">
                    <LogOut size={15} /> Logout Session
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}