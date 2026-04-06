import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import ProductDetailsClient from "./product-details-client";

export default async function ProductDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      sku: true,
      name: true,
      image: true,
      collection: true,
      stoneType: true,
      thicknessMm: true,
      variants: {
        where: { isActive: true },
        orderBy: [{ widthMm: "asc" }, { heightMm: "asc" }],
        select: {
          id: true,
          sizeLabel: true,
          widthMm: true,
          heightMm: true,
        },
      },
    },
  });

  if (!product) notFound();

  return <ProductDetailsClient product={product} />;
}