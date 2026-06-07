import { existsSync } from "node:fs";
import { join, posix } from "node:path";

export type OptimizedImageVariant = "card" | "detail" | "route";

function splitPublicImage(src: string) {
  if (!src || !src.startsWith("/")) return null;
  const path = src.slice(1);
  const extIndex = path.lastIndexOf(".");
  if (extIndex < 0) return null;
  const ext = path.slice(extIndex).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return null;
  return {
    dir: posix.dirname(path),
    base: posix.basename(path, ext),
  };
}

export function getOptimizedImageSrc(src: string | undefined, variant: OptimizedImageVariant) {
  if (!src) return undefined;
  const parsed = splitPublicImage(src);
  if (!parsed) return src;
  const optimizedPath = `/optimized/${parsed.dir}/${parsed.base}-${variant}.webp`;
  const fsPath = join(process.cwd(), "public", optimizedPath.slice(1));
  return existsSync(fsPath) ? optimizedPath : src;
}
