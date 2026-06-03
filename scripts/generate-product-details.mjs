/**
 * 为在售 SKU 生成 data/details/{slug}.json
 * 优先从 PPT 提取与 2026-wangguin-antarctica-22d 同结构全文；无 PPT 用同版式骨架
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import {
  buildFallbackDetail,
  detailScore,
  formatRange,
  isLayoutComplete,
} from "./detail-fallback.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS = join(root, "data/products.json");
const DETAILS_DIR = join(root, "data/details");
const TRIPS_PUBLIC = join(root, "public/trips");
const PY = join(dirname(fileURLToPath(import.meta.url)), "extract-pptx-detail.py");
const DRIVE = "/Volumes/Ida的硬盘，丢了赔付/船客产品2026";
const ROUTE_NAMES = ["route-map.png", "route-map.jpeg", "route-map.jpg", "route-map.webp"];

const RICH_SLUGS = new Set([
  "2026-wangguin-antarctica-22d",
  "2026-arctic-eclipse-three-islands",
  "2026-ecuador-four-worlds",
  "2026-kimberley-wilderness",
]);

function resolveRouteMap(slug) {
  const dir = join(TRIPS_PUBLIC, slug);
  if (!existsSync(dir)) return undefined;
  for (const name of ROUTE_NAMES) {
    if (existsSync(join(dir, name))) {
      return {
        src: `/trips/${slug}/${name}`,
        alt: "航程航线图",
        caption: "示意图仅供参考，每日停靠以实际船期与探险队长安排为准。",
      };
    }
  }
  return undefined;
}

function resolvePpt(product) {
  if (!product.sourceFile || product.sourceFile.startsWith("catalog/")) return null;
  const path = join(DRIVE, product.sourceFile);
  return existsSync(path) ? path : null;
}

function extractFromPpt(pptPath, product) {
  const tmp = join(tmpdir(), `prod-${product.slug}.json`);
  writeFileSync(tmp, JSON.stringify(product), "utf8");
  const out = execSync(
    `python3 "${PY}" "${pptPath}" --product-json "${tmp}"`,
    { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
  return JSON.parse(out);
}

function mergeRouteMap(detail, slug) {
  const routeMap = resolveRouteMap(slug);
  if (routeMap) detail.routeMap = routeMap;
  return detail;
}

function isRealCabin(cabin) {
  const blob = `${cabin?.name ?? ""} ${cabin?.spec ?? ""} ${cabin?.price ?? ""}`;
  return (
    cabin?.name &&
    cabin?.price &&
    /房|套房|Suite|Stateroom|Cabin/i.test(cabin.name) &&
    !/参考舱位|价格咨询|以方案|以合同|详询|签证|报名|取消|政策|费用|公证|认证|保险|机票|须知|说明/.test(blob)
  );
}

function normalizeCabin(cabin) {
  const soldOut =
    Boolean(cabin?.soldOut) || /售罄/.test(`${cabin?.name ?? ""} ${cabin?.spec ?? ""}`);
  return {
    ...cabin,
    name: String(cabin?.name || "").replace(/[（(]?\s*售罄\s*[）)]?/g, "").trim(),
    spec: String(cabin?.spec || "").replace(/[（(]?\s*售罄\s*[）)]?/g, "").trim(),
    price: String(cabin?.price || "").trim(),
    soldOut,
  };
}

function cabinKey(cabin) {
  return [cabin.name, cabin.spec, cabin.price]
    .map((x, index) => {
      const text = String(x || "").trim();
      return index === 1 ? text.replace(/\s+/g, "").replace(/可住\d+人/g, "") : text;
    })
    .join("|");
}

function mergeExtractedCabins(detail, extracted) {
  const extractedCabins = (extracted?.cabins || []).map(normalizeCabin).filter(isRealCabin);
  const allCurrentCabins = detail?.cabins || [];
  const currentCabins = allCurrentCabins.map(normalizeCabin).filter(isRealCabin);
  const hasDirtyCurrentCabins =
    currentCabins.length !== allCurrentCabins.length ||
    allCurrentCabins.some((c) => {
      const normalized = normalizeCabin(c);
      return (
        normalized.name !== c.name ||
        normalized.spec !== c.spec ||
        normalized.price !== c.price ||
        normalized.soldOut !== Boolean(c.soldOut)
      );
    });
  const currentUniqueCount = new Set(currentCabins.map(cabinKey)).size;
  if (
    !hasDirtyCurrentCabins &&
    extractedCabins.length <= currentUniqueCount &&
    currentUniqueCount === currentCabins.length
  ) {
    return detail;
  }

  const seen = new Set();
  const cabins = [];
  for (const cabin of extractedCabins) {
    const key = cabinKey(cabin);
    if (seen.has(key)) continue;
    seen.add(key);
    cabins.push(cabin);
  }
  detail.cabins = cabins;
  if (detail.shipDetail) {
    detail.shipDetail.cabins = cabins.map((c) => ({
      name: c.name,
      spec: c.spec,
      price: c.price,
    }));
  }
  return detail;
}

function patchMetaFromProduct(detail, product) {
  if (!detail.metaTable?.length) return detail;
  const range = formatRange(product);
  const sourceDuration = product.sourceFile?.match(/(\d+)\s*晚\s*(\d+)\s*天/);
  const durationTextFromProduct = sourceDuration
    ? `${sourceDuration[1]}晚${sourceDuration[2]}天`
    : `${product.durationDays} 天`;
  detail.metaTable = detail.metaTable.map(([k, v]) => {
    if (k === "出行日期" || k === "航期") return ["出行日期", range];
    if (k === "出行时长") {
      const clean = String(v || "")
        .replace(/(?<=\d)\s+(?=\d)/g, "")
        .replace(/(\d+)\s*晚\s*(\d+)\s*天/g, "$1晚$2天")
        .replace(/(\d+)\s*天/g, "$1天");
      if (clean.includes(`${product.durationDays}天`) || clean.includes(`${product.durationDays} 天`)) {
        return ["出行时长", clean];
      }
      return ["出行时长", durationTextFromProduct];
    }
    if (k === "邮轮 / 交通" && product.shipName) return ["邮轮 / 交通", product.shipName];
    return [k, v];
  });
  if (!detail.metaTable.some(([k]) => k === "出行日期")) {
    detail.metaTable.unshift(["出行日期", range]);
  }
  return detail;
}

function pickBest(existing, extracted, fallback) {
  const scores = [
    { d: existing, s: existing ? detailScore(existing) : -1 },
    { d: extracted, s: extracted ? detailScore(extracted) : -1 },
    { d: fallback, s: fallback ? detailScore(fallback) : -1 },
  ];
  scores.sort((a, b) => b.s - a.s);
  return scores[0].d || fallback;
}

function enrichIfThin(detail, product, routeMap) {
  const fallback = buildFallbackDetail(product, routeMap);
  if (!detail.metaTable || detail.metaTable.length < 5) {
    detail.metaTable = fallback.metaTable;
  }
  if ((detail.highlightSections?.length || 0) < 4) {
    detail.highlightSections = [
      ...(detail.highlightSections || []),
      ...fallback.highlightSections,
    ].slice(0, 10);
  }
  if ((detail.itinerary?.length || 0) < 5) {
    detail.itinerary =
      (detail.itinerary?.length || 0) >= (fallback.itinerary?.length || 0)
        ? detail.itinerary
        : fallback.itinerary;
  }
  if ((detail.feeIncluded?.length || 0) < 3) {
    detail.feeIncluded = [
      ...(detail.feeIncluded || []),
      ...fallback.feeIncluded,
    ];
  }
  if ((detail.feeExcluded?.length || 0) < 2) {
    detail.feeExcluded = [
      ...(detail.feeExcluded || []),
      ...fallback.feeExcluded,
    ];
  }
  if ((detail.noticeSections?.length || 0) < 3) {
    detail.noticeSections = [
      ...(detail.noticeSections || []),
      ...fallback.noticeSections,
    ].slice(0, 6);
  }
  if (!detail.shipDetail?.specs && fallback.shipDetail?.specs) {
    detail.shipDetail = { ...fallback.shipDetail, ...detail.shipDetail };
  }
  if (!detail.cabins?.length && fallback.cabins?.length) {
    detail.cabins = fallback.cabins;
  }
  if (!detail.titleEn) detail.titleEn = fallback.titleEn;
  if (!detail.itineraryNote) detail.itineraryNote = fallback.itineraryNote;
  return detail;
}

function main() {
  const force = process.argv.includes("--force");
  const products = JSON.parse(readFileSync(PRODUCTS, "utf8"));
  const published = products.filter((p) => p.published);
  let fromPpt = 0;
  let fallback = 0;
  let kept = 0;
  const incomplete = [];

  for (const p of published) {
    const path = join(DETAILS_DIR, `${p.slug}.json`);
    const routeMap = resolveRouteMap(p.slug);
    const fb = buildFallbackDetail(p, routeMap);

    let existing;
    if (existsSync(path)) {
      existing = JSON.parse(readFileSync(path, "utf8"));
      mergeRouteMap(existing, p.slug);
    }

    const ppt = resolvePpt(p);
    let extracted;
    if (ppt) {
      try {
        extracted = extractFromPpt(ppt, p);
        mergeRouteMap(extracted, p.slug);
        fromPpt++;
      } catch (e) {
        console.warn(`PPT 提取失败 ${p.slug}:`, e.message);
      }
    }

    let detail;
    if (
      !force &&
      RICH_SLUGS.has(p.slug) &&
      existing &&
      detailScore(existing) >= 50
    ) {
      detail = mergeRouteMap(existing, p.slug);
      kept++;
    } else {
      detail = pickBest(existing, extracted, fb);
      if (detail === extracted || detail === existing) {
        detail = enrichIfThin({ ...detail }, p, routeMap);
      }
      if (!extracted && detail === fb) fallback++;
    }

    if (extracted) {
      detail = mergeExtractedCabins(detail, extracted);
    }
    patchMetaFromProduct(detail, p);
    writeFileSync(path, JSON.stringify(detail, null, 2) + "\n", "utf8");

    if (!isLayoutComplete(detail)) {
      incomplete.push({
        slug: p.slug,
        highlights: detail.highlightSections?.length,
        days: detail.itinerary?.length,
        fees: detail.feeIncluded?.length,
      });
    }
  }

  const total = readdirSync(DETAILS_DIR).filter((f) => f.endsWith(".json")).length;
  console.log(
    `详情共 ${total} 个 · PPT提取 ${fromPpt} · 骨架 ${fallback} · 保留精品 ${kept}`,
  );
  if (incomplete.length) {
    console.log(`仍待补全 ${incomplete.length} 条（版式字段不足）:`);
    for (const x of incomplete.slice(0, 12)) {
      console.log(`  - ${x.slug} 亮点${x.highlights} 日程${x.days} 费用${x.fees}`);
    }
  }
}

main();
