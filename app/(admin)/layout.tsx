import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/serverSession";
import AdminSideNav from "./components/AdminSideNav";
import AdminTopBar from "./components/AdminTopBar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  
  if (!session) redirect("/login");

  // allow ADMIN + ORDER_ADMIN
  if (session.role !== "ADMIN" && session.role !== "ORDER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex bg-white">
      <AdminSideNav />

      <div className="flex-1 min-w-0 flex flex-col">
        <AdminTopBar supportEmail="info@casadenza.com" />

        <main className="px-8 py-10 md:px-12">
          <div className="max-w-[1400px] mx-auto animate-in fade-in duration-700">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}