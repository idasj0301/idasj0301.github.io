/**
 * 无 PPT 时的详情骨架（与海神号双岛页同版式字段）
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHIP_PROFILES_DIR = join(root, "data/ship-profiles");

const TITLE_EN = {
  antarctic: "ANTARCTICA EXPEDITION",
  arctic: "ARCTIC EXPEDITION",
  galapagos: "GALAPAGOS · ECUADOR",
  "light-expedition": "LIGHT EXPEDITION",
  ticket: "EXPEDITION CRUISE TICKET",
};

const SHIP_MATCH = [
  ["海神", "seaventure"],
  ["Seaventure", "seaventure"],
  ["环球领航", "atlas"],
  ["World Navigator", "atlas"],
  ["庞洛", "ponant"],
  ["银海", "silversea"],
  ["夏古", "ponant"],
];

export function formatRange(p) {
  const start = new Date(`${p.departureDate}T12:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + (p.durationDays || 1) - 1);
  const fmt = (d) =>
    `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  return `${fmt(start)} — ${fmt(end)}`;
}

export function formatPriceLabel(priceFrom) {
  if (priceFrom > 0) return `¥${priceFrom.toLocaleString("zh-CN")} 起`;
  return "价格咨询";
}

function loadShipProfile(shipName) {
  let id;
  for (const [k, v] of SHIP_MATCH) {
    if (shipName?.includes(k)) {
      id = v;
      break;
    }
  }
  if (!id) return null;
  const path = join(SHIP_PROFILES_DIR, `${id}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function expandItinerary(p) {
  const base = p.itinerary || [];
  if (base.length >= 5) {
    return base.map((d) => ({
      day: String(d.day),
      title: d.title,
      content: d.content,
    }));
  }
  const total = p.durationDays || 10;
  const start = new Date(`${p.departureDate}T12:00:00`);
  const fmtMd = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;
  const steps = Math.min(8, Math.max(5, Math.floor(total / 3)));
  const items = [];
  for (let i = 0; i < steps; i++) {
    const dayNum = i === 0 ? 1 : i === steps - 1 ? total : Math.round((total * i) / (steps - 1));
    const d = new Date(start);
    d.setDate(d.getDate() + dayNum - 1);
    const b = base[Math.min(i, base.length - 1)];
    items.push({
      day: i === 0 ? "1" : i === steps - 1 ? String(total) : String(dayNum),
      date: fmtMd(d),
      title: b?.title || (i === 0 ? "启程" : i === steps - 1 ? "返程" : "行程第 " + dayNum + " 天"),
      content:
        b?.content ||
        (i === 0
          ? "国际航班/转机抵达出发城市，行前说明与休整。"
          : i === steps - 1
            ? "结束行程，返回国内。"
            : "邮轮巡游与登陆探索（以实际船期为准）。"),
    });
  }
  return items;
}

function highlightFromProduct(p) {
  const raw = p.highlights?.length ? p.highlights : [];
  const chunks = [
    p.overview,
    p.summary,
    ...raw,
  ].filter(Boolean);
  const texts = chunks.length ? chunks : ["船客甄选航程，具体亮点以方案为准。"];
  while (texts.length < 5) {
    texts.push(
      texts.length === 1
        ? "专业探险领队与冲锋艇登陆（以船期为准）。"
        : texts.length === 2
          ? "中文服务与行前说明，适合首次或深度旅客。"
          : texts.length === 3
            ? "具体登陆点与活动以探险队长及天气海况最终安排为准。"
            : "咨询行程、舱房与签证细节，请通过官网「直连顾问」联系船客顾问。",
    );
  }
  return texts.slice(0, 8).map((text, i) => {
    const t = String(text).trim();
    const shortTitle = t.length <= 24 ? t : t.slice(0, 22) + "…";
    if (t.includes("；") || t.length > 80) {
      const bullets = t.split(/[；;]/).map((x) => x.trim()).filter((x) => x.length > 6);
      if (bullets.length >= 2) return { title: shortTitle, bullets };
    }
    return { title: i === 0 ? "航程亮点" : shortTitle, content: t };
  });
}

export function buildFallbackDetail(p, routeMap) {
  const profile = loadShipProfile(p.shipName);
  const priceText = formatPriceLabel(p.priceFrom || 0);
  const cabins = [];
  if (p.priceFrom > 0) {
    cabins.push({
      name: "参考舱位",
      spec: "以方案与合同为准",
      price: priceText,
      soldOut: false,
    });
  }

  const metaTable = [
    ["出行日期", formatRange(p)],
    ["目的地", p.subcategory || p.tags?.slice(0, 2).join("、") || "见行程"],
    ["出行时长", `${p.durationDays} 天`],
    ["线路特点", p.subcategory || "轻探险"],
    ["团队规模", p.category === "antarctic" || p.category === "arctic" ? "包船/精品团" : "精品小团"],
    ["邮轮 / 交通", p.shipName],
  ];

  const shipDetail = profile
    ? {
        name: profile.vesselName || p.shipName,
        intro:
          profile.tagline +
          (profile.sections?.[0]?.content ? ` ${profile.sections[0].content.slice(0, 160)}` : ""),
        specs: profile.specs,
        facilities: profile.facilities,
        cabins: (profile.cabins || []).map((c) => ({
          name: c.name,
          spec: c.spec,
          price: c.note || priceText,
        })),
      }
    : {
        name: p.shipName,
        intro: p.ship || `${p.shipName}，舱位与设施以签约方案为准。`,
        cabins: cabins.map((c) => ({ name: c.name, spec: c.spec, price: c.price })),
      };

  const detail = {
    titleEn: TITLE_EN[p.category],
    subtitle: p.subcategory || p.shipName,
    tags: [...new Set([...(p.tags || []), p.subcategory].filter(Boolean))].slice(0, 5),
    metaTable,
    cabins,
    highlightSections: highlightFromProduct(p),
    itinerary: expandItinerary(p),
    itineraryNote:
      "行程顺序与登陆点可能因天气、冰况、海况由探险队长调整，以船上通知为准。",
    shipDetail,
    feeIncluded: [
      "具体包含项目以签约合同及船客顾问书面报价为准",
      "通常为船上指定舱位、标注餐食与探险活动（如有）",
      "国际段机票、签证、保险是否包含请向顾问确认",
    ],
    feeExcluded: [
      p.feeNote || "国际机票、签证、保险、小费及个人消费通常另计",
      "未列明项目、单房差、自愿付费活动请咨询顾问",
    ],
    noticeSections: [
      {
        title: "报名须知",
        content:
          p.notice ||
          "极地/探险旅行受天气、冰况、海况影响，行程可能调整；请提前办理签证并购买符合要求的保险。",
      },
      {
        title: "预定政策",
        bullets: [
          "预订需支付定金锁定舱位，具体比例以合同为准",
          "出发前按合同约定付清尾款",
        ],
      },
      {
        title: "签证说明",
        content: "签证要求因目的地而异，请向船客顾问确认最新政策与办理周期。",
      },
    ],
  };

  if (routeMap) detail.routeMap = routeMap;
  const tripDir = join(root, "public/trips", p.slug);
  if (existsSync(tripDir)) {
    for (const name of ["hero.jpg", "hero.png", "hero.webp"]) {
      if (existsSync(join(tripDir, name))) {
        detail.heroImage = `/trips/${p.slug}/${name}`;
        break;
      }
    }
  }
  if (profile?.gallery?.length) detail.gallery = profile.gallery.slice(0, 6);

  return detail;
}

export function detailScore(d) {
  let s = 0;
  s += (d.highlightSections?.length || 0) * 3;
  s += (d.itinerary?.length || 0) * 2;
  s += d.feeIncluded?.length || 0;
  s += d.feeExcluded?.length || 0;
  s += (d.noticeSections?.length || 0) * 2;
  s += d.cabins?.length || 0;
  s += d.metaTable?.length >= 5 ? 5 : 0;
  s += d.shipDetail?.specs?.length ? 5 : 0;
  return s;
}

export function isLayoutComplete(d) {
  return (
    (d.metaTable?.length || 0) >= 5 &&
    (d.highlightSections?.length || 0) >= 4 &&
    (d.itinerary?.length || 0) >= 5 &&
    (d.feeIncluded?.length || 0) >= 3 &&
    (d.feeExcluded?.length || 0) >= 2 &&
    (d.noticeSections?.length || 0) >= 3 &&
    Boolean(d.shipDetail?.name)
  );
}
