import Link from "next/link";
import { prisma } from "@/lib/db";
import ProductsTable from "../products-table";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      sku: true,
      name: true,
      collection: true,
      stoneType: true,
      thicknessMm: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      image: true,
      variants: { select: { id: true } },
    },
  });

  const rows = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    collection: p.collection,
    stoneType: p.stoneType,
    thicknessMm: p.thicknessMm,
    isActive: p.isActive,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    variants: p.variants,
    variantsCount: p.variants.length,
    image: p.image || "",
  }));

  return (
    <div className="space-y-4">
      <div className="cz-card p-6 flex items-start justify-between gap-6">
        <div>
          <div className="text-sm cz-muted">Catalog</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Products</h1>
          <p className="mt-2 text-sm cz-muted">
            Manage products & variants. Toggle Active/Inactive and edit key fields.
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold hover:opacity-90"
        >
          + Add Product
        </Link>
      </div>

      <ProductsTable />
    </div>
  );
}