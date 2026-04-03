import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ✅ Existing Cloudinary config preserved
cloudinary.config({
  cloud_name: "dojmi5ihx",
  api_key: "484877611841484",
  api_secret: "-YiUoCNyqK7l6sJMssknSgosLYk",
});

function sanitizeFileName(name: string) {
  return name
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function uploadSingleFile(file: File): Promise<string> {
  if (!file) {
    throw new Error("No file provided");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Each image must be 10 MB or less");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return await new Promise<string>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "casadenza",
          resource_type: "image",
          public_id: `${Date.now()}-${sanitizeFileName(file.name || "image")}`,
        },
        (error, result) => {
          if (error || !result?.secure_url) {
            return reject(new Error("Upload Failed"));
          }

          return resolve(result.secure_url);
        }
      )
      .end(buffer);
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();

    const multipleFiles = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File);

    const singleFile = formData.get("file");
    const files: File[] =
      multipleFiles.length > 0
        ? multipleFiles
        : singleFile instanceof File
        ? [singleFile]
        : [];

    if (!files.length) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      const url = await uploadSingleFile(file);
      uploadedUrls.push(url);
    }

    if (uploadedUrls.length === 1) {
      return NextResponse.json({
        url: uploadedUrls[0],
        urls: uploadedUrls,
      });
    }

    return NextResponse.json({
      urls: uploadedUrls,
    });
  } catch (e: any) {
    const message =
      typeof e?.message === "string" && e.message.trim()
        ? e.message
        : "Server Error";

    const status =
      message === "No file provided" ||
      message === "Only image files are allowed" ||
      message === "Each image must be 10 MB or less"
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}