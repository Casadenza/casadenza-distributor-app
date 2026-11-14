import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/serverSession";
import PartnerRewardsClient from "./rewards-client";
export const dynamic = "force-dynamic";
export default async function PartnerRewardsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.role !== "DISTRIBUTOR") redirect("/admin");
  return <PartnerRewardsClient/>;
}
