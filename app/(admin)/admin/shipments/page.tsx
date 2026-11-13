import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import ShipmentMailFinder from "./shipment-mail-finder";

export const dynamic = "force-dynamic";

export default async function AdminShipmentFinderPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/admin");

  const orders = await prisma.order.findMany({
    select: {
      id: true,
      createdAt: true,
      distributorId: true,
      distributor: { select: { name: true, country: true } },
      notes: true,
    },
    orderBy: { createdAt: "desc" },
    take: 800,
  });
  const options = orders.map((o) => {
    let poNumber = "";
    let invoiceNumber = "";
    try {
      const parsed = JSON.parse(o.notes || "{}");
      poNumber = String(parsed.poNumber || parsed.po || "");
      invoiceNumber = String(parsed.invoiceNumber || parsed.invoiceNo || "");
    } catch { /* Legacy freeform notes */ }
    return {
      id: o.id, distributorId: o.distributorId,
      distributorName: o.distributor.name,
      country: o.distributor.country,
      poNumber, invoiceNumber,
      date: o.createdAt.toISOString().slice(0, 10),
    };
  });
  return <main className="mx-auto max-w-[1300px] space-y-5 px-3 py-4 sm:px-6">
    <div className="text-[12px] text-[#9C8055]">
      <Link href="/admin/documents" className="underline underline-offset-4">Documents</Link> / Shipment Finder
    </div>
    <ShipmentMailFinder orders={options} />
  </main>;
}
