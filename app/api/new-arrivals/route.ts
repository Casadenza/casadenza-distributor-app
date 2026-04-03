import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/app/api/_session";

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

export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await prisma.product.findMany({
      where: {
        isActive: true,
        isNewArrival: true,
      },
      orderBy: [{ newArrivalPriority: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        sku: true,
        name: true,
        image: true,
        collection: true,
        stoneType: true,
        thicknessMm: true,
        galleryJson: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      items: items.map((product) => {
        const payload = parseGalleryPayload(product.galleryJson, product.image);

        return {
          id: product.id,
          sku: product.sku,
          name: product.name,
          collection: product.collection ?? "",
          stoneType: product.stoneType ?? "",
          thicknessMm: product.thicknessMm ?? null,
          updatedAt: product.updatedAt,
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