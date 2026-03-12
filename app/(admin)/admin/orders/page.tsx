import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
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
    <OrdersAdminClient
      initialItems={items as any}
      userRole={role}
    />
  );
}