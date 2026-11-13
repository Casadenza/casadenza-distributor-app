import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/serverSession";
import CommunicationCenter from "@/components/communications/CommunicationCenter";

export const dynamic = "force-dynamic";

export default async function AdminCommunicationsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/admin");
  return <CommunicationCenter role="ADMIN" />;
}
