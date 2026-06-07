/**
 * Product-detail audit for copy polish and visual asset readiness.
 * This complements audit-site/audit-content by flagging extraction residue
 * that is technically valid JSON but visually unprofessional.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const detailsDir = join(root, "data/details");
const products = JSON.parse(readFileSync(join(root, "data/products.json"), "utf8"));
const published = products.filter((p) => p.published);
const issues = [];

const allowedInterest = new Set(["南极", "北极", "加拉帕戈斯", "南部非洲", "东非", "南美"]);
const expectedByCategory = {
  antarctic: "南极",
  arctic: "北极",
  galapagos: "加拉帕戈斯",
};

function rel(path) {
  return relative(root, path).split(sep).join("/");
}

function add(severity, type, file, message) {
  issues.push({ severity, type, file, message });
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function containsCompatibilityChars(text) {
  return /[\u2e80-\u2eff\u2f00-\u2fdf]/.test(text);
}

function hasExtractionResidue(text) {
  return /Itinerary HIGHLIGHTS|HIGHLIGHTS OF|Cruise facilities|出发\s*\/\s*到达|行程由船长|参考航班（需出票时二次确认）/.test(text);
}

function hasTruncatedTitle(text) {
  const t = cleanText(text);
  return (
    t.length > 64 ||
    /[，、。；：:—-]$/.test(t) ||
    /[A-Za-z0-9]$/.test(t) && /参考航班|T\d|CA\d|EK\d|FI\d/.test(t)
  );
}

async function imageMeta(path) {
  try {
    const meta = await sharp(path).metadata();
    return { width: meta.width ?? 0, height: meta.height ?? 0 };
  } catch {
    return null;
  }
}

function publicPathFromUrl(url) {
  if (!url || !url.startsWith("/")) return null;
  return join(publicDir, url.slice(1));
}

function categoryInterest(product) {
  if (expectedByCategory[product.category]) return expectedByCategory[product.category];
  const text = `${product.title} ${product.summary} ${product.tags?.join(" ") ?? ""}`;
  if (/南极|南乔治亚|银海.*(乔治王岛|威廉斯港|福克兰)/.test(text)) return "南极";
  if (/北极|斯瓦尔巴|格陵兰|冰岛|北极点/.test(text)) return "北极";
  if (/南部非洲/.test(text)) return "南部非洲";
  if (/东非|香草四岛|肯尼亚|坦桑尼亚|塞舌尔|马达加斯加/.test(text)) return "东非";
  if (/南美|安第斯|智利|秘鲁|玻利维亚|哥伦比亚|伊瓜苏/.test(text)) return "南美";
  return null;
}

function auditProductFields(product) {
  const file = `data/products.json#${product.slug}`;
  const interest = categoryInterest(product);
  if (!interest || !allowedInterest.has(interest)) {
    add("info", "lead-interest-unmapped", file, `No exact lead-form interest option for: ${product.title}`);
  }

  const priceText = cleanText(product.priceLabel);
  const allowsConsultPrice = /价格咨询|实时确认|待询|详询/.test(priceText);
  if (!allowsConsultPrice && !priceText.includes(String(product.priceFrom).replace(/\B(?=(\d{3})+(?!\d))/g, ","))) {
    add("warn", "price-label-mismatch", file, `priceFrom=${product.priceFrom}, priceLabel=${product.priceLabel}`);
  }
  if (product.priceFrom <= 0 && !allowsConsultPrice) add("error", "invalid-price", file, `priceFrom=${product.priceFrom}`);
  if (product.durationDays <= 0 || product.durationDays > 60) {
    add("warn", "duration-suspicious", file, `durationDays=${product.durationDays}`);
  }
  if (cleanText(product.summary).length < 45) add("warn", "thin-summary", file, product.summary);
  if (cleanText(product.summary).length > 230) add("warn", "long-summary", file, product.summary.slice(0, 230));
}

async function auditAssets(product, detail) {
  const file = `data/details/${product.slug}.json`;
  const hero = publicPathFromUrl(detail.heroImage);
  if (!hero || !existsSync(hero)) return;

  const heroMeta = await imageMeta(hero);
  if (heroMeta) {
    if (heroMeta.width < 900) add("warn", "hero-small", rel(hero), `${heroMeta.width}x${heroMeta.height}`);
    if (heroMeta.height > heroMeta.width * 1.25) add("warn", "hero-portrait", rel(hero), `${heroMeta.width}x${heroMeta.height}`);
  }

  const route = publicPathFromUrl(detail.routeMap?.src);
  if (route && existsSync(route)) {
    const routeMeta = await imageMeta(route);
    if (routeMeta && routeMeta.height > routeMeta.width * 1.15) {
      add("warn", "route-map-portrait", rel(route), `${routeMeta.width}x${routeMeta.height}`);
    }
  }

  const gallery = Array.isArray(detail.gallery) ? detail.gallery : [];
  if (gallery.length < 3) add("warn", "gallery-thin", file, `gallery images=${gallery.length}`);
  for (const [index, image] of gallery.entries()) {
    const imagePath = publicPathFromUrl(image.src);
    if (!imagePath || !existsSync(imagePath)) {
      add("error", "gallery-missing-file", file, `gallery[${index}].src=${image.src}`);
      continue;
    }
    const meta = await imageMeta(imagePath);
    if (meta && (meta.width < 640 || meta.height < 360)) {
      add("warn", "gallery-small", rel(imagePath), `${meta.width}x${meta.height}`);
    }
    if (!cleanText(image.alt)) add("warn", "gallery-missing-alt", file, `gallery[${index}]`);
  }
}

function auditDetailCopy(product, detail) {
  const file = `data/details/${product.slug}.json`;
  const allSections = [
    ...(detail.highlightSections ?? []).map((s, i) => [`highlightSections[${i}]`, s.title, s.content]),
    ...(detail.itinerary ?? []).map((s, i) => [`itinerary[${i}]`, s.title, s.content]),
    ...(detail.noticeSections ?? []).map((s, i) => [`noticeSections[${i}]`, s.title, s.content]),
  ];

  for (const [path, title, content] of allSections) {
    const titleText = cleanText(title);
    const contentText = cleanText(content);
    const combined = `${titleText} ${contentText}`;

    if (containsCompatibilityChars(combined)) {
      add("warn", "compatibility-cjk", `${file}#${path}`, combined.slice(0, 120));
    }
    if (hasExtractionResidue(combined)) {
      add("warn", "extraction-residue", `${file}#${path}`, combined.slice(0, 180));
    }
    if (path.startsWith("itinerary") && hasTruncatedTitle(titleText)) {
      add("warn", "itinerary-title-suspicious", `${file}#${path}.title`, titleText);
    }
  }

  const itinerary = Array.isArray(detail.itinerary) ? detail.itinerary : [];
  const dayNumbers = itinerary.map((item) => Number.parseInt(String(item.day), 10)).filter(Number.isFinite);
  if (itinerary.length < Math.min(product.durationDays, 8)) {
    add("warn", "itinerary-too-thin", file, `itinerary=${itinerary.length}, durationDays=${product.durationDays}`);
  }
  if (dayNumbers.length && Math.max(...dayNumbers) < Math.min(product.durationDays, 8)) {
    add("warn", "itinerary-day-range-thin", file, `maxDay=${Math.max(...dayNumbers)}, durationDays=${product.durationDays}`);
  }

  const cabins = Array.isArray(detail.cabins) ? detail.cabins : [];
  const needsCabins = !/陆地轻探险/.test(cleanText(product.shipName));
  if (!cabins.length && needsCabins) add("warn", "cabins-missing", file, "No cabin table");
  for (const [index, cabin] of cabins.entries()) {
    if (!cleanText(cabin.name)) add("warn", "cabin-name-empty", file, `cabins[${index}]`);
    if (!cleanText(cabin.spec)) add("warn", "cabin-spec-empty", file, `cabins[${index}] ${cabin.name ?? ""}`);
    const price = cleanText(cabin.price);
    if (!price) add("warn", "cabin-price-empty", file, `cabins[${index}] ${cabin.name ?? ""}`);
    if (price && !/[¥￥$€£]|欧元|售罄|候补|待询|详询|价格咨询|实时确认|起/.test(price)) {
      add("warn", "cabin-price-suspicious", file, `cabins[${index}] price=${price}`);
    }
  }
}

for (const product of published) {
  auditProductFields(product);
  const detailPath = join(detailsDir, `${product.slug}.json`);
  if (!existsSync(detailPath)) continue;
  const detail = JSON.parse(readFileSync(detailPath, "utf8"));
  auditDetailCopy(product, detail);
  await auditAssets(product, detail);
}

const severityOrder = { error: 0, warn: 1, info: 2 };
issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.type.localeCompare(b.type) || a.file.localeCompare(b.file));

const bySeverity = {};
const byType = {};
for (const issue of issues) {
  bySeverity[issue.severity] = (bySeverity[issue.severity] ?? 0) + 1;
  byType[issue.type] = (byType[issue.type] ?? 0) + 1;
}

console.log("=== 产品深度审计 ===");
console.log(`Published products: ${published.length}/${products.length}`);
console.log(`Issues: ${issues.length}`, bySeverity, byType);

for (const issue of issues.slice(0, 160)) {
  console.log(`\n[${issue.severity.toUpperCase()}] ${issue.type} ${issue.file}`);
  console.log(`  ${issue.message}`);
}
if (issues.length > 160) console.log(`\n... ${issues.length - 160} more issue(s) omitted`);

process.exit((bySeverity.error ?? 0) > 0 ? 1 : 0);
