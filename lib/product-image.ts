export type ProductImageMode = "fill" | "limit";

type ProductImageOptions = {
  width?: number;
  height?: number;
  mode?: ProductImageMode;
  quality?: string;
};

export function getOptimizedProductImage(
  src?: string | null,
  { width, height, mode = "limit", quality = "auto:good" }: ProductImageOptions = {}
) {
  if (!src) return "";

  if (!src.includes("/upload/")) {
    return src;
  }

  const [base, remainder] = src.split("/upload/");
  if (!base || !remainder) return src;

  const transforms = ["f_auto", `q_${quality}`, "dpr_auto"];

  if (mode === "fill" && width && height) {
    transforms.push("c_fill", "g_auto", `w_${Math.round(width)}`, `h_${Math.round(height)}`);
  } else {
    transforms.push("c_limit");
    if (width) transforms.push(`w_${Math.round(width)}`);
    if (height) transforms.push(`h_${Math.round(height)}`);
  }

  return `${base}/upload/${transforms.join(",")}/${remainder}`;
}