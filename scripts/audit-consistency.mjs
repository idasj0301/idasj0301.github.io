/**
 * Cross-file consistency audit for products and details.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const products = JSON.parse(readFileSync(join(root, "data/products.json"), "utf8"));
const detailsDir = join(root, "data/details");
const issues = [];

const categoryLabels = {
  antarctic: "南极",
  arctic: "北极",
  galapagos: "加拉帕戈斯",
  "light-expedition": "轻探险",
  ticket: "船票",
};

function add(severity, type, file, message) {
  issues.push({ severity, type, file, message });
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function parseIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function iso(date) {
  return date.toISOString().slice(0, 10);
}

function cnDate(date) {
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

function extractMeta(detail, label) {
  const rows = Array.isArray(detail.metaTable) ? detail.metaTable : [];
  const found = rows.find((row) => Array.isArray(row) && clean(row[0]).includes(label));
  return found ? clean(found[1]) : "";
}

function parseMetaRange(text, fallbackYear) {
  const normalized = clean(text).replace(/—|–|至|到/g, "-");
  const dates = [];
  const fullDate = /(\d{4})[.\-年/](\d{1,2})[.\-月/](\d{1,2})/g;
  for (const m of normalized.matchAll(fullDate)) {
    dates.push(`${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`);
  }
  if (dates.length >= 2) return [dates[0], dates[1]];

  const shortDate = /(^|[^0-9])(\d{1,2})[.\-月/](\d{1,2})(?:日)?/g;
  for (const m of normalized.matchAll(shortDate)) {
    dates.push(`${fallbackYear}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`);
  }
  return dates.length >= 2 ? [dates[0], dates[1]] : [];
}

function expectedPriceLabel(priceFrom) {
  return `¥${Number(priceFrom).toLocaleString("en-US")} 起`;
}

function normalizedPriceLabel(product) {
  const number = Number(product.priceFrom).toLocaleString("en-US");
  if (product.priceLabel.includes("€")) return `€${number} 起`;
  if (product.priceLabel.includes("$")) return `$${number} 起`;
  return expectedPriceLabel(product.priceFrom);
}

function assertAssetUnderSlug(product, key, value) {
  if (!value) return;
  if (!String(value).startsWith(`/trips/${product.slug}/`)) {
    add("warn", "asset-outside-trip-dir", `data/details/${product.slug}.json#${key}`, value);
  }
}

for (const product of products.filter((p) => p.published)) {
  const productFile = `data/products.json#${product.slug}`;
  const start = parseIsoDate(product.departureDate);
  if (!start) {
    add("error", "invalid-product-date", productFile, `departureDate=${product.departureDate}`);
    continue;
  }
  const end = addDays(start, Number(product.durationDays) - 1);
  const expectedEnd = iso(end);
  const expectedStart = iso(start);

  const expectedLabel = normalizedPriceLabel(product);
  if (product.priceLabel !== expectedLabel) {
    add("warn", "price-label-mismatch", productFile, `${product.priceLabel} != ${expectedLabel}`);
  }

  const detailPath = join(detailsDir, `${product.slug}.json`);
  if (!existsSync(detailPath)) continue;
  const detail = JSON.parse(readFileSync(detailPath, "utf8"));
  const detailFile = `data/details/${product.slug}.json`;

  const dateMeta = extractMeta(detail, "出行日期");
  const [metaStart, metaEnd] = parseMetaRange(dateMeta, String(start.getUTCFullYear()));
  if (dateMeta && metaStart && metaStart !== expectedStart) {
    add("warn", "detail-start-date-mismatch", detailFile, `meta=${metaStart}, product=${expectedStart}, text=${dateMeta}`);
  }
  if (dateMeta && metaEnd && metaEnd !== expectedEnd) {
    add("warn", "detail-end-date-mismatch", detailFile, `meta=${metaEnd}, expected=${expectedEnd}, text=${dateMeta}`);
  }

  const durationMeta = extractMeta(detail, "出行时长");
  if (durationMeta && !new RegExp(`${product.durationDays}\\s*天`).test(durationMeta)) {
    add("warn", "detail-duration-mismatch", detailFile, `meta=${durationMeta}, product=${product.durationDays}天`);
  }

  const destinationMeta = extractMeta(detail, "目的地");
  const expectedCategory = categoryLabels[product.category];
  if (expectedCategory && destinationMeta && !destinationMeta.includes(expectedCategory)) {
    const softTicket = product.category === "ticket" && /北极|格陵兰|船票/.test(destinationMeta);
    if (!softTicket) add("info", "detail-destination-differs", detailFile, `meta=${destinationMeta}, category=${expectedCategory}`);
  }

  assertAssetUnderSlug(product, "heroImage", detail.heroImage);
  assertAssetUnderSlug(product, "routeMap.src", detail.routeMap?.src);
  for (const [index, image] of (detail.gallery ?? []).entries()) {
    assertAssetUnderSlug(product, `gallery[${index}].src`, image.src);
  }

  const summary = clean(product.summary);
  if (!summary.includes(cnDate(start))) {
    add("warn", "summary-missing-start-date", productFile, `expected ${cnDate(start)}`);
  }
  if (!summary.includes(cnDate(end))) {
    add("warn", "summary-missing-end-date", productFile, `expected ${cnDate(end)}`);
  }
  if (!summary.includes(`${product.durationDays}天`)) {
    add("warn", "summary-missing-duration", productFile, `expected ${product.durationDays}天`);
  }
}

const severityOrder = { error: 0, warn: 1, info: 2 };
issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.type.localeCompare(b.type) || a.file.localeCompare(b.file));

const bySeverity = {};
const byType = {};
for (const issue of issues) {
  bySeverity[issue.severity] = (bySeverity[issue.severity] ?? 0) + 1;
  byType[issue.type] = (byType[issue.type] ?? 0) + 1;
}

console.log("=== 产品一致性审计 ===");
console.log(`Published products: ${products.filter((p) => p.published).length}/${products.length}`);
console.log(`Issues: ${issues.length}`, bySeverity, byType);

for (const issue of issues) {
  console.log(`\n[${issue.severity.toUpperCase()}] ${issue.type} ${issue.file}`);
  console.log(`  ${issue.message}`);
}

process.exit((bySeverity.error ?? 0) > 0 ? 1 : 0);
