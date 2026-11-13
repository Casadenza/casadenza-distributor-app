import { prisma } from "@/lib/db";
import Link from "next/link";
import { getServerSession } from "@/lib/serverSession";
import AdminDocumentsClient from "./documents-client";

export default async function Page() {
  const session = await getServerSession();

  // Robust admin check (project me role field different ho sakta hai)
  const s: any = session as any;
  const isAdmin = !!s?.isAdmin || s?.user?.role === "ADMIN" || s?.role === "ADMIN";

  if (!isAdmin) {
    return (
      <div className="cz-card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-2 text-sm cz-muted">Unauthorized</p>
      </div>
    );
  }

  const orders = await prisma.order.findMany({
    include: {
      distributor: true, // if relation exists
      documents: true,
    },
    orderBy: { createdAt: "desc" },
    take: 800,
  });

  return <div><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEEAE2] bg-[#FAF7F0] px-5 py-3"><p className="text-[13px] text-[#817465]">AWB, HAWB or invoice received by email?</p><Link href="/admin/shipments" className="inline-flex min-h-[42px] items-center rounded-xl bg-[#26211C] px-4 text-[12px] font-semibold text-white">Find shipment email documents</Link></div><AdminDocumentsClient initialOrders={orders as any} /></div>;
}