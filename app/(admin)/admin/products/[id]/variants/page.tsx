import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/serverSession";
import VariantsTable from "./variants-table";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export default async function VariantsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  // ✅ Product Name fetch logic
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: { name: true }
  });

  if (!product) redirect("/admin/products");

  return <VariantsTable productId={params.id} productName={product.name} />;
}