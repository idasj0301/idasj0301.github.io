/**
 * 修复 products.json：出发日、品类、标题、行程天数
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../data/products.json");

const TITLE_STOP =
  /(?:出发\s*\/\s*到达|航次安排|行程由船长|行程简介|Itinerary\s+Introduction|SAIL\s*&\s*FLY|FLY\s*&\s*SAIL|ANTARCTICA|Arctic\s+北极|Mediterranean|VISIT\s+TWO|VANILLA\s+FOUR|雷克雅未克|->)/i;

function pad(n) {
  return String(n).padStart(2, "0");
}

function isValidIso(s) {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const mo = +m[2];
  const da = +m[3];
  return mo >= 1 && mo <= 12 && da >= 1 && da <= 31;
}

function collectDates(text) {
  if (!text) return [];
  const t = text.replace(/\s+/g, " ");
  const out = [];
  const add = (y, mo, da) => {
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) out.push(`${y}-${pad(mo)}-${pad(da)}`);
  };

  for (const m of t.matchAll(/202([67])\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g)) {
    add(2020 + +m[1], +m[2], +m[3]);
  }
  for (const m of t.matchAll(/202([67])\.(\d{1,2})\.(\d{1,2})/g)) {
    add(2020 + +m[1], +m[2], +m[3]);
  }
  for (const m of t.matchAll(/202([67])\/(\d{1,2})\/(\d{1,2})/g)) {
    add(2020 + +m[1], +m[2], +m[3]);
  }
  for (const m of t.matchAll(/202([67])-(\d{1,2})-(\d{1,2})/g)) {
    add(2020 + +m[1], +m[2], +m[3]);
  }
  const folder = t.match(/2026年(\d{1,2})月(\d{1,2})?日?/);
  if (folder) add(2026, +folder[1], +(folder[2] || 1));

  return out;
}

function inferDeparture(p) {
  const blob = [p.sourceFile, p.slug, p.title, p.overview, p.summary].filter(Boolean).join(" ");
  const candidates = collectDates(blob);
  return [...new Set(candidates)].sort()[0];
}

function cleanTitle(title, fileName, overview) {
  let t = title.replace(/\s+/g, " ").trim();
  const cut = t.search(TITLE_STOP);
  if (cut > 20) t = t.slice(0, cut).trim();
  t = t.replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, "$1");
  t = t.replace(/20(26|27|28)\s+20\1年?/g, "20$1");
  if (t.length > 56 && fileName) {
    const fn = fileName
      .replace(/\.pptx$/i, "")
      .replace(/^短线-|^长线-/i, "")
      .trim();
    if (fn.length >= 6 && fn.length <= 56) t = fn;
  }
  if (t.length > 56 && overview && overview.length <= 56) t = overview;
  if (t.length > 56) t = `${t.slice(0, 54).trim()}…`;
  return t;
}

function inferCategory(p) {
  const fn = `${p.sourceFile || ""} ${p.title} ${p.summary}`;
  if (/单船票|船票/.test(fn) && !/飞船/.test(fn)) return "ticket";
  if (/厄瓜多尔|加拉帕戈斯|Galapagos/i.test(fn)) return "galapagos";
  if (/南极|ANTARCTICA|王企鹅/.test(fn) && !/北极/.test(fn)) return "antarctic";
  if (/北极|ARCTIC|格陵兰|斯瓦尔巴|冰岛|日食|北极点/.test(fn)) return "arctic";
  if (/金伯利|Kimberley|地中海|亚得里亚|非洲|南美|河轮|香草|轻探险/.test(fn))
    return "light-expedition";
  return p.category;
}

function inferDuration(p) {
  const blob = `${p.title} ${p.summary} ${p.overview}`;
  const dur = blob.match(/(\d{1,2})\s*晚\s*(\d{1,2})\s*天/);
  if (dur) return parseInt(dur[2], 10);
  const d2 = blob.match(/(\d{1,2})\s*天/);
  if (d2) return parseInt(d2[1], 10);
  return p.durationDays;
}

const products = JSON.parse(readFileSync(OUT, "utf8"));
let dates = 0;
let titles = 0;
let cats = 0;
let durs = 0;

for (const p of products) {
  const nextDate = inferDeparture(p);
  if (nextDate && isValidIso(nextDate) && nextDate !== p.departureDate) {
    p.departureDate = nextDate;
    dates++;
  }
  const src = p.sourceFile?.split("/").pop();
  const nextTitle = cleanTitle(p.title, src, p.overview);
  if (nextTitle !== p.title) {
    p.title = nextTitle;
    titles++;
  }
  const nextCat = inferCategory(p);
  if (nextCat !== p.category) {
    p.category = nextCat;
    cats++;
  }
  const nextDur = inferDuration(p);
  if (nextDur && nextDur !== p.durationDays) {
    p.durationDays = nextDur;
    durs++;
  }
}

writeFileSync(OUT, JSON.stringify(products, null, 2) + "\n", "utf8");
console.log(`修复出发日 ${dates}，标题 ${titles}，品类 ${cats}，天数 ${durs}`);
