import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public", "trips");
const detailsDir = join(root, "data", "details");
const sourceAssetDir = join(
  publicDir,
  "2027-2-2-2-16飞跃德雷克-南极过大年-11晚15天-银海奋进号",
);

const assets = {
  hero: "hero.jpg",
  gallery: ["gallery-01.jpg", "gallery-02.jpg", "gallery-03.jpg"],
};

const shipDetails = {
  endeavour: {
    name: "Silver Endeavour 银海奋进号",
    intro:
      "Silver Endeavour 是银海邮轮旗下奢华探险船，服务南极飞航与高纬度探险航线。船上以全套房、管家服务、精致餐饮、观景空间、探险队讲座和 Zodiac 冲锋艇登陆/巡游为核心体验，适合希望在南极保持高舒适度的客人。",
    specs: [
      ["船司", "Silversea 银海邮轮"],
      ["载客 / 船员", "约 220 位客人 / 207 名船员"],
      ["船型", "奢华探险邮轮"],
      ["航线定位", "南极飞航、南极半岛与高纬度探险"],
      ["航次服务", "全套房、管家服务、探险队、Zodiac 冲锋艇"],
    ],
    facilities: [
      "Butler service for every suite 管家服务",
      "24 小时套房内餐饮服务",
      "多餐厅开放式用餐与精选饮品",
      "Explorer Lounge 探索厅与目的地讲座",
      "Observation Lounge 观景廊与图书馆",
      "Mud Room 泥房，方便极地登陆装备管理",
      "Otium Spa、水疗、健身中心、精品店与户外甲板",
    ],
  },
  wind: {
    name: "Silver Wind 银海迎风号",
    intro:
      "Silver Wind 是银海邮轮旗下经过极地化升级的探险船，兼具小型船深入航行能力与银海式全包奢华服务。船上配备 Zodiac 冲锋艇、探险队、餐厅、酒吧、健身及公共休闲空间，适合南极半岛、德雷克海峡与南设得兰群岛航线。",
    specs: [
      ["船司", "Silversea 银海邮轮"],
      ["载客 / 船员", "约 274 位客人 / 239 名船员"],
      ["船型", "极地化升级奢华探险船"],
      ["航线定位", "南极半岛、南设得兰群岛、德雷克海峡"],
      ["航次服务", "全套房、管家服务、探险队、Zodiac 冲锋艇"],
    ],
    facilities: [
      "Butler service for every suite 管家服务",
      "24 小时套房内餐饮服务",
      "开放式用餐、精选酒水与船上娱乐",
      "探险队讲座与 Zodiac 冲锋艇活动",
      "观景甲板、餐厅、酒吧、健身与休闲空间",
      "适合南极半岛登陆、巡游和德雷克海峡航行",
    ],
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
  {
    title: "报名准备",
    bullets: [
      "请提前确认护照、签证、保险、国际段机票和前后住宿安排。",
      "极地航线需遵守 IAATO/船司登陆规范，听从船上安全说明。",
      "飞航航线可能因天气产生延误或调整，建议预留充足前后缓冲时间。",
    ],
  },
];

const voyages = [
  {
    slug: "silversea-ev261020006",
    code: "EV261020006",
    title: "King George Island to King George Island",
    titleCn: "银海奋进号 · 南极半岛飞航 6天",
    subtitle: "双飞6天",
    routeKind: "kgiRound6",
    shipKind: "endeavour",
    shipName: "Silver Endeavour 银海奋进号",
    dateRange: "2026.10.20 — 2026.10.26",
    startLabel: "10月20日",
    endLabel: "10月26日",
    sourceUrl:
      "https://www.silversea.com/destinations/antarctica-cruise/king-george-island-to-king-george-island-ev261020006.html",
    intro:
      "银海页面描述该飞航航程可避开长时间海上穿越，直接进入南极核心区域；航程将从乔治王岛出发，驶向南极海峡、南极半岛与南设得兰群岛，重点观察海豹、企鹅、冰山、山峰、海鸟群落和鲸类。",
    itinerary: [
      ["1", "10月20日", "King George Island, Antarctica", "00:00 - 18:00", "乔治王岛登船，飞航进入南极区域，开启银海奋进号南极半岛单船票航程。"],
      ["2", "10月21日", "Antarctic Sound, Antarctica", "00:00 - 00:00", "航行至南极海峡，欣赏冰山水道和极地海鸟，船司页面标注可参考 2 项探险活动。"],
      ["3", "10月22日", "Antarctic Peninsula, Antarctica", "00:00 - 00:00", "探索南极半岛，视天气安排 Zodiac 巡游、登陆、野生动物观察和探险队讲解。"],
      ["4", "10月23日", "Antarctic Peninsula, Antarctica", "00:00 - 00:00", "继续南极半岛区域探索，在山峰、冰川和浮冰之间寻找企鹅、海豹和鲸类。"],
      ["5", "10月24日", "Antarctic Peninsula, Antarctica", "00:00 - 00:00", "继续半岛巡游或登陆，具体登陆点和活动由船长与探险队长决定。"],
      ["6", "10月25日", "South Shetland Islands, Antarctica", "00:00 - 00:00", "抵达南设得兰群岛，船司页面标注可参考 1 项探险活动。"],
      ["7", "10月26日", "King George Island, Antarctica", "05:30 - 00:00", "返回乔治王岛离船，结束南极飞航单船票航段。"],
    ],
  },
  {
    slug: "silversea-ev261026006",
    code: "EV261026006",
    title: "King George Island to King George Island",
    titleCn: "银海奋进号 · 南极半岛飞航 6天",
    subtitle: "双飞6天",
    routeKind: "kgiRound6",
    shipKind: "endeavour",
    shipName: "Silver Endeavour 银海奋进号",
    dateRange: "2026.10.26 — 2026.11.01",
    startLabel: "10月26日",
    endLabel: "11月1日",
    sourceUrl:
      "https://www.silversea.com/destinations/antarctica-cruise/king-george-island-to-king-george-island-ev261026006.html",
    intro:
      "该航次为乔治王岛往返南极飞航线，线路结构与银海南极短线飞航一致：乔治王岛登船，依次探索南极海峡、南极半岛与南设得兰群岛，再返回乔治王岛。",
    itinerary: shiftedRound6("10月26日", "10月27日", "10月28日", "10月29日", "10月30日", "10月31日", "11月1日"),
  },
  {
    slug: "silversea-ev261101006",
    code: "EV261101006",
    title: "King George Island to King George Island",
    titleCn: "银海奋进号 · 南极半岛飞航 6天",
    subtitle: "双飞6天",
    routeKind: "kgiRound6",
    shipKind: "endeavour",
    shipName: "Silver Endeavour 银海奋进号",
    dateRange: "2026.11.01 — 2026.11.07",
    startLabel: "11月1日",
    endLabel: "11月7日",
    sourceUrl:
      "https://www.silversea.com/destinations/antarctica-cruise/king-george-island-to-king-george-island-ev261101006.html",
    intro:
      "该航次为乔治王岛往返南极飞航线，适合用较短假期进入南极半岛核心区域，重点体验南极海峡、半岛冰山水道、企鹅与鲸类观察。",
    itinerary: shiftedRound6("11月1日", "11月2日", "11月3日", "11月4日", "11月5日", "11月6日", "11月7日"),
  },
  {
    slug: "silversea-ev261107006",
    code: "EV261107006",
    title: "King George Island to King George Island",
    titleCn: "银海奋进号 · 南极半岛飞航 6天",
    subtitle: "双飞6天",
    routeKind: "kgiRound6",
    shipKind: "endeavour",
    shipName: "Silver Endeavour 银海奋进号",
    dateRange: "2026.11.07 — 2026.11.13",
    startLabel: "11月7日",
    endLabel: "11月13日",
    sourceUrl:
      "https://www.silversea.com/destinations/antarctica-cruise/king-george-island-to-king-george-island-ev261107006.html",
    intro:
      "该航次为银海奋进号南极半岛飞航短线，乔治王岛往返，核心游览南极海峡、南极半岛与南设得兰群岛。",
    itinerary: shiftedRound6("11月7日", "11月8日", "11月9日", "11月10日", "11月11日", "11月12日", "11月13日"),
  },
  {
    slug: "silversea-ev261119006",
    code: "EV261119006",
    title: "King George Island to King George Island",
    titleCn: "银海奋进号 · 南极半岛飞航 6天",
    subtitle: "双飞6天",
    routeKind: "kgiRound6",
    shipKind: "endeavour",
    shipName: "Silver Endeavour 银海奋进号",
    dateRange: "2026.11.19 — 2026.11.25",
    startLabel: "11月19日",
    endLabel: "11月25日",
    sourceUrl:
      "https://www.silversea.com/destinations/antarctica-cruise/king-george-island-to-king-george-island-ev261119006.html",
    intro:
      "该航次为乔治王岛往返银海飞航单船票，以短线方式进入南极半岛，减少传统德雷克海峡海上通勤时间。",
    itinerary: shiftedRound6("11月19日", "11月20日", "11月21日", "11月22日", "11月23日", "11月24日", "11月25日"),
  },
  {
    slug: "silversea-wi261204008",
    code: "WI261204008",
    title: "King George Island to Puerto Williams",
    titleCn: "银海迎风号 · 乔治王岛至威廉斯港 8天",
    subtitle: "双飞8天",
    routeKind: "kgiToPuerto",
    shipKind: "wind",
    shipName: "Silver Wind 银海迎风号",
    dateRange: "2026.12.04 — 2026.12.12",
    startLabel: "12月4日",
    endLabel: "12月12日",
    sourceUrl:
      "https://www.silversea.com/destinations/antarctica-cruise/king-george-island-to-puerto-williams-wi261204008.html",
    intro:
      "银海页面描述这是一条从乔治王岛进入南极，再经德雷克海峡前往威廉斯港的探险航程。线路包含南极海峡、南极半岛、南设得兰群岛、德雷克海峡和智利威廉斯港。",
    itinerary: [
      ["1", "12月4日", "King George Island, Antarctica", "00:00 - 18:00", "乔治王岛登船，开启银海迎风号南极单船票航段。"],
      ["2", "12月5日", "Antarctic Sound, Antarctica", "00:00 - 00:00", "航行至南极海峡，银海页面标注可参考 2 项探险活动。"],
      ["3", "12月6日", "Antarctic Peninsula, Antarctica", "00:00 - 00:00", "探索南极半岛，参加探险队安排的巡游、登陆或徒步活动。"],
      ["4", "12月7日", "Antarctic Peninsula, Antarctica", "00:00 - 00:00", "继续南极半岛区域探索，观察冰山、企鹅、鲸类和雪山景观。"],
      ["5", "12月8日", "Antarctic Peninsula, Antarctica", "00:00 - 00:00", "半岛深度探索，活动以天气、冰况和船长安排为准。"],
      ["6", "12月9日", "South Shetland Islands, Antarctica", "18:30 - 18:30", "抵达南设得兰群岛，银海页面标注可参考 1 项探险活动。"],
      ["7", "12月10日", "Drake Passage", "00:00 - 00:00", "穿越德雷克海峡，进入国际水域航行日。"],
      ["8", "12月11日", "Puerto Williams, Chile", "22:00 - 00:00", "抵达智利威廉斯港。"],
      ["9", "12月12日", "Puerto Williams, Chile", "00:00 - 00:00", "威廉斯港离船，结束邮轮航段。"],
    ],
  },
  {
    slug: "silversea-ev261219008",
    code: "EV261219008",
    title: "King George Island to King George Island",
    titleCn: "银海奋进号 · 南极白色圣诞 8天",
    subtitle: "双飞8天",
    routeKind: "kgiRound8",
    shipKind: "endeavour",
    shipName: "Silver Endeavour 银海奋进号",
    dateRange: "2026.12.19 — 2026.12.27",
    startLabel: "12月19日",
    endLabel: "12月27日",
    sourceUrl:
      "https://www.silversea.com/destinations/antarctica-cruise/king-george-island-to-king-george-island-ev261219008.html",
    intro:
      "银海页面将该航次描述为南极半岛白色圣诞档：在冰川、雪山和蓝色冰山之间探索企鹅、信天翁和鲸类，并通过 Zodiac 探险和徒步活动体验南极与南设得兰群岛。",
    itinerary: [
      ["1", "12月19日", "King George Island, Antarctica", "00:00 - 18:00", "乔治王岛登船，开启南极圣诞档飞航单船票。"],
      ["2", "12月20日", "Antarctic Sound, Antarctica", "00:00 - 00:00", "航行至南极海峡，银海页面标注可参考 2 项探险活动。"],
      ["3", "12月21日", "Antarctic Peninsula, Antarctica", "00:00 - 00:00", "探索南极半岛，近距离感受冰川、雪山和海冰景观。"],
      ["4", "12月22日", "Antarctic Peninsula, Antarctica", "00:00 - 00:00", "继续南极半岛区域巡游或登陆，观察企鹅、海鸟与鲸类。"],
      ["5", "12月23日", "Antarctic Peninsula, Antarctica", "00:00 - 00:00", "半岛探索日，活动以探险队长和天气海况安排为准。"],
      ["6", "12月24日", "Antarctic Peninsula, Antarctica", "00:00 - 00:00", "南极半岛巡游或登陆，继续探索冰川与蓝色冰山。"],
      ["7", "12月25日", "Antarctic Peninsula, Antarctica", "00:00 - 00:00", "圣诞日沉浸南极荒野，体验 Zodiac 探险和导览徒步。"],
      ["8", "12月26日", "South Shetland Islands, Antarctica", "00:00 - 00:00", "抵达南设得兰群岛，银海页面标注可参考 1 项探险活动。"],
      ["9", "12月27日", "King George Island, Antarctica", "05:30 - 00:00", "返回乔治王岛离船，结束航段。"],
    ],
  },
  {
    slug: "silversea-wi270106009",
    code: "WI270106009",
    title: "Puerto Williams to King George Island",
    titleCn: "银海迎风号 · 威廉斯港至乔治王岛 9天",
    subtitle: "单飞9天",
    routeKind: "puertoToKgi",
    shipKind: "wind",
    shipName: "Silver Wind 银海迎风号",
    dateRange: "2027.01.06 — 2027.01.15",
    startLabel: "1月6日",
    endLabel: "1月15日",
    sourceUrl:
      "https://www.silversea.com/destinations/antarctica-cruise/puerto-williams-to-king-george-island-wi270106009.html",
    intro:
      "银海页面描述这条 9 天航程从威廉斯港启程，穿越德雷克海峡进入南极海域，探索南极海峡、南极半岛和南设得兰群岛，最后在乔治王岛离船。",
    itinerary: [
      ["1", "1月6日", "Puerto Williams, Chile", "00:00 - 21:00", "威廉斯港登船，开启银海迎风号南极单飞单船票航段。"],
      ["2", "1月7日", "Drake Passage", "00:00 - 00:00", "德雷克海峡航行，进入国际水域。"],
      ["3", "1月8日", "Drake Passage", "00:00 - 00:00", "继续德雷克海峡航行，参加船上讲座和探险准备。"],
      ["4", "1月9日", "Antarctic Sound, Antarctica", "05:00 - 05:00", "抵达南极海峡，银海页面标注可参考 2 项探险活动。"],
      ["5", "1月10日", "Antarctic Peninsula, Antarctica", "00:00 - 00:00", "探索南极半岛，观察冰川、雪山、海冰和野生动物。"],
      ["6", "1月11日", "Antarctic Peninsula, Antarctica", "00:00 - 00:00", "继续南极半岛巡游或登陆，活动以船长与探险队长安排为准。"],
      ["7", "1月12日", "Antarctic Peninsula, Antarctica", "00:00 - 00:00", "半岛深度探索，寻找鲸类、企鹅、信天翁与海豹。"],
      ["8", "1月13日", "Antarctic Peninsula, Antarctica", "00:00 - 00:00", "继续南极半岛区域探索，体验极地荒野景观。"],
      ["9", "1月14日", "South Shetland Islands, Antarctica", "00:00 - 00:00", "抵达南设得兰群岛。"],
      ["10", "1月15日", "King George Island, Antarctica", "00:00 - 00:00", "乔治王岛离船，结束邮轮航段。"],
    ],
  },
];

function shiftedRound6(...dates) {
  return [
    ["1", dates[0], "King George Island, Antarctica", "00:00 - 18:00", "乔治王岛登船，开启银海奋进号南极半岛飞航航段。"],
    ["2", dates[1], "Antarctic Sound, Antarctica", "00:00 - 00:00", "航行至南极海峡，欣赏冰山水道和极地海鸟，船司页面标注可参考 2 项探险活动。"],
    ["3", dates[2], "Antarctic Peninsula, Antarctica", "00:00 - 00:00", "探索南极半岛，视天气安排 Zodiac 巡游、登陆、野生动物观察和探险队讲解。"],
    ["4", dates[3], "Antarctic Peninsula, Antarctica", "00:00 - 00:00", "继续南极半岛区域探索，在山峰、冰川和浮冰之间寻找企鹅、海豹和鲸类。"],
    ["5", dates[4], "Antarctic Peninsula, Antarctica", "00:00 - 00:00", "继续半岛巡游或登陆，具体登陆点和活动由船长与探险队长决定。"],
    ["6", dates[5], "South Shetland Islands, Antarctica", "00:00 - 00:00", "抵达南设得兰群岛，船司页面标注可参考 1 项探险活动。"],
    ["7", dates[6], "King George Island, Antarctica", "05:30 - 00:00", "返回乔治王岛离船，结束南极飞航单船票航段。"],
  ];
}

function routePoints(kind) {
  const base = {
    kgi: [625, 128],
    sound: [545, 244],
    peninsula: [458, 378],
    shetland: [608, 255],
    puerto: [725, 520],
    drake: [645, 430],
  };
  if (kind === "kgiToPuerto") return [base.kgi, base.sound, base.peninsula, base.shetland, base.drake, base.puerto];
  if (kind === "puertoToKgi") return [base.puerto, base.drake, base.sound, base.peninsula, base.shetland, base.kgi];
  return [base.kgi, base.sound, base.peninsula, base.shetland, base.kgi];
}

function routeLabels(kind) {
  if (kind === "kgiToPuerto") {
    return [
      ["乔治王岛", 625, 128],
      ["南极海峡", 545, 244],
      ["南极半岛", 458, 378],
      ["南设得兰群岛", 608, 255],
      ["德雷克海峡", 645, 430],
      ["威廉斯港", 725, 520],
    ];
  }
  if (kind === "puertoToKgi") {
    return [
      ["威廉斯港", 725, 520],
      ["德雷克海峡", 645, 430],
      ["南极海峡", 545, 244],
      ["南极半岛", 458, 378],
      ["南设得兰群岛", 608, 255],
      ["乔治王岛", 625, 128],
    ];
  }
  return [
    ["乔治王岛", 625, 128],
    ["南极海峡", 545, 244],
    ["南极半岛", 458, 378],
    ["南设得兰群岛", 608, 255],
  ];
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
  <title id="title">${voyage.titleCn} 航线图</title>
  <desc id="desc">${voyage.title}，航次 ${voyage.code}，${voyage.dateRange}</desc>
  <defs>
    <linearGradient id="sea" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#d9edf7"/>
      <stop offset="1" stop-color="#eef7fb"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#0d2b45" flood-opacity=".18"/>
    </filter>
  </defs>
  <rect width="960" height="620" rx="28" fill="url(#sea)"/>
  <path d="M0 462 C120 418 210 472 312 430 C430 380 520 505 635 470 C770 428 832 520 960 476 L960 620 L0 620 Z" fill="#d6e2e5"/>
  <path d="M96 70 C220 38 326 82 435 58 C545 34 650 52 790 82" fill="none" stroke="#ffffff" stroke-width="26" opacity=".45"/>
  <path d="M160 542 C230 500 318 510 400 548 C485 588 584 558 648 522" fill="none" stroke="#ffffff" stroke-width="20" opacity=".5"/>
  <g opacity=".74">
    <path d="M650 70 C704 106 696 156 654 184 C618 208 584 184 575 148 C568 111 604 78 650 70 Z" fill="#f8fbfd"/>
    <path d="M437 272 C472 246 526 268 536 316 C552 392 478 465 420 474 C360 482 322 438 347 386 C366 344 382 302 437 272 Z" fill="#f8fbfd"/>
    <path d="M726 490 C778 472 824 504 834 545 C790 570 742 570 705 546 C688 531 696 501 726 490 Z" fill="#f8fbfd"/>
  </g>
  <path d="${path}" fill="none" stroke="#003066" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 15" filter="url(#soft)"/>
  <path d="${path}" fill="none" stroke="#c8a45d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  ${labelNodes}
  <g transform="translate(54 58)">
    <rect width="440" height="102" rx="18" fill="#ffffff" opacity=".92"/>
    <text x="24" y="36" class="kicker">SILVERSEA EXPEDITION</text>
    <text x="24" y="65" class="title">${voyage.title}</text>
    <text x="24" y="88" class="small">Voyage ${voyage.code} · ${voyage.dateRange}</text>
  </g>
  <text x="54" y="572" class="small">航线示意按银海官网港口顺序整理；具体登陆点与活动以船长、探险队长及天气海况安排为准。</text>
  <style>
    .title { font: 600 22px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; fill: #102233; }
    .kicker { font: 700 13px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; letter-spacing: .12em; fill: #8b6a28; }
    .label { font: 600 18px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; fill: #0f2638; paint-order: stroke; stroke: #fff; stroke-width: 5px; stroke-linejoin: round; }
    .small { font: 15px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; fill: #415668; }
  </style>
</svg>`;
}

function detailFor(voyage) {
  const ship = shipDetails[voyage.shipKind];
  const routeMap = `/trips/${voyage.slug}/route-map.svg`;
  const heroImage = `/trips/${voyage.slug}/hero.jpg`;
  const gallery = assets.gallery.map((file, index) => ({
    src: `/trips/${voyage.slug}/${file}`,
    alt: `${voyage.titleCn} 航程图片 ${index + 1}`,
    caption: ["南极半岛冰山与探险船", "极地登陆与巡游体验", "南极海域野生动物与冰川景观"][index],
  }));

  return {
    titleEn: voyage.title.toUpperCase(),
    subtitle: voyage.subtitle,
    tags: ["银海", "单船票", "南极", voyage.subtitle, voyage.shipName],
    heroImage,
    routeMap: {
      src: routeMap,
      alt: `${voyage.titleCn} 航线图`,
      caption: `${voyage.title} · Voyage ${voyage.code} · ${voyage.dateRange}`,
    },
    gallery,
    metaTable: [
      ["船司航次", voyage.code],
      ["银海航线", voyage.title],
      ["出行日期", voyage.dateRange],
      ["目的地", "南极半岛 / 南设得兰群岛"],
      ["出行时长", voyage.subtitle.replace(/[^\d]/g, "") ? `${voyage.subtitle.match(/\d+天/)?.[0] ?? voyage.subtitle}` : voyage.subtitle],
      ["邮轮", voyage.shipName],
      ["航线来源", voyage.sourceUrl],
    ],
    cabins: [
      { name: "Vista / Classic / Superior / Deluxe 等套房", spec: "具体开放舱型以银海实时库存为准", price: "价格咨询" },
      { name: "Veranda / Silver / Medallion / Owner 等套房", spec: "不同航次和舱型价格差异较大，请顾问实时确认", price: "价格咨询" },
    ],
    highlightSections: [
      {
        title: "银海官网航线摘要",
        content: voyage.intro,
      },
      {
        title: "飞航与单船票优势",
        bullets: [
          "适合已自行安排国际段、签证和前后住宿，只需要预订邮轮航段的客人。",
          "飞航航线可减少或优化德雷克海峡长距离海上航行时间，具体飞行与接驳以船司安排为准。",
          "银海全包式船上服务包含管家服务、餐饮、精选饮品、Wi-Fi 和船上小费等项目（以船司条款为准）。",
        ],
      },
      {
        title: "南极半岛体验",
        bullets: [
          "南极海峡、南极半岛、南设得兰群岛或德雷克海峡为主要航行区域。",
          "常见体验包括 Zodiac 巡游、登陆、探险队讲座、观鸟、观鲸、企鹅和海豹观察。",
          "所有登陆点、活动和时间均由船长及探险队长依据安全、天气、冰况和环保规范最终安排。",
        ],
      },
    ],
    itinerary: voyage.itinerary.map(([day, date, title, meta, content]) => ({ day, date, title, meta, content })),
    itineraryNote:
      "行程按银海官网航次页面整理；港口、时间、探险活动和飞航衔接可能因天气、冰况、机场与船司调度调整。",
    shipDetail: {
      ...ship,
      cabins: [
        { name: "套房舱位", spec: "银海全套房设计，具体舱型、面积、楼层、阳台和权益以该航次实时舱位为准。", price: "价格咨询" },
      ],
    },
    feeIncluded: commonIncluded,
    feeExcluded: commonExcluded,
    noticeSections,
  };
}

await mkdir(detailsDir, { recursive: true });

for (const voyage of voyages) {
  const tripDir = join(publicDir, voyage.slug);
  await mkdir(tripDir, { recursive: true });
  await copyFile(join(sourceAssetDir, assets.hero), join(tripDir, assets.hero));
  for (const file of assets.gallery) {
    await copyFile(join(sourceAssetDir, file), join(tripDir, file));
  }
  await writeFile(join(tripDir, "route-map.svg"), buildMap(voyage));
  await writeFile(join(detailsDir, `${voyage.slug}.json`), `${JSON.stringify(detailFor(voyage), null, 2)}\n`);
}

console.log(`Seeded ${voyages.length} Silversea ticket detail files.`);
