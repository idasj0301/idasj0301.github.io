/**
 * 全站数据与航线图质量审计
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { isLayoutComplete, detailScore } from "./detail-fallback.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const products = JSON.parse(readFileSync(join(root, "data/products.json"), "utf8"));
const detailsDir = join(root, "data/details");
const tripsPublic = join(root, "public/trips");
const PY = join(dirname(fileURLToPath(import.meta.url)), "extract-pptx-route-map.py");
const DRIVE = "/Volumes/Ida的硬盘，丢了赔付/船客产品2026";

const ROUTE_NAMES = ["route-map.png", "route-map.jpeg", "route-map.jpg", "route-map.webp", "route-map.wdp"];

function pngSize(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  return null;
}

function jpegSize(buf) {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const m = buf[i + 1];
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb].includes(m)) {
      return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

function imageInfo(path) {
  if (!existsSync(path)) return null;
  const buf = readFileSync(path);
  return pngSize(buf) || jpegSize(buf) || { w: 0, h: 0, raw: buf.length };
}

function findRouteFile(slug) {
  const dir = join(tripsPublic, slug);
  if (!existsSync(dir)) return null;
  for (const n of ROUTE_NAMES) {
    const p = join(dir, n);
    if (existsSync(p)) return p;
  }
  return null;
}

function hasDetail(slug) {
  return existsSync(join(detailsDir, `${slug}.json`));
}

function badDate(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return true;
  const [, mo, da] = d.split("-").map(Number);
  return mo < 1 || mo > 12 || da < 1 || da > 31;
}

function longTitle(t) {
  return t.length > 55 || /出发\s*\/\s*到达|航次安排|行程由船长/.test(t);
}

const issues = [];
const published = products.filter((p) => p.published);

for (const p of published) {
  if (!hasDetail(p.slug)) issues.push({ slug: p.slug, type: "missing-detail", msg: "无 details JSON" });
  else {
    const detail = JSON.parse(readFileSync(join(detailsDir, `${p.slug}.json`), "utf8"));
    if (!isLayoutComplete(detail)) {
      issues.push({
        slug: p.slug,
        type: "thin-detail",
        msg: `详情版式不足（亮点${detail.highlightSections?.length ?? 0} 日程${detail.itinerary?.length ?? 0} 分${detailScore(detail)}）`,
      });
    }
  }
  const detailPath = join(detailsDir, `${p.slug}.json`);
  const detail = hasDetail(p.slug) ? JSON.parse(readFileSync(detailPath, "utf8")) : null;
  if (detail?.routeMap?.src) {
    const route = join(root, "public", detail.routeMap.src.replace(/^\//, ""));
    if (!existsSync(route)) issues.push({ slug: p.slug, type: "missing-route-file", msg: `航线图文件不存在: ${detail.routeMap.src}` });
    else {
      const info = imageInfo(route);
      if (info && info.w && info.h) {
        if (info.h > info.w * 1.12)
          issues.push({
            slug: p.slug,
            type: "route-portrait",
            msg: `航线图疑似竖图 ${info.w}x${info.h}`,
          });
        if (info.w < 600 && info.h < 600)
          issues.push({
            slug: p.slug,
            type: "route-small",
            msg: `航线图过小 ${info.w}x${info.h}`,
          });
      } else if (route.endsWith(".wdp"))
        issues.push({ slug: p.slug, type: "route-wdp", msg: "航线图为 wdp 格式，浏览器可能无法显示" });
    }
  }
  if (badDate(p.departureDate))
    issues.push({ slug: p.slug, type: "bad-date", msg: `出发日异常: ${p.departureDate}` });
  if (longTitle(p.title))
    issues.push({ slug: p.slug, type: "long-title", msg: `标题过长或含行程正文` });
  if (!existsSync(join(root, "dist/trips", p.slug, "index.html")))
    issues.push({ slug: p.slug, type: "no-build", msg: "dist 无详情页（需 npm run build）" });
}

// 重复 slug / 同航期近似
const slugs = new Set();
for (const p of products) {
  if (slugs.has(p.slug)) issues.push({ slug: p.slug, type: "dup-slug", msg: "slug 重复" });
  slugs.add(p.slug);
}

// 重新提取抽样对比（硬盘挂载时）
let reextractMismatch = 0;
if (existsSync(DRIVE)) {
  const SLUG_TO_REL = new Map([
    ["2026-wangguin-antarctica-22d", "2026年11月22日船去飞回双岛/2026.11.22-12.13 飞船游南极·奇遇王企鹅22天.pptx"],
    ["2026-arctic-eclipse-three-islands", "2026年7月29日北极三岛日蚀航次/方案/短线/短线-2026.7.29-8.14日全食-巡游北极三岛.pptx"],
    ["2026-ecuador-four-worlds", "2026年8月厄瓜多尔/方案/2026.8.04-08.22 厄瓜多尔.pptx"],
    ["2026-kimberley-wilderness", "2026年8月金伯利/最后的荒野·奇绝金伯利-2026.8.27-9.7.pptx"],
  ]);

  for (const p of published.slice(0, 15)) {
    const rel = SLUG_TO_REL.get(p.slug) || p.sourceFile;
    if (!rel) continue;
    const ppt = join(DRIVE, rel);
    if (!existsSync(ppt)) continue;
    try {
      const out = execSync(`python3 ${JSON.stringify(PY)} ${JSON.stringify(ppt)} ${JSON.stringify(join(root, "tmp-audit"))}`, {
        encoding: "utf8",
      }).trim();
      const m = out.match(/\((\d+)x(\d+) from ([^)]+)\)/);
      if (!m) continue;
      const w = +m[1],
        h = +m[2];
      const route = findRouteFile(p.slug);
      const cur = route ? imageInfo(route) : null;
      if (cur && cur.w && cur.h && (cur.h > cur.w * 1.12 || (w > h * 1.2 && cur.w < cur.h)))
        reextractMismatch++;
    } catch {
      /* skip */
    }
  }
}

console.log("=== 审计摘要 ===");
console.log(`在售 ${published.length} / 总计 ${products.length}`);
console.log(`详情 JSON: ${published.filter((p) => hasDetail(p.slug)).length}/${published.length}`);
console.log(
  `航线图: ${
    published.filter((p) => {
      if (!hasDetail(p.slug)) return false;
      const detail = JSON.parse(readFileSync(join(detailsDir, `${p.slug}.json`), "utf8"));
      return Boolean(detail.routeMap?.src);
    }).length
  }/${published.length}`
);

const byType = {};
for (const i of issues) {
  byType[i.type] = (byType[i.type] || 0) + 1;
}
console.log("问题数:", issues.length, byType);

if (issues.length) {
  console.log("\n=== 问题清单 ===");
  for (const i of issues) {
    console.log(`[${i.type}] ${i.slug}\n    ${i.msg}`);
  }
}

process.exit(issues.length ? 1 : 0);
