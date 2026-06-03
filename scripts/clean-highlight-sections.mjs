import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const products = JSON.parse(readFileSync(join(root, "data/products.json"), "utf8"));

const reject =
  /船客旅行创立于|关注我们了解更多|Follow us|公众号|小红书|视频号|邮轮介绍|舱房介绍|甲板平面图|价格说明|费用包含|费用不含|船客甄选航程|中文服务与行前说明|具体登陆点与活动/i;

function fallbackHighlights(product) {
  const highlights = product.highlights?.length
    ? product.highlights
    : [product.overview ?? product.summary].filter(Boolean);
  return highlights.slice(0, 5).map((text, index) => ({
    title: index === 0 ? "行程亮点" : String(text).slice(0, 24),
    content: String(text),
  }));
}

let updated = 0;

for (const product of products.filter((p) => p.published && p.departureDate >= "2026-06-01")) {
  const detailPath = join(root, "data/details", `${product.slug}.json`);
  if (!existsSync(detailPath)) continue;
  const detail = JSON.parse(readFileSync(detailPath, "utf8"));
  const cleaned = (detail.highlightSections ?? [])
    .map((section) => ({
      ...section,
      title: section.title === "航程亮点" ? "行程亮点" : section.title,
    }))
    .filter((section) => {
      const blob = `${section.title ?? ""} ${section.content ?? ""} ${(section.bullets ?? []).join(" ")}`;
      return blob.length >= 12 && !reject.test(blob);
    })
    .slice(0, 8);

  const next = cleaned.length ? cleaned : fallbackHighlights(product);
  if (JSON.stringify(next) !== JSON.stringify(detail.highlightSections)) {
    detail.highlightSections = next;
    writeFileSync(detailPath, `${JSON.stringify(detail, null, 2)}\n`);
    updated++;
  }
}

console.log(`Cleaned highlight sections for ${updated} products`);
