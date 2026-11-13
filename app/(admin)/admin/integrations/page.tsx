import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { getZohoAccessToken, zohoConfigured } from "@/lib/zoho";
import { CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

async function statusInfo() {
  const env = {
    zoho: zohoConfigured(),
    cloudinary: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
    smtp: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
  };
  let database = false;
  let migrations = false;
  let linkedDistributors = 0;
  let zohoAuth = false;
  let zohoIssue = "";

  try {
    await prisma.user.count();
    database = true;
    // These queries fail safely when the new schema has not been migrated.
    linkedDistributors = await prisma.distributor.count({ where: { zohoAccountId: { not: null } } });
    await prisma.communicationThread.count();
    migrations = true;
  } catch (error) {
    console.warn("Portal integration database check unavailable", error instanceof Error ? error.name : "Unknown");
  }
  if (env.zoho) {
    try {
      await getZohoAccessToken();
      zohoAuth = true;
    } catch (error) {
      const code = error instanceof Error ? error.message : "ZOHO_AUTH_UNAVAILABLE";
      // Only known, non-secret error classifications are displayed to admins.
      const messages: Record<string, string> = {
        ZOHO_AUTH_INVALID_CLIENT_SECRET: "Zoho rejected the Client Secret. Update ZOHO_CLIENT_SECRET using the same Self Client that generated the refresh token.",
        ZOHO_AUTH_INVALID_CLIENT: "Zoho rejected the Client ID. Check the Self Client and the India data centre.",
        ZOHO_AUTH_INVALID_REFRESH_TOKEN: "Zoho rejected the refresh token. Generate a new refresh token for the same Self Client.",
        ZOHO_AUTH_INVALID_GRANT: "Zoho rejected this grant or refresh token. Verify the refresh token and client pairing.",
        ZOHO_AUTH_INVALID_CODE: "Zoho rejected the refresh token. It may be missing, invalid, revoked, or an authorization code may have been pasted. Verify a fresh refresh token.",
        ZOHO_AUTH_INVALID_SCOPE: "Zoho rejected the requested scopes. Generate the refresh token with CRM read and COQL read scopes.",
        ZOHO_AUTH_ACCESS_DENIED: "Zoho denied this application's authorization. Review the Self Client permissions.",
        ZOHO_AUTH_ORG_INACTIVE: "The connected Zoho organization is inactive.",
      };
      zohoIssue = messages[code] || "Zoho token exchange failed. Confirm Client ID, Client Secret, refresh token, and Zoho India endpoints.";
      console.warn("Zoho OAuth validation unsuccessful", code.startsWith("ZOHO_AUTH_") ? code : "ZOHO_AUTH_UNAVAILABLE");
    }
  }
  return { env, database, migrations, linkedDistributors, zohoAuth, zohoIssue };
}

function StatusCard({ title, good, details }: { title: string; good: boolean; details: string }) {
  return <div className="rounded-2xl border border-[#E8E1D7] bg-white p-4 sm:p-5">
    <div className="flex items-start gap-3">
      {good ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={20}/> : <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={20}/>}
      <div>
        <p className="text-[15px] font-semibold text-[#2B271F]">{title}</p>
        <p className="mt-1 text-[12px] leading-5 text-[#857B6D]">{details}</p>
        <p className={"mt-2 text-[12px] font-semibold " + (good ? "text-emerald-700" : "text-amber-800")}>{good ? "Ready" : "Needs attention"}</p>
      </div>
    </div>
  </div>;
}

export default async function IntegrationStatusPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/admin");
  const s = await statusInfo();
  return <div className="mx-auto max-w-[1100px] space-y-5">
    <header>
      <p className="text-[11px] font-bold uppercase tracking-[0.20em] text-[#B6945B]">Admin / Configuration</p>
      <h1 className="mt-2 font-serif text-[29px] text-[#27221D] sm:text-[37px]">Integration Status</h1>
      <p className="mt-2 max-w-[790px] text-[13px] leading-6 text-[#807669]">
        Read-only checks for the distributor portal. Passwords, access tokens and API secrets are never shown here.
      </p>
    </header>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <StatusCard title="Portal database" good={s.database} details="Checks that the existing database is reachable."/>
      <StatusCard title="New database migration" good={s.migrations} details="Checks whether the communication tables and Zoho account link are usable."/>
      <StatusCard title="Zoho CRM OAuth" good={s.zohoAuth} details={!s.env.zoho ? "Configure ZOHO_REFRESH_TOKEN, ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET in Vercel." : s.zohoIssue || "Zoho accepted the configured OAuth refresh credentials."}/>
      <StatusCard title="Cloudinary configuration" good={s.env.cloudinary} details="Environment variables must be set and the previously exposed API credential must be rotated separately."/>
      <StatusCard title="Email SMTP settings" good={s.env.smtp} details="Checks whether SMTP_USER and SMTP_PASS are set. Actual delivery must be tested before launch."/>
      <StatusCard title="Verified Zoho links" good={s.migrations && s.linkedDistributors > 0} details={s.migrations ? String(s.linkedDistributors) + " distributor accounts linked to Zoho." : "Run the new database migration before linking distributor accounts."}/>
    </div>
    <section className="rounded-2xl border border-[#E9E0D1] bg-[#FAF7F0] p-4 sm:p-5">
      <div className="flex items-center gap-2"><ShieldCheck size={20} className="text-[#A78652]"/><h2 className="text-[17px] font-semibold">Production release conditions</h2></div>
      <p className="mt-2 text-[13px] leading-6 text-[#796D5E]">
        A passing build is not proof that integrations are configured. Before production: rotate the exposed Cloudinary secret, back up and migrate the database,
        verify Zoho Account mappings, test admin/distributor access and run real SMTP delivery checks.
      </p>
      <Link href="/admin/distributors" className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#24211D] px-4 text-[13px] font-semibold text-white">
        Manage distributor links <ArrowRight size={16}/>
      </Link>
    </section>
  </div>;
}
