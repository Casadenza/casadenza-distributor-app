import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import OrdersClient from "./orders-client";

export default async function Page() {
  const session = await getServerSession();
  if (!session?.distributorId) {
    return (
      <div className="cz-card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">My Orders</h1>
        <p className="mt-2 text-sm cz-muted">Unauthorized</p>
      </div>
    );
  }

  const items = await prisma.order.findMany({
    where: { distributorId: session.distributorId },
    include: {
      items: {
        include: {
          product: { select: { sku: true, name: true } },
          variant: { select: { sizeLabel: true } },
        },
      },
      documents: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return <OrdersClient initialItems={items as any} />;
}
