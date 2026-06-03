import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const productsPath = "data/products.json";
const detailsDir = "data/details";

const titleOverrides = new Map([
  ["ext-2026-11-16-12-24-飞船游南极-奇遇王企鹅-南美六国39天-long", "飞船游南极 · 奇遇王企鹅 + 南美六国"],
  ["2026-wangguin-antarctica-22d", "飞船游南极 · 奇遇王企鹅"],
  ["ext-2026-11-30-1-8-飞船游南极-天涯双城记-延长线40天-long", "飞船游南极 · 天涯双城记 + 南美七国"],
  ["2026-12-4-12-21-飞船游南极-天涯双城记18天", "飞船游南极 · 天涯双城记"],
  ["ext-sku-2027-20-27-42d-long", "飞船游南极 · 奇遇王企鹅 + 南美七国"],
  ["ext-sku-2027-01-12-40d-long", "飞船游南极 · 天涯双城记 + 南美七国"],
  ["2027-1-18-2-08-飞船游南极-奇遇王企鹅22天", "飞船游南极 · 奇遇王企鹅"],
  ["2027-1-30-2-15-2027春节-飞船游南极-天涯双城记17天", "飞船游南极 · 天涯双城记"],
  ["2027-2-2-2-16飞跃德雷克-南极过大年-11晚15天-银海奋进号", "飞越德雷克 · 南极过大年"],
  ["ext-sku-2027-20-02-36d-long", "飞越德雷克 · 南极过大年 + 南美七国"],
  ["2027-11-10-12-01-南极半岛-南乔治亚岛-奇遇王企鹅之旅", "南极半岛 & 南乔治亚岛 · 奇遇王企鹅"],
  ["2026年6月13日大满贯全体验-环游北极三大秘境24天23晚", "大满贯全体验 · 环游北极三大秘境"],
  ["sku-2026-20-26-27d", "北极格陵兰岛 · 冰岛 · 扬马延岛 · 斯瓦尔巴群岛"],
  ["2026船客x中国国家地理号-北极三岛考察", "船客 X 中国国家地理号 · 北极三岛考察"],
  ["2026-arctic-eclipse-three-islands", "冰穹之上的日食 · 巡游北极三岛"],
  ["2026-7-29-8-20日全食-巡游北极三岛-long", "冰穹之上的日食 · 巡游北极三岛"],
  ["2026年8月北极三岛16晚18天-short", "奔赴地球穹顶 · 巡游北极三岛"],
  ["2026年8月北极三岛19晚21天-long", "奔赴地球穹顶 · 巡游北极三岛"],
  ["sku-2027-07-09-20d", "北极点 + 北极三岛 · 北极大满贯"],
  ["2027-8-08-8-20-北极点-远征地球之巅-12晚13天", "北极点 · 远征地球之巅"],
  ["2026-ecuador-four-worlds", "厄瓜多尔 · 一国四境"],
  ["2026-galapagos-recruit", "加拉帕戈斯 · 招募团"],
  ["2026年6月南部非洲10晚11天", "南部非洲 · 轻探险"],
  ["2026-kimberley-wilderness", "最后的荒野 · 奇绝金伯利"],
  ["sku-2026-09-07-25d", "纵贯安第斯 · 南美秘境的野性征途"],
  ["2026年9月-文明万花筒-地中海传奇", "文明万花筒 · 地中海传奇"],
  ["2026年10月亚得里亚海9晚11天", "亚得里亚海 · 文明与海岸"],
  ["26年12月香草四岛-东非海岸16晚17天", "香草四岛 + 东非海岸"],
  ["20270220-0320穿越南美七国29天25晚", "穿越南美七国"],
  ["260602西格陵兰冰川峡湾之旅", "西格陵兰冰川峡湾之旅"],
  ["260613巡游西格陵兰冰川与文明", "巡游西格陵兰冰川与文明"],
  [
    "26年9月28日至10月14日17天夏古号极地奥德赛北极三岛-冰岛-东北格陵兰国家公园-斯瓦尔巴群岛",
    "指挥官夏古号极地奥德赛 · 北极三岛",
  ],
]);

const shipNameMap = new Map([
  ["海神", "海神号"],
  ["World Navigator", "环球领航者号"],
  ["环球领航者号 World Navigator", "环球领航者号"],
  ["World Navigator 环球领航号", "环球领航者号"],
  ["World Navigator 环球领航者号", "环球领航者号"],
]);

function normalizeShipName(name = "") {
  return shipNameMap.get(name) ?? name;
}

function normalizeString(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/海神(?!号)/g, "海神号")
    .replace(/World Navigator 环球领航号|World Navigator 环球领航者号|环球领航者号 World Navigator/g, "环球领航者号");
}

function walk(value) {
  if (Array.isArray(value)) return value.map(walk);
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) value[key] = walk(value[key]);
    return value;
  }
  return normalizeString(value);
}

const products = JSON.parse(readFileSync(productsPath, "utf8"));
let productChanges = 0;
for (const product of products) {
  const before = JSON.stringify(product);
  product.title = titleOverrides.get(product.slug) ?? normalizeString(product.title);
  product.shipName = normalizeShipName(product.shipName);
  product.tags = [...new Set((product.tags ?? []).map(normalizeString).map(normalizeShipName))];
  product.summary = normalizeString(product.summary);
  product.ship = normalizeString(product.ship);
  product.overview = normalizeString(product.overview);
  if (JSON.stringify(product) !== before) productChanges += 1;
}
writeFileSync(productsPath, `${JSON.stringify(products, null, 2)}\n`);

let detailChanges = 0;
for (const file of readdirSync(detailsDir).filter((f) => f.endsWith(".json"))) {
  const path = join(detailsDir, file);
  const before = readFileSync(path, "utf8");
  const detail = walk(JSON.parse(before));
  const after = `${JSON.stringify(detail, null, 2)}\n`;
  if (after !== before) {
    writeFileSync(path, after);
    detailChanges += 1;
  }
}

const dateInTitle = /(20\d{2}|\d{2}年|\d{6,8}|\d{1,2}[./月-]\d{1,2}|\d+\s*晚|\d+\s*天)/;
const published = products.filter((p) => p.published !== false);
const titleLeaks = published.filter((p) => dateInTitle.test(p.title));
const shortHaishen = published.filter((p) =>
  /海神(?!号)/.test([p.shipName, ...(p.tags ?? []), p.summary, p.ship].join(" ")),
);

console.log(`normalized products: ${productChanges}`);
console.log(`normalized detail files: ${detailChanges}`);
console.log(`published title date/duration leaks: ${titleLeaks.length}`);
for (const p of titleLeaks) console.log(`  ${p.slug}: ${p.title}`);
console.log(`published short 海神 leaks: ${shortHaishen.length}`);
for (const p of shortHaishen) console.log(`  ${p.slug}: ${p.shipName} / ${(p.tags ?? []).join(",")}`);
if (titleLeaks.length || shortHaishen.length) process.exitCode = 1;
