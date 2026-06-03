/**
 * 从硬盘「船客产品2026」扫描非 TY 的 PPT，生成 data/products.json
 * 仅保留出发日期 >= 2026-06-01 的航程（2026年6月及以后，含2027航次）
 * 用法: node scripts/sync-products-from-drive.mjs
 */
/** 最早出发日：2026 年 6 月 1 日（含 6 月航次；若只要 7 月及以后改为 2026-07-01） */
const MIN_DEPARTURE = "2026-06-01";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const DRIVE = "/Volumes/Ida的硬盘，丢了赔付/船客产品2026";
const OUT = join(root, "data/products.json");
const KEEP_SLUGS = new Set([
  "2026-wangguin-antarctica-22d",
  "2026-arctic-eclipse-three-islands",
  "2026-ecuador-four-worlds",
  "2026-kimberley-wilderness",
]);

const SLUG_BY_FILE = new Map([
  ["2026年11月22日船去飞回双岛/2026.11.22-12.13 飞船游南极·奇遇王企鹅22天.pptx", "2026-wangguin-antarctica-22d"],
  ["2026年7月29日北极三岛日蚀航次/方案/短线/短线-2026.7.29-8.14日全食-巡游北极三岛.pptx", "2026-arctic-eclipse-three-islands"],
  ["2026年8月厄瓜多尔/方案/2026.8.04-08.22 厄瓜多尔.pptx", "2026-ecuador-four-worlds"],
  ["2026年8月金伯利/最后的荒野·奇绝金伯利-2026.8.27-9.7.pptx", "2026-kimberley-wilderness"],
]);

const idSeq = { ant: 0, arc: 0, gal: 0, lex: 0, tkt: 0, shp: 0 };
const prefix = { antarctic: "ant", arctic: "arc", galapagos: "gal", "light-expedition": "lex", ticket: "tkt", ship: "shp" };

function isTy(rel, name) {
  const s = `${rel}/${name}`;
  if (name.startsWith("._")) return true;
  if (/^TY[-\d]/i.test(name)) return true;
  if (/^TY20/i.test(name)) return true;
  if (/TY\.pptx$/i.test(name)) return true;
  if (/\/TY[-/]/i.test(s)) return true;
  if (name.includes("同业")) return true;
  return false;
}

/** 文件夹名含 2026年1–5月 的整夹跳过（如 4 月莱茵河） */
function folderBeforeJune(folderName) {
  const m = folderName.match(/2026年(\d{1,2})月/);
  if (m) {
    const mo = parseInt(m[1], 10);
    if (mo >= 1 && mo < 6) return true;
  }
  return false;
}

function isOnOrAfterMin(dateStr) {
  return dateStr >= MIN_DEPARTURE;
}

function walkPptx(dir, base = dir) {
  const out = [];
  for (const ent of readdirSync(dir)) {
    const p = join(dir, ent);
    if (ent.startsWith(".")) continue;
    const st = statSync(p);
    if (st.isDirectory()) {
      if (ent === "新建文件夹") continue;
      if (base === DRIVE && folderBeforeJune(ent)) continue;
      out.push(...walkPptx(p, base));
    } else if (ent.toLowerCase().endsWith(".pptx")) {
      const rel = relative(base, p).replace(/\\/g, "/");
      if (!isTy(rel, ent)) out.push({ path: p, rel, name: ent });
    }
  }
  return out;
}

const PPT_EXTRACTOR = join(__dirname, "extract-pptx-text.py");

function extractPptText(pptPath) {
  try {
    const raw = execSync(`python3 ${JSON.stringify(PPT_EXTRACTOR)} ${JSON.stringify(pptPath)}`, {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
    return raw.split("---SLIDE---").map((s) => s.replace(/\s+/g, " ").trim());
  } catch {
    return [];
  }
}

/** 从路径/文件名解析出发日（PPT 解析失败时的回退） */
function isValidIsoDate(s) {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const mo = +m[2];
  const da = +m[3];
  return mo >= 1 && mo <= 12 && da >= 1 && da <= 31;
}

function parseDateFromPath(rel, fileName) {
  const s = `${rel}/${fileName}`;
  const m27 = s.match(/2027[./年-]*(\d{1,2})[./月-]*(\d{1,2})/);
  if (m27) return `2027-${m27[1].padStart(2, "0")}-${m27[2].padStart(2, "0")}`;
  const m26 = s.match(/2026[./年-]*(\d{1,2})[./月-]*(\d{1,2})/);
  if (m26) return `2026-${m26[1].padStart(2, "0")}-${m26[2].padStart(2, "0")}`;
  const folder = s.match(/2026年(\d{1,2})月(\d{1,2})?日?/);
  if (folder) {
    const mo = folder[1].padStart(2, "0");
    const da = (folder[2] || "01").padStart(2, "0");
    return `2026-${mo}-${da}`;
  }
  return null;
}

function parseMeta(slides, rel, fileName) {
  const pathDate = parseDateFromPath(rel, fileName);
  const all = slides.join(" ");
  const dec = (s) =>
    s
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ");

  const titleSlide = dec(slides[0] || fileName);
  let departureDate = pathDate && isValidIsoDate(pathDate) ? pathDate : "2026-06-01";
  const dateCandidates = [];
  const addDate = (y, mo, da) => {
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      dateCandidates.push(`${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`);
    }
  };
  for (const m of all.matchAll(/202([67])\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g)) {
    addDate(2020 + +m[1], +m[2], +m[3]);
  }
  for (const m of all.matchAll(/202([67])\.(\d{1,2})\.(\d{1,2})/g)) {
    addDate(2020 + +m[1], +m[2], +m[3]);
  }
  for (const m of all.matchAll(/202([67])\/(\d{1,2})\/(\d{1,2})/g)) {
    addDate(2020 + +m[1], +m[2], +m[3]);
  }
  if (dateCandidates.length) {
    departureDate = [...new Set(dateCandidates)].sort()[0];
  } else if (pathDate && isValidIsoDate(pathDate)) {
    departureDate = pathDate;
  }

  let durationDays = 12;
  const dur = all.match(/(\d{1,2})\s*晚\s*(\d{1,2})\s*天/);
  if (dur) durationDays = parseInt(dur[2], 10);
  else {
    const d2 = all.match(/(\d{1,2})\s*天/);
    if (d2) durationDays = parseInt(d2[1], 10);
  }

  let priceFrom = 0;
  const prices = [...all.matchAll(/RMB\s*([\d,]+)/gi), ...all.matchAll(/¥\s*([\d,]+)/g)];
  if (prices.length) {
    const nums = prices.map((m) => parseInt(m[1].replace(/,/g, ""), 10)).filter((n) => n >= 30000);
    if (nums.length) priceFrom = Math.min(...nums);
  }

  const shipScanText = all.replace(
    /船客旅行创立于[\s\S]*?(?:关注我们了解更多|Follow us to learn more|$)/gi,
    "",
  );
  let shipName = "探险邮轮";
  const ships = [
    ["中国国家地理号", "中国国家地理号"],
    ["国家地理号", "中国国家地理号"],
    ["银海奋进", "银海奋进号"],
    ["Silver Endeavour", "银海奋进号"],
    ["庞洛北冕号", "庞洛北冕号"],
    ["北冕号", "庞洛北冕号"],
    ["指挥官夏古号", "指挥官夏古号"],
    ["COMMANDANT CHARCOT", "指挥官夏古号"],
    ["Le Commandant Charcot", "指挥官夏古号"],
    ["夏古", "指挥官夏古号"],
    ["庞洛日丽号", "庞洛日丽号"],
    ["Le Laperouse", "庞洛日丽号"],
    ["海神号", "海神"],
    ["Seaventure", "海神号"],
    ["环球领航者", "World Navigator"],
    ["World Navigator", "环球领航者号"],
    ["银海", "银海"],
    ["Silver Spirit", "银海"],
    ["庞洛", "庞洛"],
    ["Ponant", "庞洛"],
    ["Infinity", "Infinity 无限号"],
    ["无限号", "Infinity"],
    ["Scenic", "Scenic"],
    ["夸克", "夸克"],
    ["Atlas", "Atlas"],
    ["信天翁", "信天翁号"],
    ["探险号", "探险号"],
  ];
  for (const [k, label] of ships) {
    if (shipScanText.includes(k)) {
      shipName = label;
      break;
    }
  }

  let category = "light-expedition";
  const fn = rel + " " + all;
  if (/单船票|船票/.test(fn) && !/飞船/.test(fn)) category = "ticket";
  else if (/厄瓜多尔|加拉帕戈斯|Galapagos|ECUADOR/i.test(fn)) category = "galapagos";
  else if (/南极|ANTARCTICA|王企鹅|半岛/.test(fn) && !/北极/.test(fn)) category = "antarctic";
  else if (/北极|ARCTIC|格陵兰|斯瓦尔巴|冰岛|日食|北极点/.test(fn)) category = "arctic";
  else if (/金伯利|Kimberley|非洲|南美|地中海|莱茵|亚得里亚|香草|河轮/.test(fn))
    category = "light-expedition";

  let subcategory = "";
  if (/单飞|飞船|飞去|飞去船回/.test(fn)) subcategory = "单飞";
  else if (/双飞|飞跃德雷克/.test(fn)) subcategory = "双飞";
  else if (/三岛/.test(fn)) subcategory = "三岛";
  else if (/北极点/.test(fn)) subcategory = "北极点";
  else if (/船票/.test(fn)) subcategory = "船票";
  else if (/金伯利/.test(fn)) subcategory = "金伯利";
  else if (/一国四境|厄瓜多尔/.test(fn)) subcategory = "一国四境";

  const isExtension = /延长线/.test(rel);
  const isLong = /长线/.test(rel);
  const isShort = /短线/.test(rel);

  let title = titleSlide.slice(0, 120) || fileName.replace(/\.pptx$/i, "");
  if (title.length < 8) title = fileName.replace(/\.pptx$/i, "");
  title = cleanImportTitle(title, fileName);

  return { title, departureDate, durationDays, priceFrom, shipName, category, subcategory, isExtension, isLong, isShort, all: dec(all) };
}

const TITLE_STOP =
  /(?:出发\s*\/\s*到达|航次安排|行程由船长|行程简介|Itinerary\s+Introduction|SAIL\s*&\s*FLY|FLY\s*&\s*SAIL|ANTARCTICA|Arctic\s+北极|Mediterranean|VISIT\s+TWO|VANILLA\s+FOUR|雷克雅未克|->)/i;

function cleanImportTitle(title, fileName) {
  let t = title.replace(/\s+/g, " ").trim();
  const cut = t.search(TITLE_STOP);
  if (cut > 20) t = t.slice(0, cut).trim();
  t = t.replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, "$1");
  t = t.replace(/20(26|27|28)\s+20\1年?/g, "20$1");
  if (t.length > 56) {
    const fn = fileName
      .replace(/\.pptx$/i, "")
      .replace(/^短线-|^长线-/i, "")
      .trim();
    if (fn.length >= 6 && fn.length <= 56) t = fn;
  }
  if (t.length > 56) t = `${t.slice(0, 54).trim()}…`;
  return t;
}

function slugify(rel, meta, fileName) {
  const key = rel;
  if (SLUG_BY_FILE.has(key)) return SLUG_BY_FILE.get(key);

  const base = fileName
    .replace(/\.pptx$/i, "")
    .replace(/^短线-|^长线-|^TY-/i, "")
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .toLowerCase();
  let slug = base.replace(/^-+|-+$/g, "").slice(0, 60);
  if (!/^[a-z0-9]/.test(slug)) {
    slug = `sku-${meta.departureDate}-${meta.durationDays}d`;
  }
  if (meta.isShort) slug += "-short";
  if (meta.isLong) slug += "-long";
  if (meta.isExtension) slug = `ext-${slug}`.slice(0, 64);
  return slug.replace(/-+/g, "-");
}

function nextId(cat) {
  const pre = prefix[cat] || "sku";
  idSeq[pre] = (idSeq[pre] || 0) + 1;
  return `${pre}-${String(idSeq[pre]).padStart(3, "0")}`;
}

function buildSummary(meta, title) {
  const pricePart = meta.priceFrom ? `参考起价 ¥${meta.priceFrom}/人` : "价格请咨询顾问";
  const s = `船客 ${title}，${meta.departureDate} 出发，行程约 ${meta.durationDays} 天，搭乘 ${meta.shipName}。${pricePart}。具体舱位、签证与费用包含以签约合同及顾问报价为准。咨询行程、舱房与签证细节，请通过官网「直连顾问」添加船客企业微信，顾问将根据出发档期与身体条件提供一对一建议。`;
  return s.length >= 80 ? s : s + "欢迎预约船客旅行顾问获取最新档期与余位信息。";
}

function makeProduct(entry, meta) {
  const slug = slugify(entry.rel, meta, entry.name);
  const cat = meta.category;
  const id = nextId(cat);
  const title = meta.title.length > 10 ? meta.title : entry.name.replace(/\.pptx$/i, "");
  /** 有方案即可展示，无价显示「价格咨询」；延长线默认不上架 */
  const published = !meta.isExtension;

  return {
    id,
    slug,
    title,
    category: cat,
    subcategory: meta.subcategory || undefined,
    tags: [meta.subcategory, meta.shipName].filter(Boolean).slice(0, 4),
    departureDate: meta.departureDate,
    durationDays: meta.durationDays,
    priceFrom: meta.priceFrom || 0,
    priceLabel: meta.priceFrom
      ? `¥${meta.priceFrom.toLocaleString("zh-CN")} 起`
      : "价格咨询",
    shipName: meta.shipName,
    summary: buildSummary(meta, title),
    overview: title,
    highlights: [
      "船客甄选航程，专业探险领队与冲锋艇登陆（以船期为准）",
      "中文服务与行前说明，适合首次或深度极地/探险旅客",
      "具体登陆点与活动以探险队长及天气海况最终安排为准",
    ],
    itinerary: [
      { day: 1, title: "启程", content: "国际航班/转机抵达出发城市，行前说明与休整。" },
      { day: Math.max(2, Math.floor(meta.durationDays / 2)), title: "核心巡游", content: "邮轮巡游与登陆探索（以实际船期为准）。" },
      { day: meta.durationDays, title: "返程", content: "离船或结束行程，返回国内。" },
    ],
    ship: `${meta.shipName} 探险邮轮/游艇，舱位与设施以方案与合同为准。`,
    feeNote: "费用包含与不含项目请以签约合同为准；机票、签证、保险、小费及个人消费通常另计。",
    notice: "极地/探险旅行受天气、冰况、海况影响，行程可能调整；请提前办理签证并购买符合要求的保险。",
    published,
    featured: published && (cat === "antarctic" || cat === "arctic") && !meta.isExtension,
    imageAlt: title.slice(0, 40),
    sourceFile: entry.rel,
    wecomFrom: id,
  };
}

function main() {
  if (!existsSync(DRIVE)) {
    console.error("硬盘未挂载:", DRIVE);
    process.exit(1);
  }

  const existing = JSON.parse(readFileSync(OUT, "utf8"));
  const kept = existing.filter(
    (p) => KEEP_SLUGS.has(p.slug) && isOnOrAfterMin(p.departureDate),
  );
  for (const p of kept) {
    const pre = p.id.split("-")[0];
    const n = parseInt(p.id.split("-")[1], 10);
    if (n > (idSeq[pre] || 0)) idSeq[pre] = n;
  }

  const files = walkPptx(DRIVE);
  const seenSlug = new Set(kept.map((p) => p.slug));
  const imported = [];

  for (const entry of files) {
    const relKey = entry.rel;
    if (SLUG_BY_FILE.has(relKey)) continue;

    const slides = extractPptText(entry.path);
    const meta = parseMeta(slides, entry.rel, entry.name);
    if (!isOnOrAfterMin(meta.departureDate)) continue;

    const product = makeProduct(entry, meta);
    if (seenSlug.has(product.slug)) {
      product.slug = `${product.slug}-${imported.length + 1}`;
    }
    seenSlug.add(product.slug);
    imported.push(product);
  }

  const merged = [...kept, ...imported];
  writeFileSync(OUT, JSON.stringify(merged, null, 2) + "\n", "utf8");

  const pub = merged.filter((p) => p.published).length;
  console.log(`筛选条件：出发日 >= ${MIN_DEPARTURE}，已排除 TY 与 2026年1–5月产品夹`);
  console.log(`保留精品 ${kept.length} 条，新导入 ${imported.length} 条，合计 ${merged.length} 条，published ${pub} 条`);
  console.log("写入:", OUT);
}

main();
