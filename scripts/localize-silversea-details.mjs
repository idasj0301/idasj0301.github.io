import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const productsPath = join(root, "data", "products.json");
const detailsDir = join(root, "data", "details");

const portMap = new Map([
  ["King George Island", "乔治王岛"],
  ["Antarctic Sound", "南极海峡"],
  ["Antarctic Peninsula", "南极半岛"],
  ["South Shetland Islands", "南设得兰群岛"],
  ["Puerto Williams", "威廉斯港"],
  ["Drake Passage", "德雷克海峡"],
  ["Falkland Islands", "福克兰群岛"],
  ["South Georgia", "南乔治亚"],
  ["Elephant Island", "象岛"],
  ["Antarctica", "南极"],
]);

const benefitMap = new Map([
  ["Butler service for every suite", "每间套房均配备管家服务"],
  ["Personalized service — nearly one crew member for every guest", "高服务配比，提供细致个性化服务"],
  ["24-hour in-suite dining", "24 小时套房内送餐服务"],
  ["Complementary city center transportation when required by the destination", "部分目的地提供市中心接驳服务"],
  ["Port taxes and fees", "包含港务税费"],
  ["Choice of restaurants, diverse cuisine, open-seating dining", "多间餐厅、多元餐饮与开放式用餐"],
  ["Unlimited pour of champagne, spirits and up to 50 wines from the Silversea Cellar", "精选香槟、烈酒及银海酒窖葡萄酒畅饮"],
  ["Coffee, specialty coffees, and fine teas", "咖啡、精品咖啡与茶饮"],
  ["Enrichment lectures and onboard entertainment", "船上讲座与娱乐活动"],
  ["Unlimited access to fitness center, spa's sauna, steam room, and relaxation areas (according to opening hours)", "按开放时间使用健身中心、桑拿、蒸汽房与休闲区域"],
  ["Complimentary Wi-Fi", "包含船上 Wi-Fi"],
  ["Onboard gratuities", "包含船上小费"],
]);

const shipIntro = {
  "Silver Endeavour": "Silver Endeavour 银海奋进号是银海旗下奢华探险船，主打南极飞航与高纬度探险。船上提供全套房住宿、管家服务、精致餐饮、探险队讲座与 Zodiac 冲锋艇活动。",
  "Silver Wind": "Silver Wind 银海迎风号经过极地化升级，兼具小型探险船深入航行能力与银海全包式服务，适合南极半岛、德雷克海峡和南乔治亚航线。",
  "Silver Cloud": "Silver Cloud 银海迎云号是银海旗下极地探险船，适合南乔治亚、南极半岛与德雷克海峡航线，配备探险队与 Zodiac 冲锋艇服务。",
};

function cnDate(value = "") {
  return value
    .replace("Mon ·", "周一")
    .replace("Tue ·", "周二")
    .replace("Wed ·", "周三")
    .replace("Thu ·", "周四")
    .replace("Fri ·", "周五")
    .replace("Sat ·", "周六")
    .replace("Sun ·", "周日")
    .replace("January", "1月")
    .replace("February", "2月")
    .replace("March", "3月")
    .replace("April", "4月")
    .replace("May", "5月")
    .replace("June", "6月")
    .replace("July", "7月")
    .replace("August", "8月")
    .replace("September", "9月")
    .replace("October", "10月")
    .replace("November", "11月")
    .replace("December", "12月");
}

function cnPort(title = "") {
  let out = title;
  portMap.forEach((cn, en) => {
    out = out.replaceAll(en, cn);
  });
  return out;
}

function routeKind(product) {
  const url = product.sourceFile ?? "";
  if (url.includes("king-george-island-to-king-george-island")) return "kgiRound";
  if (url.includes("puerto-williams-to-king-george-island")) return "puertoToKgi";
  if (url.includes("king-george-island-to-puerto-williams")) return "kgiToPuerto";
  if (product.durationDays === 18) return "southGeorgiaLong";
  return "southGeorgia";
}

function overview(product) {
  const code = product.tags?.find((tag) => /^[A-Z0-9]{10,}$/.test(tag)) ?? "";
  const prefix = `${product.title}，${product.departureDate} 至 ${product.endDate}，${product.durationDays}天，航次 ${code}。`;
  switch (routeKind(product)) {
    case "kgiRound":
      return `${prefix}乔治王岛往返飞航航线，减少德雷克海峡长时间航行，重点体验南极海峡、南极半岛、南设得兰群岛和冰山水域。`;
    case "puertoToKgi":
      return `${prefix}从威廉斯港登船，经德雷克海峡进入南极半岛和南设得兰群岛，最后在乔治王岛离船，适合希望保留一次海峡航行并以飞航返程衔接的客人。`;
    case "kgiToPuerto":
      return `${prefix}从乔治王岛飞航进入南极，探索南极半岛和南设得兰群岛后，经德雷克海峡前往威廉斯港离船。`;
    case "southGeorgiaLong":
      return `${prefix}威廉斯港往返长线，覆盖福克兰群岛、南乔治亚、象岛、南极海峡、南极半岛与南设得兰群岛。`;
    default:
      return `${prefix}威廉斯港往返南乔治亚与南极半岛航线，兼顾海上巡游、野生动物观察、探险队讲座和 Zodiac 巡游/登陆活动。`;
  }
}

function itineraryLine(item, product) {
  const title = cnPort(item.title || "航行 / 探索");
  const time = item.content?.match(/，([^，。]*\d{2}:\d{2}[^。]*)/)?.[1] ?? "";
  return {
    ...item,
    date: cnDate(item.date ?? ""),
    title,
    content: `本日计划本日停靠或探索 ${title}${time ? `，时间 ${time}` : ""}。具体登陆、巡游和探险活动以船司当日安排为准。`,
  };
}

async function main() {
  const products = JSON.parse(await readFile(productsPath, "utf8"));
  for (const product of products.filter((item) => item.slug.startsWith("silversea-"))) {
    const detailPath = join(detailsDir, `${product.slug}.json`);
    const detail = JSON.parse(await readFile(detailPath, "utf8"));
    const cnOverview = overview(product);
    const shipKey = Object.keys(shipIntro).find((name) => product.shipName.includes(name));
    const benefits = (detail.highlightSections?.[1]?.bullets ?? detail.shipDetail?.facilities ?? [])
      .map((item) => benefitMap.get(item) ?? cnPort(item))
      .filter(Boolean)
      .slice(0, 8);

    product.summary = cnOverview;
    product.overview = cnOverview;
    product.highlights = [
      cnOverview,
      "页面内容为航次咨询说明，港口、活动、飞航/接驳和舱位库存以银海实时确认为准。",
      product.priceFrom > 0 ? `蘑菇表格参考起价：${product.priceLabel}` : "该航次价格需顾问向银海实时确认。",
    ];

    detail.highlightSections = [
      { title: "航线亮点", content: cnOverview },
      { title: "船上服务与包含", bullets: benefits },
    ];
    detail.itinerary = (detail.itinerary ?? []).map((item) => itineraryLine(item, product));
    detail.itineraryNote = "以上日程为航次计划说明；实际港口、时间、登陆和探险活动以船司最终确认为准。";
    detail.shipDetail = {
      ...(detail.shipDetail ?? {}),
      intro: shipKey ? shipIntro[shipKey] : detail.shipDetail?.intro,
      facilities: benefits,
    };
    await writeFile(detailPath, `${JSON.stringify(detail, null, 2)}\n`);
  }
  await writeFile(productsPath, `${JSON.stringify(products, null, 2)}\n`);
  console.log("Localized Silversea details to Chinese.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
