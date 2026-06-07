import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, parse, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const detailsDir = join(root, "data/details");
const products = JSON.parse(readFileSync(join(root, "data/products.json"), "utf8"));

function relPublicPath(src) {
  if (!src?.startsWith("/")) return null;
  if (!/\.(jpe?g|png|webp)$/i.test(src)) return null;
  return src.slice(1);
}

async function writeWebp(srcRel, variant, width, quality) {
  const source = join(publicDir, srcRel);
  if (!existsSync(source)) return null;

  const parsed = parse(srcRel);
  const targetRel = join("optimized", parsed.dir, `${parsed.name}-${variant}.webp`);
  const target = join(publicDir, targetRel);
  mkdirSync(dirname(target), { recursive: true });

  const image = sharp(source).rotate();
  const metadata = await image.metadata();
  const resizeWidth = metadata.width && metadata.width > width ? width : metadata.width;
  await image
    .resize(resizeWidth ? { width: resizeWidth, withoutEnlargement: true } : undefined)
    .webp({ quality, effort: 5 })
    .toFile(target);

  return targetRel.split(sep).join("/");
}

const jobs = new Map();
function add(src, variant, width, quality) {
  const rel = relPublicPath(src);
  if (!rel) return;
  jobs.set(`${rel}|${variant}`, { rel, variant, width, quality });
}

for (const file of ["CLF_5650.jpg", "DSC_7726.jpg", "CLF_3860.jpg"]) {
  add(`/banner/${file}`, "detail", 1600, 76);
  add(`/banner/${file}`, "card", 900, 72);
}

for (const product of products.filter((p) => p.published)) {
  const detailPath = join(detailsDir, `${product.slug}.json`);
  if (!existsSync(detailPath)) continue;
  const detail = JSON.parse(readFileSync(detailPath, "utf8"));
  add(detail.cardImage, "card", 640, 72);
  add(detail.heroImage, "card", 640, 72);
  add(detail.heroImage, "detail", 2400, 78);
  add(detail.routeMap?.src, "route", 1600, 78);
}

let written = 0;
for (const job of jobs.values()) {
  try {
    const out = await writeWebp(job.rel, job.variant, job.width, job.quality);
    if (out) {
      written += 1;
      console.log(`${relative(root, join(publicDir, out)).split(sep).join("/")}`);
    }
  } catch (error) {
    console.warn(`Skipped unsupported image ${job.rel}: ${error.message}`);
  }
}

console.log(`Optimized ${written} image variant(s).`);
