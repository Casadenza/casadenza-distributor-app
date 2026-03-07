import { v2 as cloudinary } from "cloudinary";

/**
 * Cloudinary uploader (env-based)
 * - Uses CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
 * - Provides backward-compatible export: uploadBufferToCloudinary
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

export async function uploadBuffer(opts: {
  buffer: Buffer;
  folder: string;
  publicId?: string;
  resourceType: "image" | "raw" | "video";
  filename?: string;
}) {
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

/**
 * Backward-compatible named export (your API routes expect this name)
 */
export const uploadBufferToCloudinary = uploadBuffer;