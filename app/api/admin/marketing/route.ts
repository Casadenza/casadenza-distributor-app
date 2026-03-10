import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isAdminSession(session: any) {
  return !!session?.isAdmin || session?.role === "ADMIN" || session?.user?.role === "ADMIN";
}

const ALLOWED_TYPES = new Set(["DOCUMENT", "IMAGE", "VIDEO"]);

const ALLOWED_CATEGORIES = new Set([
  "PRODUCT_CATALOGUE_FULL",
  "COLLECTION_CATALOGUE",
  "TECHNICAL_DATA_SHEET",
  "INSTALLATION_GUIDE",
  "MAINTENANCE_GUIDE",
  "FIRE_TEST_CERTIFICATE",
  "BROCHURE_SHORT",
  "COMPANY_PROFILE_PDF",
  "OTHERS_DOCUMENTS",
  "SAMPLE_KIT_GUIDE",
  "PROJECT_REFERENCE_LIST",
  "PROJECT_HOTEL",
  "PROJECT_VILLA",
  "PROJECT_COMMERCIAL_FACADE",
  "PROJECT_INTERIOR_WALL",
  "PROJECT_BEFORE_AFTER",
  "VIDEO_INSTALLATION",
  "VIDEO_PROJECT_SHOWCASE",
  "VIDEO_PRODUCT_HIGHLIGHT",
  "VIDEO_BRAND_INTRO",
  "VIDEO_PROMO_30S",
  "VIDEO_REELS_SHORT",
]);

function extFromMime(mime: string) {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "video/mp4") return "mp4";
  if (mime === "video/webm") return "webm";
  return "";
}

function resourceTypeFromAssetType(type: string): "raw" | "image" | "video" {
  if (type === "DOCUMENT") return "raw";
  if (type === "IMAGE") return "image";
  return "video";
}

// GET /api/admin/marketing
export async function GET() {
  const session = await getServerSession();
  if (!isAdminSession(session)) return jsonError("Unauthorized", 401);

  const items = await prisma.marketingAsset.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  return NextResponse.json({ ok: true, items });
}

// POST /api/admin/marketing
export async function POST(req: Request) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return jsonError("Unauthorized", 401);

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    if (!body) return jsonError("Invalid JSON", 400);

    const title = String(body.title || "").trim();
    const type = String(body.type || "").toUpperCase();
    const category = String(body.category || "").toUpperCase();
    const externalUrl = String(body.externalUrl || "").trim();

    if (!title) return jsonError("Missing title", 400);
    if (!ALLOWED_TYPES.has(type)) return jsonError("Invalid type", 400);
    if (!ALLOWED_CATEGORIES.has(category)) return jsonError("Invalid category", 400);

    if (type !== "VIDEO") return jsonError("JSON mode only allowed for VIDEO links", 400);
    if (!externalUrl) return jsonError("Missing externalUrl", 400);

    const created = await prisma.marketingAsset.create({
      data: {
        title,
        type,
        category,
        collection: body.collection ? String(body.collection) : null,
        stoneType: body.stoneType ? String(body.stoneType) : null,
        description: body.description ? String(body.description) : null,
        externalUrl,
        isActive: true,
      },
    });

    return NextResponse.json({ ok: true, item: created });
  }

  if (!contentType.includes("multipart/form-data")) {
    return jsonError("Unsupported content-type. Use multipart/form-data or application/json", 415);
  }

  const form = await req.formData();

  const title = String(form.get("title") || "").trim();
  const type = String(form.get("type") || "").toUpperCase();
  const category = String(form.get("category") || "").toUpperCase();
  const collection = String(form.get("collection") || "").trim();
  const stoneType = String(form.get("stoneType") || "").trim();
  const description = String(form.get("description") || "").trim();
  const file = form.get("file") as File | null;

  if (!title) return jsonError("Missing title", 400);
  if (!ALLOWED_TYPES.has(type)) return jsonError("Invalid type", 400);
  if (!ALLOWED_CATEGORIES.has(category)) return jsonError("Invalid category", 400);
  if (!file) return jsonError("Missing file", 400);

  const mime = file.type;
  if (type === "DOCUMENT" && mime !== "application/pdf") return jsonError("Document must be PDF", 400);
  if (type === "IMAGE" && !["image/jpeg", "image/png", "image/webp"].includes(mime)) {
    return jsonError("Image must be JPG/PNG/WEBP", 400);
  }
  if (type === "VIDEO" && !["video/mp4", "video/webm"].includes(mime)) {
    return jsonError("Video must be MP4/WEBM", 400);
  }

  const ext = extFromMime(mime);
  if (!ext) return jsonError("Unsupported file type", 400);

  const created = await prisma.marketingAsset.create({
    data: {
      title,
      type,
      category,
      collection: collection || null,
      stoneType: stoneType || null,
      description: description || null,
      mimeType: mime,
      fileSize: file.size,
      isActive: true,
    },
  });

  const buffer = Buffer.from(await file.arrayBuffer());

  const uploaded = await uploadBufferToCloudinary({
    buffer,
    folder: `casadenza/marketing/${type.toLowerCase()}`,
    publicId: created.id,
    resourceType: resourceTypeFromAssetType(type),
    filename: `${created.id}.${ext}`,
  });

  const updated = await prisma.marketingAsset.update({
    where: { id: created.id },
    data: {
      filePath: uploaded.publicId,
      fileUrl: uploaded.secureUrl,
    },
  });

  return NextResponse.json({ ok: true, item: updated });
}