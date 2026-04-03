import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";

export const runtime = "nodejs";

type GalleryPayload = {
  images: string[];
  launchDate: string | null;
  description: string | null;
};

function parseGalleryPayload(raw: unknown, fallback?: string | null): GalleryPayload {
  let images: string[] = [];
  let launchDate: string | null = null;
  let description: string | null = null;

  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        images = parsed
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean);
      } else if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;

        if (Array.isArray(record.images)) {
          images = record.images
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter(Boolean);
        }

        if (typeof record.launchDate === "string" && record.launchDate.trim()) {
          launchDate = record.launchDate.trim();
        }

        if (typeof record.description === "string" && record.description.trim()) {
          description = record.description.trim();
        }
      }
    } catch {
      // ignore malformed JSON
    }
  }

  if (fallback && fallback.trim()) {
    images.unshift(fallback.trim());
  }

  return {
    images: Array.from(new Set(images)),
    launchDate,
    description,
  };
}

function cleanString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function GET() {
  const session = await getServerSession();

  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const products = await prisma.product.findMany({
      orderBy: [{ newArrivalPriority: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        sku: true,
        name: true,
        image: true,
        collection: true,
        stoneType: true,
        isActive: true,
        isNewArrival: true,
        newArrivalPriority: true,
        galleryJson: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      items: products.map((product) => {
        const payload = parseGalleryPayload(product.galleryJson, product.image);

        return {
          ...product,
          images: payload.images,
          image: payload.images[0] ?? null,
          launchDate: payload.launchDate,
          description: payload.description,
        };
      }),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load new arrivals" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession();

  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const productId = cleanString(body?.productId);

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const rawImages = Array.isArray(body?.images) ? body.images : [];
    const images = Array.from(
      new Set(
        rawImages
          .filter((value: unknown): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean)
      )
    );

    const priorityValue = Number(body?.newArrivalPriority);
    const newArrivalPriority = Number.isFinite(priorityValue)
      ? Math.max(0, Math.trunc(priorityValue))
      : 0;

    const launchDate = cleanString(body?.launchDate);
    const description = cleanString(body?.description);

    const galleryJson = JSON.stringify({
      images,
      launchDate,
      description,
    });

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        collection:
          body?.collection === undefined ? undefined : cleanString(body.collection),
        isNewArrival: Boolean(body?.isNewArrival),
        newArrivalPriority,
        image: images[0] ?? null,
        galleryJson,
      },
      select: {
        id: true,
        sku: true,
        name: true,
        image: true,
        collection: true,
        stoneType: true,
        isActive: true,
        isNewArrival: true,
        newArrivalPriority: true,
        galleryJson: true,
        updatedAt: true,
      },
    });

    const payload = parseGalleryPayload(updated.galleryJson, updated.image);

    return NextResponse.json({
      ok: true,
      item: {
        ...updated,
        images: payload.images,
        image: payload.images[0] ?? null,
        launchDate: payload.launchDate,
        description: payload.description,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to save new arrival" },
      { status: 400 }
    );
  }
}