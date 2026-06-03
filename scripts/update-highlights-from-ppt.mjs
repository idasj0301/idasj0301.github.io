import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const drive = "/Volumes/Ida的硬盘，丢了赔付/船客产品2026";
const productsPath = join(root, "data/products.json");
const detailsDir = join(root, "data/details");
const extractor = join(__dirname, "extract-pptx-detail.py");

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
  return pptByBase.get(basename(product.sourceFile)) ?? pptByNormalized.get(normalizeName(basename(product.sourceFile)));
}

function cleanHighlights(sections) {
  const reject = /邮轮介绍|舱房|甲板|费用包含|费用不含|价格说明|关注我们|船客旅行创立|小红书|公众号|预定政策|取消政策/i;
  const seen = new Set();
  return (sections ?? [])
    .map((s) => ({
      title: String(s.title ?? "行程亮点").replace(/^航程亮点$/, "行程亮点").trim(),
      content: s.content,
      bullets: s.bullets,
    }))
    .filter((s) => {
      const blob = `${s.title} ${s.content ?? ""} ${(s.bullets ?? []).join(" ")}`;
      if (reject.test(blob)) return false;
      if (blob.length < 20) return false;
      if (seen.has(blob.slice(0, 80))) return false;
      seen.add(blob.slice(0, 80));
      return true;
    })
    .slice(0, 8);
}

let updated = 0;
let skipped = 0;

for (const product of products.filter((p) => p.published && p.departureDate >= "2026-06-01")) {
  const ppt = findPpt(product);
  if (!ppt) {
    skipped++;
    continue;
  }
  const detailPath = join(detailsDir, `${product.slug}.json`);
  if (!existsSync(detailPath)) {
    skipped++;
    continue;
  }
  const tempProductPath = join("/private/tmp", `chuanke-product-${product.slug}.json`);
  writeFileSync(tempProductPath, JSON.stringify(product), "utf8");
  const extracted = JSON.parse(
    execFileSync("python3", [extractor, ppt, "--product-json", tempProductPath], {
      encoding: "utf8",
      maxBuffer: 12 * 1024 * 1024,
    }),
  );
  const highlights = cleanHighlights(extracted.highlightSections);
  if (!highlights.length) {
    skipped++;
    continue;
  }
  const detail = JSON.parse(readFileSync(detailPath, "utf8"));
  detail.highlightSections = highlights;
  writeFileSync(detailPath, `${JSON.stringify(detail, null, 2)}\n`);
  updated++;
}

console.log(`Updated PPT highlights for ${updated} products, skipped ${skipped}`);
