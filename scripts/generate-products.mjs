/**
 * 生成 32 条样板 SKU（基于 PRD/原型命名，待企微 PDF 校对替换）
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const summaryBase = (parts) =>
  parts.join(
    "。",
  ) + "。咨询行程、舱房与签证细节，请通过官网「直连顾问」添加船客企业微信，顾问将根据出发档期与身体条件提供一对一建议。";

const itinerarySample = (days, region) =>
  Array.from({ length: Math.min(5, days) }, (_, i) => ({
    day: i + 1,
    title: i === 0 ? `抵达${region}门户城市` : `海上航行与探险讲座`,
    content:
      i === 0
        ? "接机/入住，行前说明会与装备检查。"
        : "参与博物学家讲座，适应海上生活，留意天气窗口安排登陆。",
  }));

const feeNote =
  "费用通常含船上住宿、全餐、探险活动与登陆（以最终合同为准）；不含国际机票、签证、小费与个人消费。具体舱位差价以顾问报价为准。";

const notice =
  "极地旅行需良好心肺功能与灵活行动能力；请提前办理所需签证与极地保险。行程可能因天气、冰况调整登陆顺序，以船长与探险队长安全决策为准。";

const shipBlurb = (name) =>
  `${name} 为极地探险邮轮，冰级与载客量满足南极/北极航线要求，配备冲锋艇、探险队与多语种服务。`;

const idPrefix = {
  antarctic: "ant",
  arctic: "arc",
  galapagos: "gal",
  "light-expedition": "lex",
  ticket: "tkt",
  ship: "shp",
};
const seq = {};

const nextId = (category) => {
  const pre = idPrefix[category] ?? "sku";
  seq[pre] = (seq[pre] ?? 0) + 1;
  return `${pre}-${String(seq[pre]).padStart(3, "0")}`;
};

/** @type {Record<string, unknown>[]} */
const products = [];

function add(p) {
  const id = p.id ?? nextId(p.category);
  products.push({
    highlights: ["专业探险队长带队", "冲锋艇登陆体验", "精品小团服务"],
    itinerary: itinerarySample(p.durationDays, p.regionName ?? "极地"),
    overview: p.summary,
    ship: shipBlurb(p.shipName),
    feeNote,
    notice,
    published: p.published !== false,
    featured: p.featured ?? false,
    imageAlt: `${p.title} 航程示意图`,
    wecomFrom: id,
    ...p,
    id,
    summary: p.summary ?? summaryBase([p.title, `${p.durationDays}天`, `${p.shipName}`, p.priceLabel]),
  });
}

// —— 南极 8 ——
[
  ["2026-wangguin-antarctica", "2026 飞船游南极 · 奇遇王企鹅 22天", "单飞", "2026-11-22", 22, 149900, "海神号", true],
  ["2026-silver-antarctica", "2026 半环南极 · 银海双飞奢享之旅", "双飞", "2027-01-17", 19, 128000, "银海邮轮", true],
  ["2027-spring-antarctica", "经典南极 · 海洋信天翁号春节奢享之旅", "南极过大年", "2027-01-29", 16, 240500, "海洋信天翁号", true],
  ["2026-peninsula-antarctica", "南极半岛经典线 · 双飞省心版", "双飞", "2026-12-08", 14, 99800, "探险号", false],
  ["2026-circle-antarctica", "南极圈深度环线 · 单飞 Extended", "单飞", "2027-02-15", 24, 189900, "海神号", false],
  ["2026-falklands-antarctica", "福克兰群岛 + 南极半岛联线", "双飞", "2026-11-05", 20, 156800, "夸克探险", false],
  ["2027-weddell-antarctica", "威德尔海帝企鹅专线", "单飞", "2027-03-01", 21, 175000, "信天翁号", false],
  ["2026-luxury-antarctica", "南极轻奢小型探险船 · 12 人精品团", "半环南极", "2026-12-20", 18, 298000, "精品探险船", false],
].forEach(([slug, title, sub, date, days, price, ship, pub, feat]) =>
  add({
    slug,
    title,
    category: "antarctic",
    subcategory: sub,
    tags: [sub],
    departureDate: date,
    durationDays: days,
    priceFrom: price,
    priceLabel: `¥${price}起`,
    shipName: ship,
    regionName: "乌斯怀亚",
    published: pub,
    featured: feat,
    summary: summaryBase([
      `船客${title}`,
      `行程${days}天`,
      `搭乘${ship}`,
      `参考起价¥${price}/人`,
      `${date}出发`,
    ]),
  }),
);

// —— 北极 6 ——
[
  ["2026-arctic-three-islands", "北极三岛 · 斯瓦尔巴-格陵兰-冰岛", "三岛", "2026-07-25", 18, 98000, "探险号", true],
  ["2026-arctic-four-islands", "北极四岛 · 朗伊尔城深度连线", "四岛", "2026-08-12", 20, 112000, "海神号", true],
  ["2026-north-pole", "北极点破冰之旅 · 核动力破冰船", "北极点", "2026-07-10", 14, 398000, "50年胜利号", false],
  ["2026-svalbard-only", "斯瓦尔巴环岛 · 北极熊摄影专线", "斯瓦尔巴", "2026-06-18", 10, 76800, "探险号", false],
  ["2027-greenland-east", "格陵兰东海岸峡湾深度", "格陵兰", "2027-08-05", 16, 135000, "银海邮轮", false],
  ["2026-iceland-arctic", "冰岛 + 扬马延岛北极门户", "冰岛连线", "2026-09-01", 12, 85800, "探险号", false],
].forEach(([slug, title, sub, date, days, price, ship, pub, feat]) =>
  add({
    slug,
    title,
    category: "arctic",
    subcategory: sub,
    tags: [sub],
    departureDate: date,
    durationDays: days,
    priceFrom: price,
    priceLabel: `¥${price}起`,
    shipName: ship,
    regionName: "朗伊尔城",
    published: pub,
    featured: feat,
    summary: summaryBase([title, `${days}天`, ship, `¥${price}起`, date]),
  }),
);

// —— 加拉帕戈斯 4 ——
[
  ["2026-galapagos-recruit", "2026 加拉帕戈斯 · 招募团", "招募团", "2026-02-21", 10, 86800, "探险游艇", true],
  ["2026-galapagos-advanced", "加拉帕戈斯 · 进阶探索线", "进阶", "2026-03-15", 12, 92800, "探险游艇", true],
  ["2026-galapagos-family", "加拉帕戈斯亲子自然课堂", "亲子", "2026-07-08", 9, 79800, "探险游艇", false],
  ["2027-galapagos-photo", "加帕野生动物摄影专线", "摄影", "2027-04-20", 11, 99800, "探险游艇", false],
].forEach(([slug, title, sub, date, days, price, ship, pub, feat]) =>
  add({
    slug,
    title,
    category: "galapagos",
    subcategory: sub,
    tags: [sub],
    departureDate: date,
    durationDays: days,
    priceFrom: price,
    priceLabel: `¥${price}起`,
    shipName: ship,
    regionName: "基多",
    published: pub,
    featured: feat,
    summary: summaryBase([title, `${days}天`, "厄瓜多尔加拉帕戈斯群岛", `¥${price}起`]),
  }),
);

// —— 轻探险 5 ——
[
  ["2026-east-africa", "东非 · 天河之渡", "东非", "2026-07-10", 12, 132800, "陆地游猎", true],
  ["2026-tahiti", "大溪地 · 轻探险团", "大溪地", "2026-09-05", 10, 158000, "波拉波拉", true],
  ["2026-south-africa", "南非好望角 + 野生动物", "南非", "2026-10-12", 11, 118000, "精品酒店", false],
  ["2027-patagonia", "巴塔哥尼亚徒步远征", "巴塔哥尼亚", "2027-03-18", 14, 98800, "徒步营地", false],
  ["2026-namibia", "纳米比亚沙漠星空摄影", "纳米比亚", "2026-08-22", 9, 108000, "沙漠营地", false],
].forEach(([slug, title, sub, date, days, price, ship, pub, feat]) =>
  add({
    slug,
    title,
    category: "light-expedition",
    subcategory: sub,
    tags: [sub],
    departureDate: date,
    durationDays: days,
    priceFrom: price,
    priceLabel: `¥${price}起`,
    shipName: ship,
    regionName: sub,
    published: pub,
    featured: feat,
    summary: summaryBase([title, `${days}天轻探险`, `¥${price}起`]),
  }),
);

// —— 单船票 5 ——
[
  ["ticket-silver-2026-11", "银海邮轮 · 南极半岛航次船票", "银海", "2026-11-18", 12, 68000, "银海邮轮", true],
  ["ticket-quark-2027-01", "夸克探险 · 南极经典航次", "夸克", "2027-01-05", 11, 72000, "夸克探险", true],
  ["ticket-poseidon-2026-12", "海神号 · 王企鹅航次船票", "海神号", "2026-11-22", 14, 89000, "海神号", false],
  ["ticket-albatross-2027-02", "信天翁号 · 半环南极船票", "信天翁", "2027-02-01", 13, 75000, "海洋信天翁号", false],
  ["ticket-arctic-2026-07", "北极探险号 · 斯瓦尔巴航次", "探险号", "2026-07-25", 9, 52000, "探险号", false],
].forEach(([slug, title, sub, date, days, price, ship, pub, feat]) =>
  add({
    slug,
    title,
    category: "ticket",
    subcategory: sub,
    tags: ["单船票", sub],
    departureDate: date,
    durationDays: days,
    priceFrom: price,
    priceLabel: `¥${price}起`,
    shipName: ship,
    regionName: "船上",
    published: pub,
    featured: feat,
    summary: summaryBase([title, "仅含船票舱位与船上服务", `¥${price}起`, "不含国际机票与签证"]),
  }),
);

// —— 船司甄选 4 ——
[
  ["ship-silver-seas", "银海邮轮 · 南极与北极航次精选", "银海", "2026-11-01", 0, 128000, "银海邮轮", true],
  ["ship-poseidon", "海神号 · 南极王企鹅与半岛线", "海神号", "2026-11-22", 0, 149900, "海神号", true],
  ["ship-quark", "夸克探险 · 探险与摄影主题航次", "夸克", "2027-01-05", 0, 98000, "夸克探险", false],
  ["ship-albatross", "海洋信天翁号 · 春节南极奢享", "信天翁", "2027-01-29", 0, 240500, "海洋信天翁号", false],
].forEach(([slug, title, sub, date, days, price, ship, pub, feat]) =>
  add({
    slug,
    title,
    category: "ship",
    subcategory: sub,
    tags: ["船司", sub],
    departureDate: date,
    durationDays: days || 1,
    priceFrom: price,
    priceLabel: `¥${price}起`,
    shipName: ship,
    regionName: "多航次",
    published: pub,
    featured: feat,
    summary: summaryBase([`船客甄选${ship}航次`, "多条档期可选", `参考¥${price}起`]),
  }),
);

const out = join(__dirname, "../data/products.json");
writeFileSync(out, JSON.stringify(products, null, 2), "utf8");
console.log(`Wrote ${products.length} products to ${out}`);
console.log(`Published: ${products.filter((p) => p.published).length}`);
