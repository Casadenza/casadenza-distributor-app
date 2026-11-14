import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverSession";
import { zohoConfigured, zohoRequest } from "@/lib/zoho";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only helper. Search results are suggestions; saving always re-verifies the exact record ID.
export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (!zohoConfigured()) {
    return NextResponse.json({ ok: false, error: "Zoho credentials are not configured" }, { status: 503 });
  }
  const word = new URL(request.url).searchParams.get("word")?.trim() || "";
  if (word.length < 3 || word.length > 80) {
    return NextResponse.json({ ok: false, error: "Enter 3 to 80 characters" }, { status: 400 });
  }
  try {
    const path = "/crm/v8/Accounts/search?word=" + encodeURIComponent(word) + "&per_page=20&page=1";
    const response = await zohoRequest(path);
    const accounts = (Array.isArray(response.data) ? response.data : []).map((entry: any) => ({
      id: String(entry.id || ""),
      name: String(entry.Account_Name || ""),
      country: entry.Billing_Country ? String(entry.Billing_Country) : null,
    })).filter((item: { id: string; name: string }) => /^\d{12,22}$/.test(item.id) && !!item.name);
    return NextResponse.json({ ok: true, accounts }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Zoho Account search failed", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ ok: false, error: "Zoho Account search unavailable" }, { status: 503 });
  }
}
