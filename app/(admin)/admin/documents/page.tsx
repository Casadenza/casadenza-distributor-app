import { prisma } from "@/lib/db";
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

  return <AdminDocumentsClient initialOrders={orders as any} />;
}