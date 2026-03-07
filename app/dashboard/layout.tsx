import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/serverSession";
import { prisma } from "@/lib/db";
import SideNav from "./components/SideNav";
import TopBar from "./components/TopBar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.role !== "DISTRIBUTOR") redirect("/admin");

  const distributorId = session.distributorId || "";

  const [dist, orders] = await Promise.all([
    distributorId
      ? prisma.distributor.findUnique({
          where: { id: distributorId },
          select: { tier: true },
        })
      : Promise.resolve(null),
    distributorId
      ? prisma.order.findMany({
          where: { distributorId },
          select: {
            documents: {
              select: { createdAt: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          take: 500,
        })
      : Promise.resolve([]),
  ]);

  const latestDocumentAt = orders
    .flatMap((order: any) => order.documents || [])
    .map((doc: any) => doc.createdAt)
    .sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  const tier = dist?.tier ?? "STANDARD";

  return (
    <div className="min-h-screen flex">
      <SideNav tier={tier} latestDocumentAt={latestDocumentAt ? new Date(latestDocumentAt).toISOString() : null} />
      <div className="flex-1 min-w-0">
        <TopBar />
        <main className="px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
