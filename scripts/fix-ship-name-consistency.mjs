import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const productsPath = "data/products.json";
const detailsDir = "data/details";

const products = JSON.parse(readFileSync(productsPath, "utf8"));
const detailFiles = new Set(readdirSync(detailsDir).filter((f) => f.endsWith(".json")));

const exactBySlug = new Map([
  ["2026船客x中国国家地理号-北极三岛考察", "中国国家地理号"],
  ["2027-11-10-12-01-南极半岛-南乔治亚岛-奇遇王企鹅之旅", "庞洛北冕号"],
  ["sku-2027-07-09-20d", "指挥官夏古号"],
  ["2027-8-08-8-20-北极点-远征地球之巅-12晚13天", "指挥官夏古号"],
  [
    "26年9月28日至10月14日17天夏古号极地奥德赛北极三岛-冰岛-东北格陵兰国家公园-斯瓦尔巴群岛",
    "指挥官夏古号",
  ],
  ["2027-2-2-2-16飞跃德雷克-南极过大年-11晚15天-银海奋进号", "银海奋进号"],
  ["ext-sku-2027-20-02-36d-long", "银海奋进号"],
  ["2026-kimberley-wilderness", "庞洛日丽号"],
]);

const shipTags = new Set([
  "银海",
  "银海邮轮",
  "银海奋进号",
  "海神",
  "海神号",
  "Seaventure 海神号",
  "庞洛",
  "庞洛邮轮",
  "庞洛北冕号",
  "庞洛日丽号",
  "Le Laperouse 庞洛日丽号",
  "夏古号",
  "指挥官夏古号",
  "中国国家地理号",
  "环球领航号",
  "环球领航者号",
  "World Navigator",
  "World Navigator 环球领航号",
  "World Navigator 环球领航者号",
  "探险邮轮",
]);

const shipIntro = {
  中国国家地理号:
    "中国国家地理号为中国国家地理推出的极地探索主题航次，由中国国家地理科考旅行部策划运营，船上设置科普讲座、公众科学实践与中英双语服务，具体船型、舱位与设施以出发前船方资料和合同为准。",
  庞洛北冕号:
    "庞洛北冕号延续庞洛法式奢华探险理念，约 200 位客人、140 名船上工作人员，基础房型 21㎡ 起，提供星链 WiFi、免费餐饮酒水、24 小时客房服务及法式餐厅体验。",
  指挥官夏古号:
    "指挥官夏古号为庞洛运营的 PC2 级豪华破冰探险邮轮，可深入高北极冰区，船上配备科研设备、专题讲座、温泉、泳池与法式餐饮设施，具体航行与登陆以冰况和船方安排为准。",
  银海奋进号:
    "银海奋进号为银海邮轮旗下探险邮轮，服务飞跃德雷克南极航线，具体舱位、餐饮、包机与岸上安排以船方资料和签约合同为准。",
  庞洛日丽号:
    "庞洛日丽号沿达尔文至布鲁姆西海岸巡游金伯利，适合进入乔治王河、水平瀑布、亨特河等浅水道与潮汐奇观，船上提供法式餐饮与精品小团服务。",
};

const sourceNeedles = [
  ["中国国家地理号", /中国国家地理号|国家地理号/],
  ["银海奋进号", /银海奋进|Silver Endeavour/i],
  ["庞洛北冕号", /庞洛北冕号|北冕号/],
  ["指挥官夏古号", /指挥官夏古号|夏古号|Le Commandant Charcot|COMMANDANT CHARCOT/i],
  ["庞洛日丽号", /庞洛日丽号|Le Laperouse|金伯利/],
];

function expectedShip(product, detail) {
  if (exactBySlug.has(product.slug)) return exactBySlug.get(product.slug);
  const text = [
    product.slug,
    product.title,
    product.shipName,
    product.sourceFile,
    product.overview,
    detail?.title,
    detail?.shipDetail?.name,
    detail?.highlightSections?.map((s) => `${s.title} ${s.content ?? ""}`).join(" "),
  ].join(" ");
  for (const [ship, re] of sourceNeedles) {
    if (re.test(text)) return ship;
  }
  return "";
}

function replaceShipInSummary(summary, ship) {
  if (!summary) return summary;
  if (/搭乘\s*[^。]+。/.test(summary)) {
    return summary.replace(/搭乘\s*[^。]+。/, `搭乘 ${ship}。`);
  }
  return summary;
}

function normalizeTags(tags, ship) {
  const kept = (tags ?? []).filter((tag) => !shipTags.has(tag));
  return [...new Set([...kept, ship])].slice(0, 5);
}

function updateMetaTable(metaTable, ship) {
  if (!Array.isArray(metaTable)) return metaTable;
  return metaTable.map((row) => {
    if (!Array.isArray(row) || row.length < 2) return row;
    return /邮轮|交通|船只|船名/.test(row[0]) ? [row[0], ship] : row;
  });
}

function updateDetail(slug, ship) {
  const filename = `${slug}.json`;
  if (!detailFiles.has(filename)) return null;
  const path = join(detailsDir, filename);
  const before = readFileSync(path, "utf8");
  const detail = JSON.parse(before);
  detail.tags = normalizeTags(detail.tags, ship);
  detail.metaTable = updateMetaTable(detail.metaTable, ship);
  if (detail.shipDetail) {
    detail.shipDetail.name = ship;
    if (shipIntro[ship]) detail.shipDetail.intro = shipIntro[ship];
  }
  if (detail.subtitle && shipTags.has(detail.subtitle)) {
    detail.subtitle = ship;
  }
  const after = `${JSON.stringify(detail, null, 2)}\n`;
  if (after !== before) {
    writeFileSync(path, after);
    return "changed";
  }
  return "unchanged";
}

let changedProducts = 0;
let changedDetails = 0;
const audit = [];

for (const product of products) {
  const detailPath = join(detailsDir, `${product.slug}.json`);
  const detail = existsSync(detailPath) ? JSON.parse(readFileSync(detailPath, "utf8")) : null;
  const expected = expectedShip(product, detail);
  if (!expected) continue;

  const before = product.shipName;
  product.shipName = expected;
  product.tags = normalizeTags(product.tags, expected);
  product.summary = replaceShipInSummary(product.summary, expected);
  product.ship = product.ship?.includes("：") && !/^(.+?)\s*探险邮轮\/游艇/.test(product.ship)
    ? product.ship.replace(/^.+?(?=：)/, expected)
    : `${expected}：舱位与设施以方案与合同为准。`;
  audit.push(`${product.slug}: ${before} -> ${expected}`);
  if (before !== expected) changedProducts += 1;
  if (updateDetail(product.slug, expected) === "changed") changedDetails += 1;
}

writeFileSync(productsPath, `${JSON.stringify(products, null, 2)}\n`);

const silverLeaks = products.filter(
  (p) =>
    /银海/.test([p.shipName, p.tags?.join(" "), p.ship].join(" ")) &&
    !/银海|Silversea|Silver|奋进/.test([p.slug, p.title, p.sourceFile].join(" ")),
);
const genericPonant = products.filter(
  (p) =>
    p.shipName === "庞洛" &&
    /北冕|夏古|Commandant|Charcot|Laperouse|日丽/.test([p.slug, p.title, p.sourceFile].join(" ")),
);

console.log(`updated products: ${changedProducts}`);
console.log(`updated detail files: ${changedDetails}`);
console.log(audit.join("\n"));
console.log(`silver label leaks outside valid silver products: ${silverLeaks.length}`);
console.log(`generic Ponant labels where exact vessel is known: ${genericPonant.length}`);
if (silverLeaks.length || genericPonant.length) process.exitCode = 1;
