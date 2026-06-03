/**
 * 按 priceFrom 统一 products.json 的 priceLabel
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../data/products.json");

function formatPriceLabel(priceFrom, currentLabel = "") {
  if (priceFrom > 0) {
    if (currentLabel.includes("€")) return `€${priceFrom.toLocaleString("zh-CN")} 起`;
    if (currentLabel.includes("$")) return `$${priceFrom.toLocaleString("zh-CN")} 起`;
    return `¥${priceFrom.toLocaleString("zh-CN")} 起`;
  }
  return "价格咨询";
}

const products = JSON.parse(readFileSync(OUT, "utf8"));
let n = 0;
for (const p of products) {
  const next = formatPriceLabel(p.priceFrom || 0, p.priceLabel);
  if (p.priceLabel !== next) {
    p.priceLabel = next;
    n++;
  }
}
writeFileSync(OUT, JSON.stringify(products, null, 2) + "\n", "utf8");
console.log(`已统一 ${n} 条 priceLabel`);
