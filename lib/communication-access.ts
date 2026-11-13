import { getServerSession } from "@/lib/serverSession";
import { prisma } from "@/lib/db";

export type CommunicationActor = {
  userId: string;
  role: "ADMIN" | "DISTRIBUTOR";
  distributorId: string | null;
};

export async function getCommunicationActor(): Promise<CommunicationActor | null> {
  const session = await getServerSession();
  if (!session?.userId) return null;
  if (session.role === "ADMIN") {
    return { userId: session.userId, role: "ADMIN", distributorId: null };
  }
  if (session.role !== "DISTRIBUTOR") return null;
  const distributor = await prisma.distributor.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!distributor) return null;
  return { userId: session.userId, role: "DISTRIBUTOR", distributorId: distributor.id };
}

export function communicationScope(actor: CommunicationActor) {
  return actor.role === "ADMIN" ? {} : { distributorId: actor.distributorId! };
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const allowedHost = request.headers.get("x-forwarded-host") || new URL(request.url).host;
    return new URL(origin).host.toLowerCase() === allowedHost.toLowerCase();
  } catch {
    return false;
  }
}

export function normalizeBody(raw: unknown, max = 10000) {
  if (typeof raw !== "string") return null;
  const value = raw.replace(/\r\n/g, "\n").trim();
  return value.length > 0 && value.length <= max ? value : null;
}
