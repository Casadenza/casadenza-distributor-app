import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/serverSession";
import AdminSideNav from "./components/AdminSideNav";
import AdminTopBar from "./components/AdminTopBar";
import ResponsivePortalNav from "@/components/ResponsivePortalNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  if (!session) redirect("/login");

  const role = String(session.role || "");

  if (role !== "ADMIN" && role !== "ORDER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white xl:flex">
      <div className="hidden xl:block"><AdminSideNav /></div>

      <div className="flex-1 min-w-0 flex flex-col">
        <ResponsivePortalNav role="ADMIN"/><div className="hidden xl:block"><AdminTopBar supportEmail="info@casadenza.com" /></div>

        <main className="px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
          <div className="max-w-[1400px] mx-auto animate-in fade-in duration-700">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}