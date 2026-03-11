import { v2 as cloudinary } from "cloudinary";

/**
 * Central Cloudinary helper.
 * - Uses env: CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
 * - Safe to import from any route (lazy config + cached)
 */

function mustEnv(
  key: "CLOUDINARY_CLOUD_NAME" | "CLOUDINARY_API_KEY" | "CLOUDINARY_API_SECRET"
) {
  const v = process.env[key];
  if (!v || !v.trim()) throw new Error(`${key} missing in env`);
  return v;
}

let configured = false;

export function cloudinaryConfig() {
  if (!configured) {
    cloudinary.config({
      cloud_name: mustEnv("CLOUDINARY_CLOUD_NAME"),
      api_key: mustEnv("CLOUDINARY_API_KEY"),
      api_secret: mustEnv("CLOUDINARY_API_SECRET"),
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

function isAllowedFolder(folder: string) {
  const f = String(folder || "").trim().replace(/\/+$/, "");
  if (!f) return false;

  const allowedPrefixes = [
    "casadenza/documents/",
    "casadenza/marketing/document",
    "casadenza/marketing/image",
    "casadenza/marketing/video",
    "casadenza/products",
    "products",
  ];

  return allowedPrefixes.some((prefix) => {
    if (prefix.endsWith("/")) return f.startsWith(prefix);
    return f === prefix || f.startsWith(prefix + "/");
  });
}

export async function uploadBuffer(opts: {
  buffer: Buffer;
  folder: string;
  publicId?: string;
  resourceType: "image" | "raw" | "video";
  filename?: string;
}) {
  if (!isAllowedFolder(opts.folder)) {
    throw new Error("Invalid upload folder");
  }

  const cld = cloudinaryConfig();

  return await new Promise<{ secureUrl: string; publicId: string }>((resolve, reject) => {
    const stream = cld.uploader.upload_stream(
      {
        folder: opts.folder,
        public_id: opts.publicId,
        resource_type: opts.resourceType,
        overwrite: true,
        use_filename: !!opts.filename,
        filename_override: opts.filename,
        unique_filename: !opts.publicId,
      },
      (err, res) => {
        if (err || !res) return reject(err || new Error("Cloudinary upload failed"));
        resolve({ secureUrl: String(res.secure_url), publicId: String(res.public_id) });
      }
    );

    stream.end(opts.buffer);
  });
}

// Backward-compatible alias used in some admin APIs
export const uploadBufferToCloudinary = uploadBuffer;