import path from "path";

export function marketingRoot() {
  return path.join(process.cwd(), "storage", "marketing");
}

export function marketingDirForType(type: string) {
  const t = String(type || "").toUpperCase();
  if (t === "DOCUMENT") return path.join(marketingRoot(), "documents");
  if (t === "IMAGE") return path.join(marketingRoot(), "images");
  return path.join(marketingRoot(), "videos");
}

export function marketingFilePath(type: string, id: string, ext: string) {
  return path.join(marketingDirForType(type), `${id}.${ext}`);
}