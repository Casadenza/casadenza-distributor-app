import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/serverSession";
import AdminPartnerRewards from "./rewards-client";
export const dynamic = "force-dynamic";
export default async function AdminPartnerRewardsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/admin");
  return <AdminPartnerRewards/>;
}
