import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const drive = "/Volumes/Ida的硬盘，丢了赔付/船客产品2026";
const productsPath = join(root, "data/products.json");

const manualPrices = {
  "2026年6月13日大满贯全体验-环游北极三大秘境24天23晚": 113220,
  "2026船客x中国国家地理号-北极三岛考察": 99900,
  "2026年8月北极三岛16晚18天-short": 124900,
  "2026年8月北极三岛19晚21天-long": 154800,
  "sku-2027-07-09-20d": 99900,
  "2027-8-08-8-20-北极点-远征地球之巅-12晚13天": 33850,
  "sku-2026-09-07-25d": 168800,
  "2026年10月亚得里亚海9晚11天": 79900,
  "20270220-0320穿越南美七国29天25晚": 168800,
  "260602西格陵兰冰川峡湾之旅": 52354,
  "260613巡游西格陵兰冰川与文明": 52354,
  "26年9月28日至10月14日17天夏古号极地奥德赛北极三岛-冰岛-东北格陵兰国家公园-斯瓦尔巴群岛": 99900,
};

function formatPriceLabel(priceFrom, currentLabel = "") {
  if (currentLabel.includes("€")) return `€${priceFrom.toLocaleString("zh-CN")} 起`;
  if (currentLabel.includes("$")) return `$${priceFrom.toLocaleString("zh-CN")} 起`;
  return `¥${priceFrom.toLocaleString("zh-CN")} 起`;
}

function shouldSkipPath(path) {
  const name = basename(path);
  return name.startsWith("._") || /(^|[^a-z])ty([^a-z]|$)/i.test(path);
}

function normalizeName(value) {
  return value
    .toLowerCase()
    .replace(/\.[^.]+$/i, "")
    .replace(/[\s._\-—–·・（）()【】\[\]+&/\\|:：,，。]/g, "");
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

const pptPaths = existsSync(drive) ? walk(drive) : [];
const pptByBase = new Map(pptPaths.map((p) => [basename(p), p]));
const pptByNormalized = new Map(pptPaths.map((p) => [normalizeName(basename(p)), p]));

function findPpt(product) {
  if (!product.sourceFile || product.sourceFile.startsWith("catalog/")) return undefined;
  const direct = join(drive, product.sourceFile);
  if (existsSync(direct) && !shouldSkipPath(direct)) return direct;
  return pptByBase.get(basename(product.sourceFile)) ?? pptByNormalized.get(normalizeName(basename(product.sourceFile)));
}

function readPptText(ppt) {
  const names = execFileSync("unzip", ["-Z1", ppt], { encoding: "utf8" })
    .split("\n")
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  let text = "";
  for (const name of names) {
    const xml = execFileSync("unzip", ["-p", ppt, name], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
    text += `${xml.replace(/<[^>]+>/g, " ")}\n`;
  }
  return text.replace(/\s+/g, " ").replace(/(?<=\d)\s+(?=\d)/g, "");
}

function priceFromText(text) {
  const prices = [];
  const patterns = [
    /(?:RMB|¥|￥)\s*([0-9][0-9,]{4,})\s*(?:\/\s*人|元|起|\/人)?/gi,
    /([0-9][0-9,]{4,})\s*(?:RMB|元)\s*\/?\s*人/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = Number(match[1].replace(/,/g, ""));
      if (value >= 52000 && value <= 500000) prices.push(value);
    }
  }
  if (!prices.length) return undefined;
  return Math.min(...prices);
}

function priceFromDetail(slug) {
  const path = join(root, "data/details", `${slug}.json`);
  if (!existsSync(path)) return undefined;
  const text = readFileSync(path, "utf8");
  const values = [...text.matchAll(/¥\s*([0-9,]{5,})/g)].map((m) => Number(m[1].replace(/,/g, "")));
  const usable = values.filter((n) => n >= 52000 && n <= 500000);
  return usable.length ? Math.min(...usable) : undefined;
}

const products = JSON.parse(readFileSync(productsPath, "utf8"));
const unresolved = [];
let changed = 0;

for (const product of products) {
  if (!product.published || product.departureDate < "2026-06-01") continue;
  let price = manualPrices[product.slug] ?? (product.priceFrom > 0 ? product.priceFrom : undefined);
  price ??= priceFromDetail(product.slug);
  if (!price) {
    const ppt = findPpt(product);
    if (ppt) price = priceFromText(readPptText(ppt));
  }
  price ??= manualPrices[product.slug];
  if (!price) {
    unresolved.push(product.slug);
    continue;
  }
  const priceLabel = formatPriceLabel(price, product.priceLabel);
  if (product.priceFrom !== price || product.priceLabel !== priceLabel) {
    product.priceFrom = price;
    product.priceLabel = priceLabel;
    changed++;
  }
}

writeFileSync(productsPath, `${JSON.stringify(products, null, 2)}\n`);
console.log(`Updated prices for ${changed} products`);
if (unresolved.length) {
  console.error(`Still unresolved:\n${unresolved.map((s) => `- ${s}`).join("\n")}`);
  process.exitCode = 1;
}
