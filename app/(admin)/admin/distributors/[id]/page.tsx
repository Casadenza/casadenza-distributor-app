import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import ZohoBusinessView from "@/components/ZohoBusinessView";
import AdminZohoAccountLink from "@/components/AdminZohoAccountLink";

export const dynamic = "force-dynamic";

export default async function AdminDistributorBusinessPage({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/admin");

  const distributor = await prisma.distributor.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, country: true, zohoAccountId: true },
  });
  if (!distributor) notFound();

  return (
    <div className="mx-auto max-w-[1360px] space-y-5">
      <Link href="/admin/distributors" className="inline-flex min-h-[44px] items-center gap-2 text-[13px] text-[#806B4C]">
        <ArrowLeft size={17} />Back to distributors
      </Link>
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B8955D]">Distributor profile</p>
        <h1 className="mt-2 break-words font-serif text-[28px] text-[#25211B] sm:text-[36px]">{distributor.name}</h1>
        <p className="mt-1 text-[13px] text-[#82786A]">{distributor.country || "Country not set"}</p>
      </header>
      <AdminZohoAccountLink distributorId={distributor.id} initialId={distributor.zohoAccountId} />
      {distributor.zohoAccountId ? (
        <ZohoBusinessView url={"/api/admin/distributors/" + encodeURIComponent(distributor.id) + "/zoho-business"} title="Zoho Sales & Activity" />
      ) : (
        <div className="rounded-xl border border-[#E6DDCF] bg-[#FAF7F0] p-5 text-[13px] text-[#827566]">
          Link a verified Zoho Account to display the distributor&apos;s invoices, Pro Forma Invoices, quotes and contacts.
          No sales amount is estimated from portal orders.
        </div>
      )}
    </div>
  );
}
