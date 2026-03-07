import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

export default async function PricingPage() {
  const session = await getServerSession();

  const tier = await (async () => {
    if (!session?.distributorId) return "STANDARD";
    const dist = await prisma.distributor.findUnique({
      where: { id: session.distributorId },
      select: { tier: true },
    });
    return dist?.tier ?? "STANDARD";
  })();

  const prices = await prisma.price.findMany({
    where: { tier },
    include: {
      variant: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      variant: {
        product: {
          name: "asc",
        },
      },
    },
  });

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Pricing</h1>
      <p className="text-sm text-zinc-600">
        Tier: <span className="font-medium">{tier}</span>
      </p>

      <div className="border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-8 gap-2 p-3 text-xs bg-zinc-50 font-medium">
          <div className="col-span-2">Product</div>
          <div>SKU</div>
          <div>Size</div>
          <div>Stone Type</div>
          <div className="text-right">Per Sheet</div>
          <div className="text-right">Per SQM</div>
          <div className="text-right">Per SQFT</div>
        </div>

        {prices.map((pr) => (
          <div key={pr.id} className="grid grid-cols-8 gap-2 p-3 text-sm border-t">
            <div className="col-span-2">
              {pr.variant?.product?.name || "Unknown Product"}
            </div>
            <div className="text-zinc-600">
              {pr.variant?.product?.sku || "-"}
            </div>
            <div className="text-zinc-600">
              {pr.variant?.sizeLabel || "-"}
            </div>
            <div className="text-zinc-600">
              {pr.variant?.product?.stoneType || "-"}
            </div>
            <div className="text-right font-medium">
              {pr.currency} {Number(pr.priceSheet || 0).toFixed(2)}
            </div>
            <div className="text-right font-medium">
              {pr.currency} {Number(pr.priceSqm || 0).toFixed(2)}
            </div>
            <div className="text-right font-medium">
              {pr.currency} {Number(pr.priceSqft || 0).toFixed(2)}
            </div>
          </div>
        ))}

        {prices.length === 0 && (
          <div className="p-3 text-sm text-zinc-600">
            No pricing configured for this tier.
          </div>
        )}
      </div>
    </div>
  );
}