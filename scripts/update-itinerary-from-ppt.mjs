import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const root = join(import.meta.dirname, "..");
const drive = "/Volumes/Ida的硬盘，丢了赔付/船客产品2026";
const productsPath = join(root, "data/products.json");
const detailsDir = join(root, "data/details");
const extractor = join(import.meta.dirname, "extract-pptx-detail.py");

const products = JSON.parse(readFileSync(productsPath, "utf8"));

function shouldSkipPath(path) {
  const name = basename(path);
  return name.startsWith("._") || /(^|[^a-z])ty([^a-z]|$)/i.test(path);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (shouldSkipPath(path)) continue;
    if (entry.isDirectory()) walk(path, out);
    else if (/\.pptx$/i.test(entry.name)) out.push(path);
  }
  return out;
}

function normalizeName(value) {
  return value
    .toLowerCase()
    .replace(/\.[^.]+$/i, "")
    .replace(/[\s._\-—–·・（）()【】\[\]+&/\\|:：,，。]/g, "");
}

const pptPaths = existsSync(drive) ? walk(drive) : [];
const pptByBase = new Map(pptPaths.map((p) => [basename(p), p]));
const pptByNormalized = new Map(pptPaths.map((p) => [normalizeName(basename(p)), p]));

function findPpt(product) {
  if (!product.sourceFile || product.sourceFile.startsWith("catalog/")) {
    if (product.category === "galapagos") {
      return pptByNormalized.get(normalizeName("2026.8.04-08.22 厄瓜多尔.pptx"));
    }
    return undefined;
  }
  const direct = join(drive, product.sourceFile);
  if (existsSync(direct) && !shouldSkipPath(direct)) return direct;
  return (
    pptByBase.get(basename(product.sourceFile)) ??
    pptByNormalized.get(normalizeName(basename(product.sourceFile)))
  );
}

function bodyLength(day) {
  return String(day?.content ?? "").trim().length;
}

function avgBodyLength(days) {
  if (!days?.length) return 0;
  return Math.round(days.reduce((sum, day) => sum + bodyLength(day), 0) / days.length);
}

function cleanText(value, max = 1400) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, "$1")
    .trim()
    .slice(0, max);
}

function mergeItinerary(current, extracted) {
  const currentByDay = new Map((current ?? []).map((day) => [String(day.day), day]));
  return extracted.map((day, index) => {
    const old = currentByDay.get(String(day.day)) ?? current?.[index] ?? {};
    const oldContent = cleanText(old.content);
    const newContent = cleanText(day.content);
    const content = newContent.length > oldContent.length ? newContent : oldContent;
    return {
      day: old.day ?? day.day,
      date: old.date || day.date || "",
      title: old.title || cleanText(day.title, 80),
      ...(day.meta ? { meta: cleanText(day.meta, 220) } : old.meta ? { meta: old.meta } : {}),
      content,
    };
  });
}

let updated = 0;
let skipped = 0;
let unchanged = 0;

for (const product of products.filter((p) => p.published && p.departureDate >= "2026-06-01")) {
  const ppt = findPpt(product);
  const detailPath = join(detailsDir, `${product.slug}.json`);
  if (!ppt || !existsSync(detailPath)) {
    skipped++;
    continue;
  }

  const tempProductPath = join("/private/tmp", `chuanke-itinerary-${product.slug}.json`);
  writeFileSync(tempProductPath, JSON.stringify(product), "utf8");
  const extracted = JSON.parse(
    execFileSync("python3", [extractor, ppt, "--product-json", tempProductPath], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    }),
  );

  if (!extracted.itinerary?.length) {
    skipped++;
    continue;
  }

  const detail = JSON.parse(readFileSync(detailPath, "utf8"));
  const current = detail.itinerary ?? [];
  const merged = mergeItinerary(current, extracted.itinerary);
  const currentAvg = avgBodyLength(current);
  const nextAvg = avgBodyLength(merged);
  const currentShort = current.filter((day) => bodyLength(day) < 35).length;
  const nextShort = merged.filter((day) => bodyLength(day) < 35).length;

  if (
    merged.length >= Math.min(current.length, 3) &&
    (nextAvg >= currentAvg + 20 || nextShort < currentShort)
  ) {
    detail.itinerary = merged;
    writeFileSync(detailPath, `${JSON.stringify(detail, null, 2)}\n`);
    updated++;
    console.log(
      `${product.slug}: itinerary ${current.length}/${currentAvg}/${currentShort} -> ${merged.length}/${nextAvg}/${nextShort}`,
    );
  } else {
    unchanged++;
  }
}

console.log(`Updated itineraries for ${updated} products, unchanged ${unchanged}, skipped ${skipped}`);
