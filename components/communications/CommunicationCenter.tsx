"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Check, CheckCheck, ChevronDown, Inbox, Mail,
  MessageCircle, Plus, RefreshCw, Search, Send, ShieldCheck, Users, X,
} from "lucide-react";

type Role = "ADMIN" | "DISTRIBUTOR";
type Summary = {
  id: string; subject: string; category: string; status: string;
  orderId: string | null; lastMessageAt: string; unreadCount: number;
  distributor: { id: string; name: string; country: string | null };
  lastMessage: { body: string; senderRole: Role; createdAt: string } | null;
};
type Message = {
  id: string; body: string; senderRole: Role; createdAt: string;
  notificationStatus: string; sender: { displayName: string | null; email: string } | null;
};
type Detail = {
  id: string; subject: string; category: string; status: string; createdAt: string;
  distributor: { id: string; name: string; country: string | null };
  order: { id: string; poNumber: string } | null; messages: Message[];
};
type Dist = { id: string; name: string; country?: string | null; email?: string | null };
type Order = { id: string; label: string; status: string };

const categories = [
  { value: "GENERAL", label: "General enquiry" }, { value: "ORDER", label: "Order enquiry" },
  { value: "PRODUCT", label: "Product information" }, { value: "DOCUMENTS", label: "Documents" },
  { value: "SUPPORT", label: "Support" },
];
const controls = "w-full min-h-[44px] rounded-xl border border-[#EAE5DB] bg-white px-3.5 py-2.5 text-[14px] text-[#202020] outline-none focus:border-[#B99A62] focus:ring-2 focus:ring-[#B99A62]/15";
const goldButton = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#181818] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#35302A] disabled:cursor-not-allowed disabled:opacity-50";
const dateLabel = (value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const timeLabel = (value: string) => new Date(value).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function CommunicationCenter({ role }: { role: Role }) {
  const isAdmin = role === "ADMIN";
  const [items, setItems] = useState<Summary[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"inbox" | "detail" | "compose">("inbox");
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "OPEN" | "RESOLVED">("ALL");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reply, setReply] = useState("");
  const [distributors, setDistributors] = useState<Dist[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [newDistributorId, setNewDistributorId] = useState("");
  const [recipientMode, setRecipientMode] = useState<"ONE" | "ALL">("ONE");
  const [broadcastCount, setBroadcastCount] = useState<number | null>(null);
  const [broadcastLimit, setBroadcastLimit] = useState(200);
  const [newOrderId, setNewOrderId] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [body, setBody] = useState("");

  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/communications", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load messages");
      setItems(data.items || []);
      setError("");
    } catch (e: any) { setError(e?.message || "Unable to load messages"); }
    finally { setLoading(false); }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch("/api/communications/" + encodeURIComponent(id), { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to open conversation");
      setDetail(data.thread);
      setError("");
      await fetch("/api/communications/" + encodeURIComponent(id), {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "read" }),
      });
      await loadList();
    } catch (e: any) { setError(e?.message || "Unable to open conversation"); }
  }, [loadList]);

  useEffect(() => {
    loadList();
    const selected = new URLSearchParams(window.location.search).get("thread");
    if (selected) { setActiveId(selected); setView("detail"); loadDetail(selected); }
    const refresh = window.setInterval(loadList, 45000);
    return () => window.clearInterval(refresh);
  }, [loadList, loadDetail]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/distributors", { cache: "no-store" })
      .then(async (r) => { if (!r.ok) throw new Error("Cannot load distributors"); return r.json(); })
      .then((d) => setDistributors(d.distributors || []))
      .catch(() => setDistributors([]));
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || view !== "compose") return;
    let cancelled = false;
    fetch("/api/communications/broadcast", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load recipient count");
        return data;
      })
      .then((data) => {
        if (!cancelled) {
          setBroadcastCount(data.recipientCount);
          setBroadcastLimit(data.maxRecipients);
        }
      })
      .catch(() => { if (!cancelled) setBroadcastCount(null); });
    return () => { cancelled = true; };
  }, [isAdmin, view]);

  useEffect(() => {
    if (view !== "compose") return;
    if (isAdmin && recipientMode === "ALL") {
      setOrders([]);
      setNewOrderId("");
      return;
    }
    const distributorId = isAdmin ? newDistributorId : "";
    fetch("/api/communications/orders" + (distributorId ? "?distributorId=" + encodeURIComponent(distributorId) : ""), { cache: "no-store" })
      .then((r) => r.json()).then((d) => setOrders(d.items || [])).catch(() => setOrders([]));
    setNewOrderId("");
  }, [isAdmin, newDistributorId, recipientMode, view]);

  function openThread(id: string) {
    setActiveId(id); setDetail(null); setView("detail"); setReply(""); setNotice("");
    window.history.replaceState(null, "", window.location.pathname + "?thread=" + encodeURIComponent(id));
    loadDetail(id);
  }
  function goBack() {
    setView("inbox"); setActiveId(null); setDetail(null); setError(""); setNotice("");
    window.history.replaceState(null, "", window.location.pathname);
  }
  function compose() {
    setView("compose"); setError(""); setNotice("");
    setSubject(""); setBody(""); setCategory("GENERAL"); setNewOrderId(""); setNewDistributorId(""); setRecipientMode("ONE");
  }
  async function sendNew() {
    if (busy) return;
    const all = isAdmin && recipientMode === "ALL";
    if (!subject.trim() || !body.trim() || (isAdmin && !all && !newDistributorId)) {
      setError("Please select a recipient and enter a subject and message."); return;
    }
    if (all) {
      if (broadcastCount === null || broadcastCount < 1 || broadcastCount > broadcastLimit) {
        setError("Recipient count unavailable or exceeds the broadcast limit."); return;
      }
      if (!window.confirm("Publish separate private portal messages for all " + broadcastCount +
        " registered distributors?\\n\\nNo emails or document attachments will be sent. Replies remain private.")) return;
      setBusy(true); setError(""); setNotice("");
      try {
        const res = await fetch("/api/communications/broadcast", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({
            broadcastId: window.crypto.randomUUID(),
            subject, body, category, delivery: "PORTAL_ONLY", confirmation: "SEND TO ALL",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to publish broadcast");
        setView("inbox");
        setSubject(""); setBody("");
        await loadList();
        setNotice("Saved private portal messages for " + data.recipientCount +
          " distributors. No email was sent. Each distributor sees only their own conversation.");
      } catch (e: any) { setError(e?.message || "Unable to publish broadcast"); }
      finally { setBusy(false); }
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/communications", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, body, category, distributorId: isAdmin ? newDistributorId : undefined, orderId: newOrderId || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Unable to send");
      openThread(d.id);
      setNotice(d.notificationStatus === "SENT"
        ? "Message saved. An email notification was sent."
        : "Message saved in the portal. Email notification was not delivered; the recipient can still read it here.");
    } catch (e: any) { setError(e.message || "Unable to send"); }
    finally { setBusy(false); }
  }
  async function sendReply() {
    if (!activeId || !reply.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/communications/" + encodeURIComponent(activeId), {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Unable to send reply");
      setReply("");
      await loadDetail(activeId);
      setNotice(d.notificationStatus === "SENT" ? "Reply saved and notification sent."
        : "Reply saved in the portal. Email notification was not delivered.");
    } catch (e: any) { setError(e.message || "Unable to send reply"); }
    finally { setBusy(false); }
  }
  async function toggleStatus() {
    if (!activeId || !detail || !isAdmin) return;
    const status = detail.status === "OPEN" ? "RESOLVED" : "OPEN";
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/communications/" + encodeURIComponent(activeId), {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "status", status }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Unable to update");
      await loadDetail(activeId);
    } catch (e: any) { setError(e.message || "Unable to update"); }
    finally { setBusy(false); }
  }

  const unread = items.reduce((sum, t) => sum + t.unreadCount, 0);
  const filtered = useMemo(() => items.filter((thread) => {
    if (filter === "UNREAD" && thread.unreadCount === 0) return false;
    if ((filter === "OPEN" || filter === "RESOLVED") && thread.status !== filter) return false;
    const haystack = [thread.subject, thread.category, thread.distributor.name, thread.distributor.country, thread.lastMessage?.body].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase().trim());
  }), [items, filter, query]);

  return (
    <div className="mx-auto w-full max-w-[1450px]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.23em] text-[#AD8C55]">Casadenza / Partner Relations</div>
          <h1 className="font-serif text-[27px] font-medium text-[#1A1A1A] sm:text-[34px]">Communication Centre</h1>
          <p className="mt-1 text-[13px] text-[#807A70]">
            {isAdmin ? "One place for conversations with your distributors." : "Messages, order enquiries and support with Casadenza."}
          </p>
        </div>
        <button className={goldButton} onClick={compose}><Plus size={17}/> New message</button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          { label: "Conversations", value: items.length, icon: Inbox },
          { label: "Unread", value: unread, icon: Mail },
          { label: "Open", value: items.filter((t) => t.status === "OPEN").length, icon: MessageCircle },
        ].map((stat, i) => (
          <div key={stat.label} className={"flex items-center justify-between rounded-2xl border border-[#EBE7DF] bg-white p-3 sm:p-4 " + (i === 2 ? "col-span-2 sm:col-span-1" : "")}>
            <div><p className="text-[11px] text-[#807A70]">{stat.label}</p><p className="mt-0.5 text-[24px] font-medium text-[#24201C]">{stat.value}</p></div>
            <stat.icon className="text-[#BF9A5D]" size={20}/>
          </div>
        ))}
      </div>

      <div className="flex h-[calc(100dvh-290px)] min-h-[480px] max-h-[860px] overflow-hidden rounded-[20px] border border-[#E8E2D7] bg-white shadow-sm sm:h-[calc(100dvh-270px)]">
        {/* Master list on desktop/tablet, separate view on small screens */}
        <section className={"w-full flex-none border-r border-[#EEE9E0] bg-[#FEFDFB] md:w-[300px] lg:w-[365px] " + (view !== "inbox" ? "hidden md:flex" : "flex") + " flex-col"} aria-label="Conversation list">
          <div className="border-b border-[#EEE9E0] p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#24201C]">Conversations</h2>
              <button aria-label="Refresh conversations" className="rounded-lg p-2 text-[#726B60] hover:bg-[#F2EFE9]" onClick={loadList}><RefreshCw size={17}/></button>
            </div>
            <label className="relative block">
              <Search size={16} className="absolute left-3 top-[14px] text-[#8F887C]"/>
              <input aria-label="Search conversations" className={controls + " pl-9"} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search messages or partners"/>
            </label>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(["ALL", "UNREAD", "OPEN", "RESOLVED"] as const).map((value) => (
                <button key={value} onClick={() => setFilter(value)}
                  className={"min-h-[36px] rounded-full px-3 text-[11px] font-semibold " + (filter === value ? "bg-[#202020] text-white" : "bg-[#F3F0EA] text-[#776F65] hover:bg-[#EBE5DA]")}>
                  {value === "ALL" ? "All" : value === "UNREAD" ? "Unread" : value === "OPEN" ? "Open" : "Resolved"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? <p className="p-6 text-sm text-[#81796D]">Loading conversations…</p>
              : filtered.length === 0 ? <div className="p-6 text-center text-sm text-[#81796D]">No conversations match. Start a new message to contact {isAdmin ? "a distributor" : "Casadenza"}.</div>
              : filtered.map((item) => (
                <button key={item.id} onClick={() => openThread(item.id)} className={"w-full border-b border-[#F0EDE7] px-4 py-4 text-left transition hover:bg-[#F8F4EC] " + (item.id === activeId ? "bg-[#F7F2E7] border-l-[3px] border-l-[#C5A267]" : "")}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] font-semibold text-[#514332]">{isAdmin ? item.distributor.name : "Casadenza Team"}</span>
                    <span className="shrink-0 text-[10px] text-[#928A7C]">{dateLabel(item.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[14px] font-semibold text-[#222]">{item.subject}</p>
                    {item.unreadCount > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#C5A267] px-1 text-[10px] font-bold text-white">{item.unreadCount}</span>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#81796D]">{item.lastMessage?.body || "No messages"}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-[#F0E9DB] px-2 py-0.5 text-[10px] text-[#8D7147]">{item.category}</span>
                    {item.status === "RESOLVED" && <span className="text-[10px] text-emerald-700">Resolved</span>}
                  </div>
                </button>
              ))}
          </div>
        </section>

        <section className={"min-w-0 flex-1 flex-col " + (view === "inbox" ? "hidden md:flex" : "flex")} aria-label="Conversation details">
          {view === "compose" ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center gap-3 border-b border-[#EEE9E0] px-4 py-4 sm:px-6">
                <button aria-label="Back to conversations" onClick={goBack} className="rounded-lg p-2 hover:bg-[#F6F2EB]"><ArrowLeft size={18}/></button>
                <div><h2 className="text-[18px] font-semibold">New message</h2><p className="text-[12px] text-[#8B8175]">Send a message through the partner portal</p></div>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                {isAdmin && (
                  <div className="space-y-3">
                    <div>
                      <span className="mb-1.5 block text-[12px] font-medium text-[#625747]">Recipients</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setRecipientMode("ONE")}
                          aria-pressed={recipientMode === "ONE"}
                          className={"min-h-[44px] rounded-xl border px-3 text-[12px] font-semibold " +
                            (recipientMode === "ONE" ? "border-[#C5A267] bg-[#FAF4E8] text-[#675028]" : "border-[#EAE5DB] bg-white text-[#777067]")}>
                          One distributor
                        </button>
                        <button type="button" onClick={() => { setRecipientMode("ALL"); setNewOrderId(""); }}
                          aria-pressed={recipientMode === "ALL"}
                          className={"inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-3 text-[12px] font-semibold " +
                            (recipientMode === "ALL" ? "border-[#C5A267] bg-[#FAF4E8] text-[#675028]" : "border-[#EAE5DB] bg-white text-[#777067]")}>
                          <Users size={15}/> Send to all
                        </button>
                      </div>
                    </div>
                    {recipientMode === "ONE" ? (
                      <label className="block"><span className="mb-1.5 block text-[12px] font-medium text-[#625747]">Distributor</span>
                        <select className={controls} value={newDistributorId} onChange={(e) => setNewDistributorId(e.target.value)}>
                          <option value="">Select a distributor</option>
                          {distributors.map((d) => <option key={d.id} value={d.id}>{d.name}{d.country ? " — " + d.country : ""}</option>)}
                        </select>
                      </label>
                    ) : (
                      <div className="rounded-xl border border-[#E9E2D4] bg-[#FCF9F2] p-3 text-[12px] leading-5 text-[#736753]">
                        <strong>{broadcastCount === null ? "Loading recipients…" : broadcastCount + " registered distributors"}</strong>
                        <p className="mt-1">A private portal conversation is created for each distributor. Recipients cannot see each other. No bulk emails or documents will be sent.</p>
                        {broadcastCount !== null && broadcastCount > broadcastLimit && <p className="mt-1 text-red-700">Broadcast limit of {broadcastLimit} recipients exceeded.</p>}
                      </div>
                    )}
                  </div>
                )}
                {!isAdmin && <div className="rounded-xl border border-[#E9E2D4] bg-[#FCF9F2] p-3 text-[13px]">To: <strong>Casadenza Team</strong></div>}
                <label className="block"><span className="mb-1.5 block text-[12px] font-medium text-[#625747]">Subject</span>
                  <input className={controls} maxLength={160} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What would you like to discuss?"/>
                </label>
                <div className={"grid grid-cols-1 gap-4 " + (isAdmin && recipientMode === "ALL" ? "" : "sm:grid-cols-2")}>
                  <label className="block"><span className="mb-1.5 block text-[12px] font-medium text-[#625747]">Category</span>
                    <select className={controls} value={category} onChange={(e) => setCategory(e.target.value)}>
                      {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </label>
                  {!(isAdmin && recipientMode === "ALL") && (
                    <label className="block"><span className="mb-1.5 block text-[12px] font-medium text-[#625747]">Related order (optional)</span>
                      <select className={controls} value={newOrderId} onChange={(e) => setNewOrderId(e.target.value)} disabled={isAdmin && !newDistributorId}>
                        <option value="">No linked order</option>
                        {orders.map((o) => <option value={o.id} key={o.id}>{o.label} — {o.status.replaceAll("_", " ")}</option>)}
                      </select>
                    </label>
                  )}
                </div>
                <label className="block"><span className="mb-1.5 block text-[12px] font-medium text-[#625747]">Message</span>
                  <textarea className={controls + " min-h-[190px] resize-y"} value={body} maxLength={10000} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" />
                </label>
                <div className="rounded-xl bg-[#FAF7F0] p-3 text-[12px] leading-5 text-[#776F64]">
                  <ShieldCheck size={15} className="mr-1 inline text-[#9C825A]"/>
                  {isAdmin && recipientMode === "ALL"
                    ? "Private portal messages only. No emails or attachments are sent. Each distributor can reply privately. You must confirm the full recipient count."
                    : "The message will be saved in the portal. An email notification will be attempted using the configured sender. Replies must be made inside the portal."}
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-[#EEE9E0] px-4 py-3 sm:px-6">
                <button onClick={goBack} className="min-h-[44px] rounded-xl border border-[#E9E2D6] px-4 text-[13px]">Cancel</button>
                <button onClick={sendNew} disabled={busy || !subject.trim() || !body.trim() || (isAdmin && recipientMode === "ONE" && !newDistributorId) || (isAdmin && recipientMode === "ALL" && (broadcastCount === null || broadcastCount < 1 || broadcastCount > broadcastLimit))} className={goldButton}><Send size={15}/>{busy ? "Saving…" : isAdmin && recipientMode === "ALL" ? "Publish to all (" + (broadcastCount ?? "…") + ")" : "Send message"}</button>
              </div>
            </div>
          ) : view === "detail" ? (
            detail ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEE9E0] px-3 py-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-2">
                    <button aria-label="Back to conversations" onClick={goBack} className="rounded-lg p-2 hover:bg-[#F6F2EB] md:hidden"><ArrowLeft size={18}/></button>
                    <div className="min-w-0">
                      <h2 className="truncate text-[17px] font-semibold text-[#25211D]">{detail.subject}</h2>
                      <p className="text-[12px] text-[#7E756A]">{isAdmin ? detail.distributor.name : "Casadenza Team"} · {detail.category.toLowerCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {detail.order && <Link href={isAdmin ? "/admin/orders" : "/dashboard/my-orders"} className="rounded-full bg-[#F5EEDA] px-3 py-2 text-[11px] font-semibold text-[#856B3C]">{detail.order.poNumber || "Related order"} <ArrowRight size={12} className="inline"/></Link>}
                    {isAdmin && <button onClick={toggleStatus} disabled={busy} className="min-h-[40px] rounded-lg border border-[#E9E3D8] px-3 text-[12px] font-semibold">{detail.status === "OPEN" ? "Mark resolved" : "Reopen"}</button>}
                    {!isAdmin && <span className={"rounded-full px-3 py-2 text-[11px] font-medium " + (detail.status === "OPEN" ? "bg-[#F4EEDC] text-[#96713C]" : "bg-emerald-50 text-emerald-700")}>{detail.status.toLowerCase()}</span>}
                  </div>
                </div>
                <div className="flex-1 space-y-5 overflow-y-auto bg-[#FCFBF9] px-3 py-5 sm:px-6">
                  <p className="text-center text-[11px] text-[#92887A]">Conversation started {dateLabel(detail.messages[0]?.createdAt || detail.createdAt || new Date().toISOString())}</p>
                  {detail.messages.map((message) => {
                    const mine = message.senderRole === role;
                    return (
                      <div key={message.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                        <div className={"max-w-[92%] rounded-[18px] p-3.5 sm:max-w-[83%] sm:p-4 " + (mine ? "rounded-br-md bg-[#23211E] text-white" : "rounded-bl-md border border-[#EDE7DD] bg-white text-[#25201A]")}>
                          <div className={"mb-2 flex items-center justify-between gap-4 text-[11px] font-medium " + (mine ? "text-[#DAC197]" : "text-[#9D8054]")}>
                            <span>{mine ? "You" : message.senderRole === "ADMIN" ? "Casadenza Team" : detail.distributor.name}</span>
                            <span className={mine ? "text-white/50" : "text-[#9C968C]"}>{timeLabel(message.createdAt)}</span>
                          </div>
                          <p className="whitespace-pre-wrap break-words text-[14px] leading-6">{message.body}</p>
                          {mine && <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-white/60">
                            {message.notificationStatus === "SENT" ? <CheckCheck size={13}/> : <Check size={13}/>}
                            {message.notificationStatus === "SENT" ? "Email notified" : message.notificationStatus === "PENDING" ? "Notification pending" : "Saved in portal"}
                          </div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-[#EEE9E0] bg-white p-3 sm:p-4">
                  <label className="sr-only" htmlFor="communication-reply">Reply to conversation</label>
                  <textarea id="communication-reply" value={reply} onChange={(e) => setReply(e.target.value)}
                    maxLength={10000} rows={3} placeholder="Write a reply…"
                    className={controls + " resize-y"} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendReply(); } }}/>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#958D82]">Saved to portal · Ctrl/⌘ + Enter to send</span>
                    <button onClick={sendReply} disabled={busy || !reply.trim()} className={goldButton}><Send size={15}/> {busy ? "Sending…" : "Reply"}</button>
                  </div>
                </div>
              </div>
            ) : <div className="flex h-full min-h-0 items-center justify-center text-[13px] text-[#8B8175]">Loading conversation…</div>
          ) : (
            <div className="hidden h-full min-h-0 flex-col items-center justify-center gap-3 p-8 text-center md:flex">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F7F1E7]"><Mail size={29} className="text-[#B18C4F]"/></div>
              <h3 className="font-serif text-[24px] text-[#24201D]">Stay connected</h3>
              <p className="max-w-[300px] text-[13px] leading-6 text-[#888073]">Choose a conversation or compose a message to your {isAdmin ? "distributor" : "Casadenza team"}.</p>
              <button onClick={compose} className={goldButton}><Plus size={16}/> New message</button>
            </div>
          )}
        </section>
      </div>
      {(error || notice) && <div role={error ? "alert" : "status"} className={"fixed bottom-5 left-4 right-4 z-50 mx-auto max-w-[640px] rounded-xl border p-3 text-[13px] shadow-xl " + (error ? "border-red-200 bg-red-50 text-red-800" : "border-[#D8C7A6] bg-[#FFF9EC] text-[#6D542E]")}>
        <div className="flex items-start justify-between gap-3"><span>{error || notice}</span><button aria-label="Dismiss notification" onClick={() => { setError(""); setNotice(""); }}><X size={16}/></button></div>
      </div>}
    </div>
  );
}
