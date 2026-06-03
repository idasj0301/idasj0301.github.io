/**
 * 清洗 products.json 中过长的 title（PPT 首屏全文）
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "data/products.json");

const TITLE_STOP =
  /(?:出发\s*\/\s*到达|航次安排|行程由船长|行程简介|Itinerary\s+Introduction|SAIL\s*&\s*FLY|FLY\s*&\s*SAIL|ANTARCTICA|Arctic\s+北极|Mediterranean|VISIT\s+TWO|VANILLA\s+FOUR|雷克雅未克|->)/i;

function cleanTitle(title, fileName, overview) {
  let t = title.replace(/\s+/g, " ").trim();
  const cut = t.search(TITLE_STOP);
  if (cut > 20) t = t.slice(0, cut).trim();
  t = t.replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, "$1");
  t = t.replace(/20(26|27|28)\s+20\1年?/g, "20$1");
  if (t.length > 56 && fileName) {
    const fn = fileName
      .replace(/\.pptx$/i, "")
      .replace(/^短线-|^长线-/i, "")
      .trim();
    if (fn.length >= 6 && fn.length <= 56) t = fn;
  }
  if (t.length > 56 && overview && overview.length <= 56) t = overview;
  if (t.length > 56) t = `${t.slice(0, 54).trim()}…`;
  return t;
}

const products = JSON.parse(readFileSync(OUT, "utf8"));
let n = 0;
for (const p of products) {
  const src = p.sourceFile?.split("/").pop();
  const next = cleanTitle(p.title, src, p.overview);
  if (next !== p.title) {
    p.title = next;
    n++;
  }
}
writeFileSync(OUT, JSON.stringify(products, null, 2) + "\n", "utf8");
console.log(`已清洗 ${n} 条标题，共 ${products.length} 条`);
