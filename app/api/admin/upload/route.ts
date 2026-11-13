import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverSession";
import { cloudinaryConfig } from "@/lib/cloudinary";
import { isSameOrigin } from "@/lib/communication-access";

export const runtime = "nodejs";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 6;
function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "image";
}
async function uploadSingleFile(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Only JPEG, PNG and WEBP images are allowed");
  if (!file.size || file.size > MAX_FILE_SIZE) throw new Error("Each image must be 10 MB or less");
  const buffer = Buffer.from(await file.arrayBuffer());
  const cloudinary = cloudinaryConfig();
  return new Promise<string>((resolve, reject) => {
    cloudinary.uploader.upload_stream({
      folder: "casadenza",
      resource_type: "image",
      public_id: Date.now() + "-" + sanitizeFileName(file.name),
      overwrite: false,
      unique_filename: true,
    }, (error, result) => {
      if (error || !result?.secure_url) return reject(new Error("Image upload failed"));
      resolve(result.secure_url);
    }).end(buffer);
  });
}
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const data = await request.formData();
    const batch = data.getAll("files").filter((v): v is File => v instanceof File);
    const single = data.get("file");
    const files = batch.length ? batch : single instanceof File ? [single] : [];
    if (!files.length) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (files.length > MAX_FILES) return NextResponse.json({ error: "Upload up to 6 images per request" }, { status: 400 });
    if (files.some(f => !["image/jpeg", "image/png", "image/webp"].includes(f.type) || !f.size || f.size > MAX_FILE_SIZE)) {
      return NextResponse.json({ error: "Only JPEG, PNG or WEBP files up to 10 MB are allowed" }, { status: 400 });
    }
    const urls = await Promise.all(files.map(uploadSingleFile));
    return NextResponse.json(urls.length === 1 ? { url: urls[0], urls } : { urls });
  } catch (error) {
    console.error("Admin upload failed", error);
    return NextResponse.json({ error: "Image upload failed" }, { status: 500 });
  }
}
