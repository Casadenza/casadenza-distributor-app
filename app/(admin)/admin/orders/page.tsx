import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import Link from "next/link";
import OrdersAdminClient from "./orders-client";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const session = await getServerSession();
  const role = String(session?.role || "");

  if (!session || (role !== "ADMIN" && role !== "ORDER_ADMIN")) {
    return <div className="p-6 text-sm text-zinc-600">Unauthorized</div>;
  }

  const items = await prisma.order.findMany({
    include: {
      distributor: true,
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
      documents: true,
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  return (
    <><div className="mb-3 flex flex-wrap justify-end"><Link className="inline-flex min-h-[42px] items-center rounded-xl bg-[#25211D] px-4 text-[12px] font-semibold text-white" href="/admin/operations">Review incoming orders & shipment documents</Link></div><OrdersAdminClient
      initialItems={items as any}
      userRole={role}
    /></>
  );
}