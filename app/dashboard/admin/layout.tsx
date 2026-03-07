import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/serverSession";
import AdminSideNav from "./components/AdminSideNav";
import TopBar from "../components/TopBar";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen flex bg-[#FDFDFD]">
      {/* Sidebar fixed size */}
      <AdminSideNav />
      
      {/* Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar with shadow for depth */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#F0F0F0]">
          <TopBar supportEmail="info@casadenza.com" />
        </div>
        
        {/* Main Content with premium spacing */}
        <main className="px-8 py-10 md:px-12 md:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}