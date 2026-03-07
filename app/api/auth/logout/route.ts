import { NextResponse } from "next/server";
import { clearSession } from "@/lib/serverSession";

export async function POST(req: Request) {
  clearSession();
  const url = new URL("/login", req.url);
  return NextResponse.redirect(url);
}
