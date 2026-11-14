import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/serverSession";
import ZohoBusinessView from "@/components/ZohoBusinessView";
export const dynamic = "force-dynamic";
export default async function DistributorBusinessPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.role !== "DISTRIBUTOR") redirect("/admin");
  return <ZohoBusinessView url="/api/zoho/business" title="Your Business Overview" />;
}
