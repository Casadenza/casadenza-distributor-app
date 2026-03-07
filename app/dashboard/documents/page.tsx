import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import DocumentsClient from "./documents-client";

export default async function Page() {
  const session = await getServerSession();
  if (!session?.distributorId) {
    return (
      <div className="cz-card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-2 text-sm cz-muted">Unauthorized</p>
      </div>
    );
  }

  const orders = await prisma.order.findMany({
    where: { distributorId: session.distributorId },
    include: { documents: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return <DocumentsClient initialOrders={orders as any} />;
}