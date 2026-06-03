import { execFileSync } from "node:child_process";
import {
  existsSync,
  unlinkSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const defaultSourceRoot = "/Volumes/Ida的硬盘，丢了赔付/船客产品2026";
const sourceRoot = process.argv[2] ?? defaultSourceRoot;
const minDepartureDate = "2026-06-01";
const maxGalleryImages = 4;

const productsPath = join(projectRoot, "data/products.json");
const detailsDir = join(projectRoot, "data/details");
const publicTripsDir = join(projectRoot, "public/trips");

if (!existsSync(sourceRoot)) {
  throw new Error(`Source root not found: ${sourceRoot}`);
}

const products = JSON.parse(readFileSync(productsPath, "utf8"));
const targetProducts = products.filter(
  (p) => p.published && p.departureDate >= minDepartureDate,
);

function shouldSkipPath(path) {
  const name = basename(path);
  if (name.startsWith("._")) return true;
  if (/(^|[^a-z])ty([^a-z]|$)/i.test(path)) return true;
  return false;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (shouldSkipPath(path)) continue;
    if (entry.isDirectory()) {
      walk(path, out);
    } else if (/\.pptx$/i.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

function normalizeName(value) {
  return value
    .toLowerCase()
    .replace(/\.[^.]+$/i, "")
    .replace(/[\s._\-—–·・（）()【】\[\]+&/\\|:：,，。]/g, "");
}

const pptPaths = walk(sourceRoot);
const pptByBase = new Map();
const pptByNormalized = new Map();
for (const path of pptPaths) {
  const base = basename(path);
  pptByBase.set(base, path);
  pptByNormalized.set(normalizeName(base), path);
}

function findPptForProduct(product) {
  const sourceFile = product.sourceFile ?? "";
  if (sourceFile && !sourceFile.startsWith("catalog/")) {
    const direct = join(sourceRoot, sourceFile);
    if (existsSync(direct) && /\.pptx$/i.test(direct) && !shouldSkipPath(direct)) {
      return direct;
    }
    const base = basename(sourceFile);
    if (pptByBase.has(base)) return pptByBase.get(base);
    const normalized = normalizeName(base);
    if (pptByNormalized.has(normalized)) return pptByNormalized.get(normalized);
  }

  if (product.category === "galapagos") {
    return (
      pptByNormalized.get(normalizeName("2026.8.04-08.22 厄瓜多尔.pptx")) ??
      [...pptPaths].find((path) => path.includes("厄瓜多尔"))
    );
  }

  const titleNeedle = normalizeName(product.title);
  return pptPaths.find((path) => titleNeedle && normalizeName(basename(path)).includes(titleNeedle));
}

function listPptMedia(path) {
  return execFileSync("unzip", ["-Z1", path], { encoding: "utf8", maxBuffer: 1024 * 1024 * 8 })
    .split("\n")
    .filter((name) => /^ppt\/media\/image/i.test(name))
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name));
}

function readPptEntry(path, entry) {
  return execFileSync("unzip", ["-p", path, entry], { maxBuffer: 1024 * 1024 * 80 });
}

function getPngSize(buffer) {
  if (buffer.length < 24) return undefined;
  if (buffer.toString("ascii", 1, 4) !== "PNG") return undefined;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function getJpegSize(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return undefined;
  let offset = 2;
  while (offset < buffer.length - 9) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb].includes(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return undefined;
}

function getWebpSize(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return undefined;
  }
  const type = buffer.toString("ascii", 12, 16);
  if (type === "VP8X" && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  return undefined;
}

function getImageSize(buffer, ext) {
  if (/png/i.test(ext)) return getPngSize(buffer);
  if (/jpe?g/i.test(ext)) return getJpegSize(buffer);
  if (/webp/i.test(ext)) return getWebpSize(buffer);
  return undefined;
}

async function photoScore(buffer, area) {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(72, 72, { fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let saturation = 0;
  let variance = 0;
  let white = 0;
  let veryLight = 0;
  let black = 0;
  const count = info.width * info.height;
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    saturation += max === 0 ? 0 : (max - min) / max;
    const mean = (r + g + b) / 3;
    variance += ((r - mean) ** 2 + (g - mean) ** 2 + (b - mean) ** 2) / 3;
    if (r > 238 && g > 238 && b > 238) white++;
    if (mean > 224) veryLight++;
    if (r < 42 && g < 42 && b < 42) black++;
  }

  const avgSat = saturation / count;
  const avgVariance = variance / count;
  const whiteRatio = white / count;
  const veryLightRatio = veryLight / count;
  const blackRatio = black / count;
  const lowPhotoSignal = avgSat < 0.08 && avgVariance < 220;
  const mapLike = whiteRatio > 0.48 && avgSat < 0.22;
  const floorPlanLike = veryLightRatio > 0.58 && avgVariance < 380;

  if (lowPhotoSignal || mapLike || floorPlanLike) return -Infinity;

  return (
    Math.log10(area || 1) * 2 +
    avgSat * 7 +
    Math.log10(avgVariance + 1) * 1.4 -
    whiteRatio * 6 -
    veryLightRatio * 2 -
    blackRatio * 5
  );
}

async function rankMedia(path) {
  const images = [];
  for (const entry of listPptMedia(path)) {
      const buffer = readPptEntry(path, entry);
      const ext = extname(entry).toLowerCase().replace(".jpeg", ".jpg");
      const size = getImageSize(buffer, ext);
      const width = size?.width ?? 0;
      const height = size?.height ?? 0;
      const area = width * height;
      const ratio = height ? width / height : 0;
      images.push({
        entry,
        buffer,
        ext,
        bytes: buffer.length,
        width,
        height,
        area,
        ratio,
        score: await photoScore(buffer, area),
      });
  }

  return images
    .filter((img) => img.bytes > 80_000)
    .filter((img) => img.width >= 700 && img.height >= 360)
    .filter((img) => img.ratio >= 0.6 && img.ratio <= 3.2)
    .filter((img) => Number.isFinite(img.score))
    .sort((a, b) => b.score - a.score || b.area - a.area || b.bytes - a.bytes);
}

async function optimizeForWeb(buffer, index) {
  return sharp(buffer)
    .rotate()
    .resize({
      width: index === 0 ? 1800 : 1400,
      height: index === 0 ? 1100 : 900,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: index === 0 ? 82 : 78,
      mozjpeg: true,
    })
    .toBuffer();
}

async function imageFingerprint(buffer) {
  const { data } = await sharp(buffer)
    .rotate()
    .resize(16, 16, { fit: "cover" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const values = [...data];
  const avg = values.reduce((sum, n) => sum + n, 0) / values.length;
  return values.map((n) => (n >= avg ? "1" : "0")).join("");
}

async function pickUniqueHero(images, usedHeroFingerprints) {
  for (let index = 0; index < images.length; index++) {
    const fp = await imageFingerprint(images[index].buffer);
    if (!usedHeroFingerprints.has(fp)) {
      usedHeroFingerprints.add(fp);
      return [images[index], ...images.slice(0, index), ...images.slice(index + 1)];
    }
  }
  const fp = await imageFingerprint(images[0].buffer);
  usedHeroFingerprints.add(fp);
  return images;
}

async function writeProductImages(product, images, usedHeroFingerprints) {
  const dir = join(publicTripsDir, product.slug);
  mkdirSync(dir, { recursive: true });

  const written = [];
  for (const existing of readdirSync(dir)) {
    if (/^(hero|gallery-\d+)\.(jpe?g|png|webp)$/i.test(existing)) {
      unlinkSync(join(dir, existing));
    }
  }

  const orderedImages = await pickUniqueHero(images, usedHeroFingerprints);
  for (const [index, image] of orderedImages.slice(0, maxGalleryImages).entries()) {
    const file = index === 0 ? "hero.jpg" : `gallery-${String(index).padStart(2, "0")}.jpg`;
    const webBuffer = await optimizeForWeb(image.buffer, index);
    writeFileSync(join(dir, file), webBuffer);
    written.push({
      src: `/trips/${product.slug}/${file}`,
      alt: product.imageAlt ?? product.title,
      caption: index === 0 ? "产品主视觉" : "产品资料图片",
    });
  }

  const detailPath = join(detailsDir, `${product.slug}.json`);
  const detail = existsSync(detailPath) ? JSON.parse(readFileSync(detailPath, "utf8")) : {};
  detail.heroImage = written[0].src;
  detail.gallery = written.slice(1);
  writeFileSync(detailPath, `${JSON.stringify(detail, null, 2)}\n`);

  return written;
}

let imported = 0;
const missing = [];
const failed = [];
const pptUseCount = new Map();
const usedHeroFingerprints = new Set();

for (const product of targetProducts) {
  const ppt = findPptForProduct(product);
  if (!ppt) {
    missing.push(product.slug);
    continue;
  }

  try {
    const images = await rankMedia(ppt);
    if (!images.length) {
      failed.push(`${product.slug}: no usable images in ${relative(sourceRoot, ppt)}`);
      continue;
    }
    const useCount = pptUseCount.get(ppt) ?? 0;
    pptUseCount.set(ppt, useCount + 1);
    const offset = images.length > maxGalleryImages ? useCount % (images.length - maxGalleryImages + 1) : 0;
    const selectedImages = images.slice(offset).concat(images.slice(0, offset));
    const written = await writeProductImages(product, selectedImages, usedHeroFingerprints);
    imported++;
    console.log(
      `[OK] ${product.slug} <- ${relative(sourceRoot, ppt)} (${written.length} images)`,
    );
  } catch (error) {
    failed.push(`${product.slug}: ${error.message}`);
  }
}

console.log(`Imported images for ${imported}/${targetProducts.length} products`);
if (missing.length) {
  console.error(`Missing PPT match:\n${missing.map((x) => `- ${x}`).join("\n")}`);
}
if (failed.length) {
  console.error(`Failed:\n${failed.map((x) => `- ${x}`).join("\n")}`);
}
if (missing.length || failed.length) {
  process.exitCode = 1;
}
