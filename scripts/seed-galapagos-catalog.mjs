/**
 * 补全加拉帕戈斯品类在售 SKU（PPT 同步仅 1 条厄瓜多尔全景，其余为船客标准档期占位，待方案替换）
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../data/products.json");

function formatPriceLabel(priceFrom) {
  if (priceFrom > 0) return `¥${priceFrom.toLocaleString("zh-CN")} 起`;
  return "价格咨询";
}

const feeNote =
  "费用以签约合同为准；机票、签证、保险、小费及个人消费通常另计。具体舱位请咨询顾问。";
const notice =
  "加拉帕戈斯与厄瓜多尔段需良好体能与防晒；遵守国家公园与野生动物观赏规定。";

/** @type {Record<string, unknown>[]} */
const SEED = [
  {
    id: "gal-002",
    slug: "2026-galapagos-recruit",
    title: "2026 加拉帕戈斯 · 招募团",
    category: "galapagos",
    subcategory: "招募团",
    tags: ["招募团", "加拉帕戈斯", "厄瓜多尔"],
    departureDate: "2026-09-15",
    durationDays: 10,
    priceFrom: 86800,
    shipName: "探险游艇",
    summary:
      "船客 2026 加拉帕戈斯招募团，9 月 15 日出发，10 天厄瓜多尔加拉帕戈斯生态探险。参考起价 ¥86800/人。具体档期与舱位请咨询顾问。",
    published: true,
    featured: false,
    sourceFile: "catalog/galapagos-recruit",
  },
  {
    id: "gal-003",
    slug: "2026-galapagos-advanced",
    title: "加拉帕戈斯 · 进阶探索线",
    category: "galapagos",
    subcategory: "进阶",
    tags: ["进阶", "加拉帕戈斯"],
    departureDate: "2026-10-08",
    durationDays: 12,
    priceFrom: 92800,
    shipName: "探险游艇",
    summary:
      "船客加拉帕戈斯进阶探索线，10 月 8 日出发，12 天深度巡游。参考起价 ¥92800/人。咨询行程、舱房与签证细节，请直连顾问。",
    published: true,
    featured: false,
    sourceFile: "catalog/galapagos-advanced",
  },
  {
    id: "gal-004",
    slug: "2026-galapagos-family",
    title: "加拉帕戈斯亲子自然课堂",
    category: "galapagos",
    subcategory: "亲子",
    tags: ["亲子", "加拉帕戈斯"],
    departureDate: "2026-07-08",
    durationDays: 9,
    priceFrom: 79800,
    shipName: "探险游艇",
    summary:
      "船客加拉帕戈斯亲子自然课堂，7 月 8 日出发，9 天亲子友好行程。参考起价 ¥79800/人。欢迎预约顾问获取最新余位。",
    published: true,
    featured: false,
    sourceFile: "catalog/galapagos-family",
  },
  {
    id: "gal-005",
    slug: "2027-galapagos-photo",
    title: "加帕野生动物摄影专线",
    category: "galapagos",
    subcategory: "摄影",
    tags: ["摄影", "加拉帕戈斯"],
    departureDate: "2027-04-20",
    durationDays: 11,
    priceFrom: 99800,
    shipName: "探险游艇",
    summary:
      "船客加拉帕戈斯野生动物摄影专线，2027 年 4 月 20 日出发，11 天。参考起价 ¥99800/人。具体登陆点以探险队长安排为准。",
    published: true,
    featured: false,
    sourceFile: "catalog/galapagos-photo",
  },
];

const products = JSON.parse(readFileSync(OUT, "utf8"));
const slugs = new Set(products.map((p) => p.slug));
let added = 0;

for (const row of SEED) {
  if (slugs.has(row.slug)) continue;
  products.push({
    ...row,
    priceLabel: formatPriceLabel(row.priceFrom),
    overview: row.summary,
    highlights: [
      "加拉帕戈斯群岛生态探险",
      "专业领队与冲锋艇巡游（以船期为准）",
      "中文服务与行前说明",
    ],
    itinerary: [
      { day: 1, title: "启程", content: "抵达基多/瓜亚基尔，行前说明。" },
      { day: 5, title: "群岛巡游", content: "登陆观鸟、海鬣蜥、象龟等（以安排为准）。" },
      { day: row.durationDays, title: "返程", content: "结束行程返回国内。" },
    ],
    ship: `${row.shipName} 探险游艇，舱位以合同为准。`,
    feeNote,
    notice,
    imageAlt: row.title.slice(0, 40),
    wecomFrom: row.id,
  });
  slugs.add(row.slug);
  added++;
}

products.sort((a, b) => {
  if (a.category !== b.category) return a.category.localeCompare(b.category);
  return a.departureDate.localeCompare(b.departureDate);
});

writeFileSync(OUT, JSON.stringify(products, null, 2) + "\n", "utf8");
const gal = products.filter((p) => p.category === "galapagos" && p.published);
console.log(`新增 ${added} 条加拉帕戈斯；在售 ${gal.length} 条`);
