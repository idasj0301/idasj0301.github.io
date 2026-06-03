import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const productsPath = join(root, "data", "products.json");
const detailsDir = join(root, "data", "details");
const publicTripsDir = join(root, "public", "trips");
const sourceAssetDir = join(
  publicTripsDir,
  "2027-2-2-2-16飞跃德雷克-南极过大年-11晚15天-银海奋进号",
);

const assets = {
  hero: "hero.jpg",
  gallery: ["gallery-01.jpg", "gallery-02.jpg", "gallery-03.jpg"],
};

const shipDetails = {
  endeavour: {
    zhName: "银海奋进号",
    enName: "Silver Endeavour",
    name: "Silver Endeavour 银海奋进号",
    specs: [
      ["船司", "Silversea 银海邮轮"],
      ["载客 / 船员", "约 220 位客人 / 207 名船员"],
      ["船型", "奢华探险邮轮"],
      ["航线定位", "南极飞航、南极半岛与高纬度探险"],
      ["航次服务", "全套房、管家服务、探险队、Zodiac 冲锋艇"],
    ],
    intro:
      "Silver Endeavour 是银海邮轮旗下奢华探险船，服务南极飞航与高纬度探险航线。船上以全套房、管家服务、精致餐饮、观景空间、探险队讲座和 Zodiac 冲锋艇登陆/巡游为核心体验。",
  },
  wind: {
    zhName: "银海迎风号",
    enName: "Silver Wind",
    name: "Silver Wind 银海迎风号",
    specs: [
      ["船司", "Silversea 银海邮轮"],
      ["载客 / 船员", "约 274 位客人 / 239 名船员"],
      ["船型", "极地化升级奢华探险船"],
      ["航线定位", "南极半岛、南设得兰群岛、德雷克海峡"],
      ["航次服务", "全套房、管家服务、探险队、Zodiac 冲锋艇"],
    ],
    intro:
      "Silver Wind 是银海邮轮旗下经过极地化升级的探险船，兼具小型船深入航行能力与银海式全包奢华服务，适合南极半岛、德雷克海峡与南设得兰群岛航线。",
  },
  cloud: {
    zhName: "银海迎云号",
    enName: "Silver Cloud",
    name: "Silver Cloud 银海迎云号",
    specs: [
      ["船司", "Silversea 银海邮轮"],
      ["载客 / 船员", "约 254 位客人 / 212 名船员"],
      ["船型", "极地探险邮轮"],
      ["航线定位", "南乔治亚、南极半岛、德雷克海峡"],
      ["航次服务", "全套房、管家服务、探险队、Zodiac 冲锋艇"],
    ],
    intro:
      "Silver Cloud 是银海邮轮旗下极地探险船，适合南乔治亚、南极半岛和德雷克海峡航线。船上保留银海全包奢华服务，并配备探险队与 Zodiac 冲锋艇。",
  },
};

const commonIncluded = [
  "船上住宿、船上餐食、船上活动及船司安排的探险活动（以船司最终确认和当日条件为准）",
  "船上管家服务、开放式用餐、精选饮品、Wi-Fi、船上小费及港口税费等银海全包项目（以船司政策为准）",
  "探险队讲座、Zodiac 冲锋艇巡游/登陆及相关安全说明（具体项目以航次开放为准）",
];

const commonExcluded = [
  "国际机票、签证、保险、出发前后酒店、接送机及前后段陆地行程，除非船司或合同另有明确包含",
  "皮划艇等需额外确认名额或条件的活动、个人消费、洗衣、医疗、卫星电话及其他私人费用",
  "因天气、冰况、机场、船司调度或不可抗力造成的额外费用，按船司条款和合同约定执行",
];

const noticeSections = [
  {
    title: "行程调整",
    content:
      "南极飞航、德雷克海峡航行和登陆活动高度依赖天气、冰况、机场和船司调度。船长与探险队长会根据安全和体验调整航线、登陆点、时间和活动顺序。",
  },
  {
    title: "单船票说明",
    content:
      "本页为单船票 SKU，上架用于官网咨询和顾问匹配；最终舱位、价格、税费、飞航衔接和费用包含以船客顾问向船司实时确认为准。",
  },
];

const voyages = [
  ticket("EV261020006", "endeavour", "kgiRound6", "双飞6天", "2026-10-20", "2026-10-26", 6, 19400),
  ticket("EV261026006", "endeavour", "kgiRound6", "双飞6天", "2026-10-26", "2026-11-01", 6, 17400),
  ticket("EV261101006", "endeavour", "kgiRound6", "双飞6天", "2026-11-01", "2026-11-07", 6, 20400),
  ticket("EV261107006", "endeavour", "kgiRound6", "双飞6天", "2026-11-07", "2026-11-13", 6, 20500),
  ticket("EV261119006", "endeavour", "kgiRound6", "双飞6天", "2026-11-19", "2026-11-25", 6, 21600),
  ticket("WI270106009", "wind", "puertoToKgi9", "单飞9天", "2027-01-06", "2027-01-15", 9, 23900),
  ticket("WI270115009", "wind", "kgiToPuerto9", "单飞9天", "2027-01-15", "2027-01-24", 9, 23900),
  ticket("WI270124009", "wind", "puertoToKgi9", "单飞9天", "2027-01-24", "2027-02-02", 9, 19400),
  ticket("WI270202009", "wind", "kgiToPuerto9", "单飞9天", "2027-02-02", "2027-02-11", 9, 22300),
  ticket("WI270211009", "wind", "puertoToKgi9", "单飞9天", "2027-02-11", "2027-02-20", 9, 20600),
  ticket("WI270220009", "wind", "kgiToPuerto9", "单飞9天", "2027-02-20", "2027-03-01", 9, 18700),
  ticket("WI270301009", "wind", "puertoToKgi9", "单飞9天", "2027-03-01", "2027-03-10", 9, 15800),
  ticket("WI270310009", "wind", "kgiToPuerto9", "单飞9天", "2027-03-10", "2027-03-19", 9, 13800),
  ticket("WI261107018", "wind", "puertoRound18", "南乔治亚18天", "2026-11-07", "2026-11-25", 18, 0),
  ticket("E4261109015", "cloud", "puertoRound15", "南乔治亚15天", "2026-11-09", "2026-11-24", 15, 18900),
  ticket("E4261124015", "cloud", "puertoRound15", "南乔治亚15天", "2026-11-24", "2026-12-09", 15, 18900),
  ticket("WI261222015", "wind", "puertoRound15", "南乔治亚15天", "2026-12-22", "2027-01-06", 15, 24600),
  ticket("E4270212015", "cloud", "puertoRound15", "南乔治亚15天", "2027-02-12", "2027-02-27", 15, 39900),
];

function ticket(code, shipKind, routeKind, subtitle, start, end, duration, priceFrom) {
  const slug = `silversea-${code.toLowerCase()}`;
  const routeSlug = routePathFor(routeKind);
  return {
    code,
    slug,
    shipKind,
    routeKind,
    subtitle,
    start,
    end,
    duration,
    priceFrom,
    sourceUrl: `https://www.silversea.com/destinations/antarctica-cruise/${routeSlug}-${code.toLowerCase()}.html`,
  };
}

function routePathFor(kind) {
  if (kind === "kgiRound6") return "king-george-island-to-king-george-island";
  if (kind === "puertoToKgi9") return "puerto-williams-to-king-george-island";
  if (kind === "kgiToPuerto9") return "king-george-island-to-puerto-williams";
  return "puerto-williams-to-puerto-williams";
}

function routeTitleFor(kind) {
  if (kind === "kgiRound6") return "King George Island to King George Island";
  if (kind === "puertoToKgi9") return "Puerto Williams to King George Island";
  if (kind === "kgiToPuerto9") return "King George Island to Puerto Williams";
  return "Puerto Williams to Puerto Williams";
}

function titleFor(voyage) {
  const ship = shipDetails[voyage.shipKind];
  if (voyage.routeKind === "kgiRound6") return `${ship.zhName} · 南极半岛飞航 6天`;
  if (voyage.routeKind === "puertoToKgi9") return `${ship.zhName} · 威廉斯港至乔治王岛 9天`;
  if (voyage.routeKind === "kgiToPuerto9") return `${ship.zhName} · 乔治王岛至威廉斯港 9天`;
  if (voyage.duration === 18) return `${ship.zhName} · 福克兰-南乔治亚-南极 18天`;
  return `${ship.zhName} · 南乔治亚与南极半岛 15天`;
}

function summaryFor(voyage) {
  const ship = shipDetails[voyage.shipKind];
  const route = routeTitleFor(voyage.routeKind);
  return `${ship.zhName}${route} ${voyage.duration} 天单船票航程，船司航次 ${voyage.code}，${cnDate(voyage.start)}至${cnDate(voyage.end)}。${routeIntro(voyage)} 舱位、价格和费用包含以顾问向银海实时确认为准。`;
}

function routeIntro(voyage) {
  if (voyage.routeKind === "kgiRound6") {
    return "乔治王岛往返飞航线，可减少德雷克海峡长时间航行，重点探索南极海峡、南极半岛与南设得兰群岛。";
  }
  if (voyage.routeKind === "puertoToKgi9") {
    return "从威廉斯港启程，穿越德雷克海峡进入南极海域，最后在乔治王岛离船，适合单飞衔接南极短线。";
  }
  if (voyage.routeKind === "kgiToPuerto9") {
    return "从乔治王岛进入南极，探索南极半岛与南设得兰群岛，再经德雷克海峡前往威廉斯港。";
  }
  if (voyage.duration === 18) {
    return "从威廉斯港往返，覆盖福克兰群岛、南乔治亚、象岛、南极海峡、南极半岛与南设得兰群岛，是完整南极长线体验。";
  }
  return "从威廉斯港往返，深入南乔治亚与南极半岛，兼顾海上巡游、野生动物观察和 Zodiac 探险活动。";
}

function cnDate(iso) {
  const [year, month, day] = iso.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function shortDate(iso) {
  const [, month, day] = iso.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function dateRange(voyage) {
  return `${voyage.start.replaceAll("-", ".")} — ${voyage.end.replaceAll("-", ".")}`;
}

function priceLabel(priceFrom) {
  return priceFrom > 0 ? `US$${priceFrom.toLocaleString("en-US")} 起` : "价格咨询";
}

function buildProduct(voyage, index) {
  const ship = shipDetails[voyage.shipKind];
  const routeTitle = routeTitleFor(voyage.routeKind);
  const routeTags =
    voyage.routeKind === "kgiRound6"
      ? ["双飞", "乔治王岛往返"]
      : voyage.duration === 9
        ? ["单飞", "德雷克海峡"]
        : ["南乔治亚", "南极半岛"];
  return {
    id: `tkt-${String(index + 6).padStart(3, "0")}`,
    slug: voyage.slug,
    title: titleFor(voyage),
    category: "ticket",
    subcategory: voyage.subtitle,
    tags: ["银海", "单船票", "南极", voyage.code, ship.enName, ...routeTags],
    departureDate: voyage.start,
    endDate: voyage.end,
    durationDays: voyage.duration,
    priceFrom: voyage.priceFrom,
    priceLabel: priceLabel(voyage.priceFrom),
    company: "银海",
    shipName: `${ship.zhName} ${ship.enName}`,
    summary: summaryFor(voyage),
    overview: `${ship.zhName}${routeTitle}，${dateRange(voyage)}，${voyage.duration}天，船司航次 ${voyage.code}。`,
    highlights: [
      `${routeTitle} · Voyage ${voyage.code}`,
      `${ship.name}，银海全包式奢华探险邮轮服务`,
      "最终舱位、价格、税费和飞航/接驳安排以顾问向银海实时确认为准",
    ],
    itinerary: compactItinerary(voyage),
    ship: `${ship.name}：舱房、餐饮、公共区域与探险设施以船司实时资料和签约合同为准。`,
    feeNote: "单船票价格、舱位、税费、飞航衔接和附加服务以顾问实时确认为准；国际机票、签证、保险及个人消费通常另计。",
    notice: "南极航线、飞航和登陆活动受天气、冰况、机场与船司安排影响，航线、登陆点和飞行衔接可能调整。",
    published: true,
    featured: false,
    imageAlt: `${ship.zhName}${voyage.subtitle} ${voyage.code}`,
    sourceFile: `单船票官网上架-致ida.xlsx / ${voyage.sourceUrl}`,
    wecomFrom: `tkt-${String(index + 6).padStart(3, "0")}`,
  };
}

function compactItinerary(voyage) {
  if (voyage.routeKind === "kgiRound6") {
    return [
      { day: 1, title: "乔治王岛登船", content: "抵达乔治王岛后登船，开启南极半岛飞航单船票航程。" },
      { day: 2, title: "南极海峡", content: "进入南极海峡，欣赏冰山水道和极地海鸟。" },
      { day: 5, title: "南极半岛与南设得兰群岛", content: "在南极半岛和南设得兰群岛区域巡游或登陆，活动以天气海况为准。" },
      { day: 6, title: "乔治王岛离船", content: "返回乔治王岛并离船，结束邮轮航段。" },
    ];
  }
  if (voyage.duration === 9) {
    const start = voyage.routeKind === "puertoToKgi9" ? "威廉斯港登船" : "乔治王岛登船";
    const end = voyage.routeKind === "puertoToKgi9" ? "乔治王岛离船" : "威廉斯港离船";
    return [
      { day: 1, title: start, content: "登船后开启南极单飞单船票航段。" },
      { day: 3, title: "德雷克海峡 / 南极海峡", content: "按航线方向穿越德雷克海峡或进入南极海峡。" },
      { day: 7, title: "南极半岛与南设得兰群岛", content: "探索南极半岛、南极海峡与南设得兰群岛，参加船司安排的巡游、登陆或讲座。" },
      { day: 9, title: end, content: "抵达终点港并离船，结束邮轮航段。" },
    ];
  }
  if (voyage.duration === 18) {
    return [
      { day: 1, title: "威廉斯港登船", content: "从智利威廉斯港登船，开启完整南极长线航程。" },
      { day: 4, title: "福克兰群岛", content: "巡游福克兰群岛方向，观察海鸟、企鹅和南大西洋岛屿风光。" },
      { day: 9, title: "南乔治亚", content: "深入南乔治亚，探索王企鹅、海豹和探险史遗迹。" },
      { day: 14, title: "象岛、南极海峡与南极半岛", content: "进入南极海域，探索象岛、南极海峡、南极半岛与南设得兰群岛。" },
      { day: 18, title: "威廉斯港离船", content: "经德雷克海峡返回威廉斯港并离船。" },
    ];
  }
  return [
    { day: 1, title: "威廉斯港登船", content: "从智利威廉斯港登船，开启南乔治亚与南极半岛航程。" },
    { day: 4, title: "海上航行", content: "海上航行日，参加船上讲座和探险准备。" },
    { day: 8, title: "南乔治亚", content: "探索南乔治亚，观察王企鹅、海豹和冰川山地景观。" },
    { day: 12, title: "象岛与南极半岛", content: "进入南极海域，探索象岛、南极海峡、南极半岛与南设得兰群岛。" },
    { day: 15, title: "威廉斯港离船", content: "返回威廉斯港并离船，结束邮轮航段。" },
  ];
}

function detailFor(voyage) {
  const ship = shipDetails[voyage.shipKind];
  const routeTitle = routeTitleFor(voyage.routeKind);
  return {
    titleEn: routeTitle.toUpperCase(),
    subtitle: voyage.subtitle,
    tags: ["银海", "单船票", "南极", voyage.code, voyage.subtitle, ship.name],
    heroImage: `/trips/${voyage.slug}/${assets.hero}`,
    routeMap: {
      src: `/trips/${voyage.slug}/route-map.svg`,
      alt: `${titleFor(voyage)} 航线图`,
      caption: `${routeTitle} · Voyage ${voyage.code} · ${dateRange(voyage)}`,
    },
    gallery: assets.gallery.map((file, index) => ({
      src: `/trips/${voyage.slug}/${file}`,
      alt: `${titleFor(voyage)} 航程图片 ${index + 1}`,
      caption: ["南极半岛冰山与探险船", "极地登陆与巡游体验", "南极海域野生动物与冰川景观"][index],
    })),
    metaTable: [
      ["船司航次", voyage.code],
      ["银海航线", routeTitle],
      ["出行日期", dateRange(voyage)],
      ["目的地", voyage.duration > 9 ? "南乔治亚 / 南极半岛 / 南设得兰群岛" : "南极半岛 / 南设得兰群岛"],
      ["出行时长", `${voyage.duration}天`],
      ["邮轮", ship.name],
      ["航线来源", voyage.sourceUrl],
    ],
    cabins: [
      { name: "Vista / Classic / Superior / Deluxe 等套房", spec: "具体开放舱型以银海实时库存为准", price: priceLabel(voyage.priceFrom) },
      { name: "Veranda / Silver / Medallion / Owner 等套房", spec: "不同航次和舱型价格差异较大，请顾问实时确认", price: "实时确认" },
    ],
    highlightSections: [
      { title: "银海官网航线摘要", content: routeIntro(voyage) },
      {
        title: "单船票优势",
        bullets: [
          "适合已自行安排国际段、签证和前后住宿，只需要预订邮轮航段的客人。",
          "银海全包式船上服务包含管家服务、餐饮、精选饮品、Wi-Fi 和船上小费等项目（以船司条款为准）。",
          "所有登陆点、活动和时间均由船长及探险队长依据安全、天气、冰况和环保规范最终安排。",
        ],
      },
    ],
    itinerary: compactItinerary(voyage).map((item) => ({
      day: String(item.day),
      date: item.day === 1 ? shortDate(voyage.start) : item.day === voyage.duration ? shortDate(voyage.end) : undefined,
      title: item.title,
      content: item.content,
    })),
    itineraryNote: "行程按银海官网航次页面整理为单船票咨询版；港口、时间、探险活动和飞航衔接可能因天气、冰况、机场与船司调度调整。",
    shipDetail: {
      name: ship.name,
      intro: ship.intro,
      specs: ship.specs,
      facilities: [
        "Butler service for every suite 管家服务",
        "开放式用餐、精选酒水与船上娱乐",
        "探险队讲座与 Zodiac 冲锋艇活动",
        "观景甲板、餐厅、酒吧、健身与休闲空间",
        "极地登陆、巡游和海上航行服务以船司安排为准",
      ],
      cabins: [{ name: "套房舱位", spec: "银海全套房设计，具体舱型、面积、楼层、阳台和权益以该航次实时舱位为准。", price: priceLabel(voyage.priceFrom) }],
    },
    feeIncluded: commonIncluded,
    feeExcluded: commonExcluded,
    noticeSections,
  };
}

function routePoints(kind) {
  const p = {
    kgi: [630, 122],
    sound: [546, 242],
    peninsula: [462, 380],
    shetland: [608, 260],
    puerto: [735, 515],
    drake: [652, 426],
    falklands: [778, 356],
    southGeorgia: [575, 366],
    elephant: [555, 302],
  };
  if (kind === "puertoToKgi9") return [p.puerto, p.drake, p.sound, p.peninsula, p.shetland, p.kgi];
  if (kind === "kgiToPuerto9") return [p.kgi, p.sound, p.peninsula, p.shetland, p.drake, p.puerto];
  if (kind === "puertoRound18") return [p.puerto, p.falklands, p.southGeorgia, p.elephant, p.sound, p.peninsula, p.shetland, p.drake, p.puerto];
  if (kind === "puertoRound15") return [p.puerto, p.southGeorgia, p.elephant, p.sound, p.peninsula, p.shetland, p.drake, p.puerto];
  return [p.kgi, p.sound, p.peninsula, p.shetland, p.kgi];
}

function routeLabels(kind) {
  const labels = [
    ["乔治王岛", 630, 122],
    ["南极海峡", 546, 242],
    ["南极半岛", 462, 380],
    ["南设得兰群岛", 608, 260],
    ["德雷克海峡", 652, 426],
    ["威廉斯港", 735, 515],
  ];
  if (kind === "puertoRound18") return [...labels, ["福克兰群岛", 778, 356], ["南乔治亚", 575, 366], ["象岛", 555, 302]];
  if (kind === "puertoRound15") return [...labels, ["南乔治亚", 575, 366], ["象岛", 555, 302]];
  return labels;
}

function buildMap(voyage) {
  const points = routePoints(voyage.routeKind);
  const path = points.map(([x, y], idx) => `${idx ? "L" : "M"} ${x} ${y}`).join(" ");
  const labelNodes = routeLabels(voyage.routeKind)
    .map(
      ([label, x, y]) => `
        <g>
          <circle cx="${x}" cy="${y}" r="9" fill="#003066" stroke="#ffffff" stroke-width="4"/>
          <text x="${x + 16}" y="${y - 12}" class="label">${label}</text>
        </g>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 620" role="img" aria-labelledby="title desc">
  <title id="title">${titleFor(voyage)} 航线图</title>
  <desc id="desc">${routeTitleFor(voyage.routeKind)}，航次 ${voyage.code}，${dateRange(voyage)}</desc>
  <defs>
    <linearGradient id="sea" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#d9edf7"/>
      <stop offset="1" stop-color="#eef7fb"/>
    </linearGradient>
  </defs>
  <rect width="960" height="620" rx="28" fill="url(#sea)"/>
  <path d="M0 462 C120 418 210 472 312 430 C430 380 520 505 635 470 C770 428 832 520 960 476 L960 620 L0 620 Z" fill="#d6e2e5"/>
  <path d="${path}" fill="none" stroke="#003066" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 15"/>
  <path d="${path}" fill="none" stroke="#c8a45d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  ${labelNodes}
  <g transform="translate(54 58)">
    <rect width="510" height="106" rx="18" fill="#ffffff" opacity=".92"/>
    <text x="24" y="36" class="kicker">SILVERSEA EXPEDITION</text>
    <text x="24" y="65" class="title">${routeTitleFor(voyage.routeKind)}</text>
    <text x="24" y="90" class="small">Voyage ${voyage.code} · ${dateRange(voyage)}</text>
  </g>
  <text x="54" y="572" class="small">航线示意按银海官网港口顺序整理；具体登陆点与活动以船长、探险队长及天气海况安排为准。</text>
  <style>
    .title { font: 600 22px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; fill: #102233; }
    .kicker { font: 700 13px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; letter-spacing: .12em; fill: #8b6a28; }
    .label { font: 600 17px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; fill: #0f2638; paint-order: stroke; stroke: #fff; stroke-width: 5px; stroke-linejoin: round; }
    .small { font: 15px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; fill: #415668; }
  </style>
</svg>`;
}

async function syncProducts() {
  const products = JSON.parse(await readFile(productsPath, "utf8"));
  const withoutSilversea = products.filter((product) => !product.slug.startsWith("silversea-"));
  const insertionIndex = withoutSilversea.findLastIndex((product) => product.category === "ticket") + 1;
  const newProducts = voyages.map(buildProduct);
  withoutSilversea.splice(insertionIndex, 0, ...newProducts);
  await writeFile(productsPath, `${JSON.stringify(withoutSilversea, null, 2)}\n`);
}

async function syncDetails() {
  await mkdir(detailsDir, { recursive: true });
  for (const voyage of voyages) {
    const tripDir = join(publicTripsDir, voyage.slug);
    await mkdir(tripDir, { recursive: true });
    await copyFile(join(sourceAssetDir, assets.hero), join(tripDir, assets.hero));
    for (const file of assets.gallery) {
      await copyFile(join(sourceAssetDir, file), join(tripDir, file));
    }
    await writeFile(join(tripDir, "route-map.svg"), buildMap(voyage));
    await writeFile(join(detailsDir, `${voyage.slug}.json`), `${JSON.stringify(detailFor(voyage), null, 2)}\n`);
  }
}

async function ensureExistingRouteMaps() {
  const patches = [
    {
      slug: "260602西格陵兰冰川峡湾之旅",
      src: "/trips/260602西格陵兰冰川峡湾之旅/route-map.jpeg",
      alt: "西格陵兰冰川峡湾之旅 航线图",
      caption: "西格陵兰冰川峡湾之旅 · 航线示意",
    },
    {
      slug: "260613巡游西格陵兰冰川与文明",
      src: "/trips/260613巡游西格陵兰冰川与文明/route-map.png",
      alt: "巡游西格陵兰冰川与文明 航线图",
      caption: "巡游西格陵兰冰川与文明 · 航线示意",
    },
    {
      slug: "26年9月28日至10月14日17天夏古号极地奥德赛北极三岛-冰岛-东北格陵兰国家公园-斯瓦尔巴群岛",
      src: "/trips/26年9月28日至10月14日17天夏古号极地奥德赛北极三岛-冰岛-东北格陵兰国家公园-斯瓦尔巴群岛/route-map.png",
      alt: "夏古号极地奥德赛北极三岛 航线图",
      caption: "极地奥德赛北极三岛 · 航线示意",
    },
  ];

  for (const patch of patches) {
    const file = join(detailsDir, `${patch.slug}.json`);
    const publicFile = join(root, "public", patch.src);
    if (!existsSync(file) || !existsSync(publicFile)) continue;
    const detail = JSON.parse(await readFile(file, "utf8"));
    detail.routeMap ??= {
      src: patch.src,
      alt: patch.alt,
      caption: patch.caption,
    };
    await writeFile(file, `${JSON.stringify(detail, null, 2)}\n`);
  }
}

await syncProducts();
await syncDetails();
await ensureExistingRouteMaps();

console.log(`Synced ${voyages.length} Silversea ticket SKUs from the latest workbook.`);
