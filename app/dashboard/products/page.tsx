import { prisma } from "@/lib/db";
import DistributorProductsClient from "./products-client";

export const dynamic = "force-dynamic";

export default async function DistributorProductsPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ collection: "asc" }, { sku: "asc" }],
    select: {
      id: true,
      sku: true,
      name: true,
      image: true,
      collection: true,
      stoneType: true,
    },
  });

  return <DistributorProductsClient products={products || []} />;
}