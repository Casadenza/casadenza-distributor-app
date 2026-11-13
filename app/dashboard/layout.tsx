import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/serverSession";
import { prisma } from "@/lib/db";
import SideNav from "./components/SideNav";
import TopBar from "./components/TopBar";
import ResponsivePortalNav from "@/components/ResponsivePortalNav";

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
    <div className="min-h-screen xl:flex">
      <div className="hidden xl:block"><SideNav tier={tier} latestDocumentAt={latestDocumentAt ? new Date(latestDocumentAt).toISOString() : null} /></div>
      <div className="min-w-0 flex-1">
        <ResponsivePortalNav role="DISTRIBUTOR"/><div className="hidden xl:block"><TopBar /></div>
        <main className="px-3 py-4 sm:px-5 sm:py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
