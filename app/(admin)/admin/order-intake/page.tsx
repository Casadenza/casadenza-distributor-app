import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/serverSession";
import OrderEmailIntake from "./order-email-intake";
export const dynamic = "force-dynamic";
export default async function OrderIntakePage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN" && session.role !== "ORDER_ADMIN") redirect("/admin");
  return <div className="mx-auto max-w-[1100px] space-y-5 p-3 sm:p-6">
    <p className="text-[12px] text-[#927850]"><Link href="/admin/orders" className="underline">Orders Hub</Link> / Email Order Intake</p>
    <OrderEmailIntake />
  </div>;
}
