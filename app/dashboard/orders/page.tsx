import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

const statusOrder = ["RECEIVED", "CONFIRMED", "IN_PRODUCTION", "PACKED", "DISPATCHED", "DELIVERED"];

function statusPercent(status: string) {
  const i = Math.max(0, statusOrder.indexOf(status));
  return Math.round((i / (statusOrder.length - 1)) * 100);
}

export default async function OrdersPage() {
  const session = await getServerSession();

  if (!session?.distributorId) {
    return <div className="text-sm text-zinc-600">Unauthorized</div>;
  }

  const items = await prisma.order.findMany({
    where: { distributorId: session.distributorId },
    include: {
      items: { include: { product: true } },
      documents: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">My Orders</h1>

      <div className="space-y-3">
        {items.map((o) => (
          <div key={o.id} className="border rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold">Order #{o.id.slice(-6)}</div>
              <div className="text-sm">
                Status: <span className="font-medium">{o.status}</span>
              </div>
            </div>

            <div className="mt-2">
              <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-black" style={{ width: `${statusPercent(o.status)}%` }} />
              </div>
              <div className="text-xs text-zinc-600 mt-1">ETA: {o.eta ?? "To be confirmed"}</div>
            </div>

            <div className="mt-3 text-sm">
              <div className="font-medium mb-1">Items</div>
              <ul className="list-disc ml-5">
                {o.items.map((it) => (
                  <li key={it.id}>
                    {it.product?.name || "Unknown Product"} × {it.qty}
                  </li>
                ))}
              </ul>
            </div>

            {o.documents.length > 0 && (
              <div className="mt-3 text-sm">
                <div className="font-medium mb-1">Documents</div>
                <ul className="list-disc ml-5">
                  {o.documents.map((d) => (
                    <li key={d.id}>
                      {d.url ? (
                        <a
                          className="text-blue-700"
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {d.title || "Document"}
                        </a>
                      ) : (
                        <span className="text-zinc-500">{d.title || "Document"}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3 text-xs text-zinc-500">
              Created: {new Date(o.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}

        {items.length === 0 && <div className="text-sm text-zinc-600">No orders yet.</div>}
      </div>
    </div>
  );
}