import { prisma } from "@/lib/db";
import DistributorProductsClient from "./products-client";

export const dynamic = "force-dynamic";

export default async function DistributorProductsPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true }, // Sirf active products
    orderBy: { name: "asc" },
  });

  // Ensure 'products' is always an array before passing to client
  return <DistributorProductsClient products={products || []} />;
}