import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import DistributorMarketingToolkitClient from "./toolkit-client";

export default async function Page() {
  const session = await getServerSession();
  if (!session?.distributorId && session?.role !== "ADMIN") {
    return (
      <div className="p-6">
        <div className="border border-[#EEEAE2] bg-white p-6">
          <h1 className="text-sm font-serif font-bold uppercase tracking-[0.2em]">Marketing Toolkit</h1>
          <p className="mt-2 text-[11px] text-[#A39E93]">Unauthorized</p>
        </div>
      </div>
    );
  }

  // Distributor sees only active assets
  const items = await prisma.marketingAsset.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  return <DistributorMarketingToolkitClient initialItems={items as any} />;
}