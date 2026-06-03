/**
 * 将非延长线 SKU 标为 published（无价也可展示为「价格咨询」）
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../data/products.json");
const products = JSON.parse(readFileSync(OUT, "utf8"));

function shouldPublish(p) {
  if (p.slug.startsWith("ext-")) {
    return p.category === "antarctic";
  }
  if ((p.sourceFile || "").includes("延长线")) return false;
  return true;
}

let n = 0;
for (const p of products) {
  const next = shouldPublish(p);
  if (p.published !== next) {
    p.published = next;
    n++;
  }
  if (p.slug.startsWith("ext-") && p.category === "antarctic") {
    p.subcategory = "延长线";
    if (!p.tags?.includes("延长线")) {
      p.tags = [...(p.tags || []), "延长线"];
    }
  }
}

writeFileSync(OUT, JSON.stringify(products, null, 2) + "\n", "utf8");
const pub = products.filter((p) => p.published);
console.log(`已更新 ${n} 条；在售 ${pub.length} 条`);
for (const cat of ["antarctic", "arctic", "galapagos", "light-expedition"]) {
  const list = pub.filter((p) => p.category === cat);
  const years = [...new Set(list.map((p) => p.departureDate.slice(0, 4)))].sort();
  console.log(`  ${cat}: ${list.length} 条, 年份 ${years.join(" / ") || "—"}`);
}
