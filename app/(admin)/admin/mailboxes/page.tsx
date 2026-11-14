import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/serverSession";
import { gmailConfigReady, GMAIL_ADDRESSES } from "@/lib/gmail-oauth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MailboxesPage({ searchParams }: { searchParams?: { result?: string } }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/admin");
  const ready = gmailConfigReady();
  let connections: { mailbox: string; address: string; updatedAt: Date }[] = [];
  let databaseReady = true;
  try {
    connections = await prisma.gmailMailboxConnection.findMany({
      select: { mailbox: true, address: true, updatedAt: true },
    });
  } catch {
    databaseReady = false;
  }
  const labels = {
    info: "info@casadenza.com",
  } as const;
  const result = String(searchParams?.result || "");
  const messages: Record<string, string> = {
    info_connected: "info@casadenza.com connected successfully.",
    invalid_state: "Authorization could not be validated. Please retry.",
    expired_state: "Authorization expired. Please retry.",
    permission_denied: "Google access was not approved.",
    connection_failed: "Connection failed. Verify the correct account and Google app permissions.",
    configuration_missing: "Google OAuth credentials are not configured.",
    unauthorized: "Please sign in as an administrator.",
    missing_code: "Google did not return an authorization code.",
  };
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 space-y-6">
      <Link href="/admin/communications" className="text-sm text-neutral-500 hover:text-neutral-900">← Communications</Link>
      <div>
        <h1 className="text-3xl font-semibold text-neutral-900">Gmail connections</h1>
        <p className="mt-2 text-sm text-neutral-600">Connect info@casadenza.com for automatic read-only order and shipment scanning. No emails are sent or deleted.</p>
      </div>
      {result && <p role="status" className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">{messages[result] || "Connection status updated."}</p>}
      {!ready && <div className="rounded-xl border border-amber-300 p-4 text-sm text-amber-900">Google OAuth setup is incomplete. An administrator must configure GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_TOKEN_ENCRYPTION_KEY in Vercel.</div>}
      {!databaseReady && <div className="rounded-xl border border-amber-300 p-4 text-sm text-amber-900">Database migration is pending. Apply the GmailMailboxConnection migration before connecting accounts.</div>}
      <section className="grid gap-4">
        {(Object.keys(labels) as Array<keyof typeof labels>).map(mailbox => {
          const connection = connections.find(c => c.mailbox === mailbox && c.address === GMAIL_ADDRESSES[mailbox]);
          return (
            <div key={mailbox} className="rounded-2xl border border-neutral-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-semibold">{labels[mailbox]}</h2>
                <p className="text-sm text-neutral-600">{connection ? "Authorized for read-only Gmail access" : "Not connected"}</p>
                {connection && <p className="text-xs text-neutral-500">Updated {connection.updatedAt.toLocaleString("en-IN")}</p>}
              </div>
              <div className="flex items-center gap-3">
                <a aria-disabled={!ready || !databaseReady} href={ready && databaseReady ? "/api/admin/gmail/connect?mailbox=" + mailbox : "#"} className={"rounded-xl px-4 py-2 text-sm text-white " + (ready && databaseReady ? "bg-neutral-900" : "bg-neutral-400 pointer-events-none")}>{connection ? "Reconnect Google" : "Connect Google"}</a>
                {connection && <form method="POST" action="/api/admin/gmail/disconnect">
                  <input type="hidden" name="mailbox" value={mailbox} />
                  <button className="rounded-xl border border-neutral-300 px-4 py-2 text-sm" type="submit">Disconnect</button>
                </form>}
              </div>
            </div>
          );
        })}
      </section>
      <p className="text-xs text-neutral-500">Connections only authorize Gmail reading. Automatic production scanning requires separate database, scheduler and security checks before activation.</p>
    </main>
  );
}
