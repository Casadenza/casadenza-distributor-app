import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import PlaceOrderClient from "./place-order-client";

export const dynamic = "force-dynamic";

export default async function PlaceOrderPage() {
  const session = await getServerSession();
  if (!session?.distributorId) return <div className="p-6 text-sm text-zinc-600">Unauthorized</div>;

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { sku: "asc" },
  });

  return <PlaceOrderClient products={products as any} />;
}