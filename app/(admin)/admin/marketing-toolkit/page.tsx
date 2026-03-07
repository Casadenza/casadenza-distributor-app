import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import AdminMarketingToolkitClient from "./toolkit-client";

function isAdminSession(session: any) {
  return !!session?.isAdmin || session?.role === "ADMIN" || session?.user?.role === "ADMIN";
}

export default async function Page() {
  const session = await getServerSession();
  if (!isAdminSession(session)) {
    return (
      <div className="p-6">
        <div className="border border-[#EEEAE2] bg-white p-6">
          <h1 className="text-sm font-serif font-bold uppercase tracking-[0.2em]">Marketing Toolkit</h1>
          <p className="mt-2 text-[11px] text-[#A39E93]">Unauthorized</p>
        </div>
      </div>
    );
  }

  const items = await prisma.marketingAsset.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  return <AdminMarketingToolkitClient initialItems={items as any} />;
}