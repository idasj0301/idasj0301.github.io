/**
 * Full-site content audit: local links, images, product/detail completeness,
 * and common copy/data extraction mistakes.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const publicDir = join(root, "public");
const productsPath = join(root, "data/products.json");
const detailsDir = join(root, "data/details");

const products = JSON.parse(readFileSync(productsPath, "utf8"));
const published = products.filter((p) => p.published);
const issues = [];

const textPatterns = [
  ["placeholder", /待替换|TODO|TBD|Lorem|lorem|xxxx|你的链接|your-webhook/i],
  ["runtime-token", /\bundefined\b|\bnull\b|NaN|\[object Object\]/],
  ["bad-date-token", /\b20\d{2}-(?:00|1[3-9]|[2-9]\d)-\d{2}\b|\b20\d{2}-\d{2}-(?:00|3[2-9]|[4-9]\d)\b/],
  ["ppt-noise", /出发\s*\/\s*到达|行程由船长|邮轮设施\s*Cruise facilities|Cruise facilities\s*Cruise facilities/i],
  ["html-escaped", /&amp;[a-z]+;|&lt;|&gt;/i],
];

const routeImageNames = ["route-map.png", "route-map.jpeg", "route-map.jpg", "route-map.webp"];
const tripImageNames = ["hero.jpg", "gallery-01.jpg", "gallery-02.jpg", "gallery-03.jpg"];

function add(severity, type, file, message, extra = {}) {
  issues.push({ severity, type, file, message, ...extra });
}

function walk(dir, filter = () => true, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path, filter, out);
    else if (filter(path)) out.push(path);
  }
  return out;
}

function rel(path) {
  return relative(root, path).split(sep).join("/");
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function localDistPath(url) {
  if (!url || url.startsWith("#")) return null;
  if (/^(https?:|mailto:|tel:|sms:|weixin:|javascript:|data:)/i.test(url)) return null;
  const clean = decodeURIComponent(url.split("#")[0].split("?")[0]);
  if (!clean.startsWith("/")) return null;
  const normalized = normalize(clean).replace(/^(\.\.(\/|\\|$))+/, "");
  return join(distDir, normalized);
}

function routeExists(url) {
  const p = localDistPath(url);
  if (!p) return true;
  if (existsSync(p)) return true;
  if (existsSync(join(p, "index.html"))) return true;
  if (existsSync(`${p}.html`)) return true;
  return false;
}

function assetExists(url) {
  const p = localDistPath(url);
  return !p || existsSync(p);
}

async function imageInfo(path) {
  try {
    const meta = await sharp(path).metadata();
    return { width: meta.width ?? 0, height: meta.height ?? 0, format: meta.format };
  } catch (err) {
    return { error: err.message };
  }
}

function collectAttrs(html, attr) {
  const found = [];
  const re = new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "gi");
  for (const m of html.matchAll(re)) found.push(m[1]);
  return found;
}

function validIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function textScan(file, text) {
  for (const [type, pattern] of textPatterns) {
    const m = text.match(pattern);
    if (m) {
      const start = Math.max(0, m.index - 45);
      const excerpt = text.slice(start, m.index + m[0].length + 70);
      add(type === "placeholder" || type === "runtime-token" ? "error" : "warn", type, file, excerpt);
    }
  }
}

function scanValue(file, value, path = "") {
  if (typeof value === "string") {
    const clean = value.replace(/\s+/g, " ").trim();
    if (!clean) add("warn", "empty-copy", file, `Empty string at ${path}`);
    const isMachinePath =
      /(^|\.)(slug|sourceFile|heroImage)$/.test(path) ||
      /(^|\.)src$/.test(path) ||
      /(^|\.)routeMap\.src$/.test(path);
    if (isMachinePath) {
      for (const [type, pattern] of textPatterns.filter(([type]) => type !== "bad-date-token")) {
        const m = clean.match(pattern);
        if (m) {
          const start = Math.max(0, m.index - 45);
          const excerpt = clean.slice(start, m.index + m[0].length + 70);
          add(type === "placeholder" || type === "runtime-token" ? "error" : "warn", type, `${file}${path ? `#${path}` : ""}`, excerpt);
        }
      }
    } else {
      textScan(`${file}${path ? `#${path}` : ""}`, clean);
    }
    if (clean.length > 260 && !/[。！？；.!?;]/.test(clean.slice(0, 220))) {
      add("warn", "long-unpunctuated-copy", file, `${path}: ${clean.slice(0, 220)}...`);
    }
    return;
  }
  if (Array.isArray(value)) value.forEach((item, i) => scanValue(file, item, `${path}[${i}]`));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) scanValue(file, v, path ? `${path}.${k}` : k);
  }
}

async function auditHtml() {
  const htmlFiles = walk(distDir, (p) => p.endsWith(".html"));
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    const fileRel = rel(file);
    for (const src of collectAttrs(html, "src")) {
      if (!assetExists(src)) add("error", "missing-asset", fileRel, `Missing src: ${src}`);
    }
    for (const href of collectAttrs(html, "href")) {
      if (!routeExists(href)) add("error", "missing-link", fileRel, `Missing href: ${href}`);
    }
    textScan(fileRel, stripHtml(html));
  }
}

async function auditImages() {
  const imageFiles = walk(publicDir, (p) => /\.(png|jpe?g|webp|svg)$/i.test(p));
  for (const file of imageFiles) {
    const fileRel = rel(file);
    if (extname(file).toLowerCase() === ".svg") continue;
    const info = await imageInfo(file);
    if (info.error) {
      add("error", "bad-image", fileRel, info.error);
      continue;
    }
    if (info.width < 80 || info.height < 80) add("warn", "tiny-image", fileRel, `${info.width}x${info.height}`);
    if (fileRel.includes("/hero.") && info.width < 900) add("warn", "small-hero", fileRel, `${info.width}x${info.height}`);
    if (fileRel.includes("/route-map.") && info.width && info.height && info.height > info.width * 1.15) {
      add("warn", "route-map-portrait", fileRel, `${info.width}x${info.height}`);
    }
  }
}

async function auditProducts() {
  const ids = new Set();
  const slugs = new Set();
  for (const p of products) {
    const file = `data/products.json#${p.slug ?? p.id ?? "unknown"}`;
    if (ids.has(p.id)) add("error", "duplicate-id", file, p.id);
    ids.add(p.id);
    if (slugs.has(p.slug)) add("error", "duplicate-slug", file, p.slug);
    slugs.add(p.slug);
    scanValue(file, p);
    if (!validIsoDate(p.departureDate)) add("error", "invalid-date", file, `departureDate=${p.departureDate}`);
    if (p.published) {
      for (const key of ["slug", "title", "category", "departureDate", "durationDays", "shipName", "summary"]) {
        if (p[key] === undefined || p[key] === null || p[key] === "") add("error", "missing-product-field", file, key);
      }
      if (!Array.isArray(p.highlights) || p.highlights.length < 2) add("warn", "thin-highlights", file, "Published product has fewer than 2 highlights");
      const tripDir = join(publicDir, "trips", p.slug);
      if (!existsSync(tripDir)) add("error", "missing-trip-assets-dir", file, `public/trips/${p.slug}`);
      else {
        if (!existsSync(join(tripDir, "hero.jpg"))) add("error", "missing-hero", file, `public/trips/${p.slug}/hero.jpg`);
        if (!routeImageNames.some((n) => existsSync(join(tripDir, n)))) add("error", "missing-route-map", file, `public/trips/${p.slug}/route-map.*`);
        for (const n of tripImageNames.slice(1)) {
          if (!existsSync(join(tripDir, n))) add("warn", "missing-gallery-image", file, `public/trips/${p.slug}/${n}`);
        }
      }
      const detailPath = join(detailsDir, `${p.slug}.json`);
      if (!existsSync(detailPath)) {
        add("error", "missing-detail", file, `data/details/${p.slug}.json`);
      } else {
        const detail = JSON.parse(readFileSync(detailPath, "utf8"));
        scanValue(`data/details/${p.slug}.json`, detail);
        const detailAssetRefs = [];
        if (detail.heroImage) detailAssetRefs.push(detail.heroImage);
        if (detail.routeMap?.src) detailAssetRefs.push(detail.routeMap.src);
        for (const img of detail.gallery ?? []) if (img.src) detailAssetRefs.push(img.src);
        for (const src of detailAssetRefs) {
          const path = src.startsWith("/") ? join(publicDir, src.slice(1)) : join(publicDir, src);
          if (!existsSync(path)) add("error", "missing-detail-asset", `data/details/${p.slug}.json`, src);
        }
        if (!detail.heroImage) add("warn", "missing-detail-hero", `data/details/${p.slug}.json`, "No heroImage field");
        if (!detail.gallery || detail.gallery.length < 3) add("warn", "thin-gallery", `data/details/${p.slug}.json`, "Fewer than 3 gallery images");
        if (!detail.itinerary || detail.itinerary.length < Math.min(5, p.durationDays)) add("warn", "thin-itinerary", `data/details/${p.slug}.json`, `itinerary=${detail.itinerary?.length ?? 0}, duration=${p.durationDays}`);
        if (!detail.highlightSections || detail.highlightSections.length < 2) add("warn", "thin-detail-highlights", `data/details/${p.slug}.json`, "Fewer than 2 highlight sections");
      }
    }
  }
}

await auditHtml();
await auditImages();
await auditProducts();

const order = { error: 0, warn: 1, info: 2 };
issues.sort((a, b) => order[a.severity] - order[b.severity] || a.type.localeCompare(b.type) || a.file.localeCompare(b.file));

const byType = {};
const bySeverity = {};
for (const issue of issues) {
  byType[issue.type] = (byType[issue.type] ?? 0) + 1;
  bySeverity[issue.severity] = (bySeverity[issue.severity] ?? 0) + 1;
}

console.log("=== 全站内容审计 ===");
console.log(`HTML pages: ${walk(distDir, (p) => p.endsWith(".html")).length}`);
console.log(`Published products: ${published.length}/${products.length}`);
console.log(`Issues: ${issues.length}`, bySeverity, byType);

for (const issue of issues.slice(0, 120)) {
  console.log(`\n[${issue.severity.toUpperCase()}] ${issue.type} ${issue.file}`);
  console.log(`  ${issue.message}`);
}
if (issues.length > 120) console.log(`\n... ${issues.length - 120} more issue(s) omitted`);

process.exit((bySeverity.error ?? 0) > 0 ? 1 : 0);
