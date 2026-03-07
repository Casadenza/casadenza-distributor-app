import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import PrintClient from "./print-client";

export const dynamic = "force-dynamic";

export default async function AdminOrderPrintPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") {
    return <div className="p-6 text-sm text-zinc-600">Unauthorized</div>;
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
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
  });

  if (!order) {
    return <div className="p-6 text-sm text-zinc-600">Order not found.</div>;
  }

  return <PrintClient order={order as any} />;
}
