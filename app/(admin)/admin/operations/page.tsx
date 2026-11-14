import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/serverSession";
import { prisma } from "@/lib/db";
import OrderTargetScan from "./order-target-scan";

export const dynamic = "force-dynamic";

export default async function OperationsInboxPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/admin");
  let latest: {status:string; startedAt:Date; messagesScanned:number; itemsAdded:number; errorSummary:string|null} | null = null;
  let items: Array<{id:string;subject:string;sender:string;filename:string|null;kind:string;matchState:string;matchReason:string;receivedAt:Date|null;firstSeenAt:Date}> = [];
  let orders: Array<{id:string;customer:string;qty:number;date:string;invoice:string}>=[];
  let error = false;
  try {
    [latest,items,orders] = await Promise.all([
      prisma.operationsInboxScanRun.findFirst({orderBy:{startedAt:"desc"},select:{status:true,startedAt:true,messagesScanned:true,itemsAdded:true,errorSummary:true}}),
      prisma.operationsInboxItem.findMany({where:{reviewStatus:"PENDING",mailbox:"info"},orderBy:{firstSeenAt:"desc"},take:150,
        select:{id:true,subject:true,sender:true,filename:true,kind:true,matchState:true,matchReason:true,receivedAt:true,firstSeenAt:true}}),
      prisma.order.findMany({orderBy:{createdAt:"desc"},take:800,
        select:{id:true,createdAt:true,notes:true,items:{select:{qty:true}},distributor:{select:{name:true}}}})
        .then(values=>values.map(o=>{let m:Record<string,unknown>={};try{m=JSON.parse(o.notes||"{}")}catch{}
          return {id:o.id,customer:o.distributor.name,qty:o.items.reduce((sum,item)=>sum+item.qty,0),
            date:o.createdAt.toISOString().slice(0,10),invoice:String(m.invoiceNumber||m.invoiceNo||"")};})),
    ]);
  } catch { error = true; }
  return <main className="mx-auto max-w-5xl space-y-5 px-4 py-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs uppercase tracking-widest text-stone-500">Casadenza · Admin</p>
        <h1 className="text-3xl font-semibold">Gmail Order & Shipment Review</h1>
        <p className="mt-2 text-sm text-stone-600">Read-only search of info@casadenza.com. Suggested matches are unverified; nothing is shared with distributors.</p>
      </div>
      <div className="flex gap-3 text-sm"><Link className="underline" href="/admin/mailboxes">Gmail connection</Link><Link className="underline" href="/admin/operations">Refresh queue</Link></div>
    </div>
    {error ? <p role="alert" className="rounded-xl border p-4 text-red-700">Review queue is unavailable. Check the production database migration.</p> :
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4"><p className="text-xs text-stone-500">Latest scan</p><p className="text-lg font-semibold">{latest?.status || "Not run"}</p><p className="text-xs">{latest?.startedAt.toLocaleString("en-IN") || "Pending schedule"}</p></div>
        <div className="rounded-xl border p-4"><p className="text-xs text-stone-500">Messages inspected (latest run)</p><p className="text-2xl font-semibold">{latest?.messagesScanned ?? "—"}</p></div>
        <div className="rounded-xl border p-4"><p className="text-xs text-stone-500">Needs review</p><p className="text-2xl font-semibold">{items.length}{items.length===150?"+":""}</p></div>
      </section>}
    {latest?.errorSummary && <p role="status" className="rounded-xl border border-amber-300 p-3 text-sm text-amber-900">{latest.errorSummary}</p>}
    <OrderTargetScan orders={orders}/>
    <p className="text-sm text-stone-500">Only email metadata and PDF filenames are stored. The first scheduled scan covers up to 3 days and 80 emails; a longer historical backfill requires a separate process.</p>
    <section className="space-y-3">
      {items.length===0&&!error&&<p className="rounded-xl border p-4 text-sm">No pending candidate items yet. The scheduled scanner will populate this list after a successful run.</p>}
      {items.map(item=><article key={item.id} className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold break-words">{item.subject || "(No subject)"}</h2><span className="text-xs font-semibold">{item.kind.replaceAll("_"," ")}</span></div>
        <p className="mt-1 text-xs text-stone-500">{item.sender} · {(item.receivedAt||item.firstSeenAt).toLocaleString("en-IN")}</p>
        {item.filename&&<p className="mt-2 text-sm">Attachment: {item.filename}</p>}
        <p className="mt-2 text-xs text-amber-800">{item.matchState.replaceAll("_"," ")} · {item.matchReason}</p>
      </article>)}
    </section>
  </main>;
}
