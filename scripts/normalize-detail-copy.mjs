/**
 * Normalize common PPT-extraction copy artifacts in detail JSON files.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const detailsDir = join(root, "data/details");

const radicalMap = new Map(
  Object.entries({
    "⺠": "民",
    "⻅": "见",
    "⻔": "门",
    "⻛": "风",
    "⻝": "食",
    "⻥": "鱼",
    "⻦": "鸟",
    "⻩": "黄",
    "⼀": "一",
    "⼈": "人",
    "⼗": "十",
    "⼤": "大",
    "⼦": "子",
    "⼩": "小",
    "⼭": "山",
    "⼯": "工",
    "⼾": "户",
    "⼿": "手",
    "⽂": "文",
    "⽅": "方",
    "⽇": "日",
    "⽉": "月",
    "⽓": "气",
    "⽔": "水",
    "⽚": "片",
    "⽜": "牛",
    "⽡": "瓦",
    "⽣": "生",
    "⽩": "白",
    "⽪": "皮",
    "⽬": "目",
    "⽴": "立",
    "⽶": "米",
    "⽽": "而",
    "⾃": "自",
    "⾄": "至",
    "⾆": "舌",
    "⾊": "色",
    "⾏": "行",
    "⾛": "走",
    "⾝": "身",
    "⾥": "里",
    "⾯": "面",
    "⾼": "高",
    "⿅": "鹿",
  })
);

function normalizeText(input) {
  if (typeof input !== "string") return input;
  let text = input.normalize("NFKC");
  for (const [from, to] of radicalMap) text = text.replaceAll(from, to);

  text = text
    .replace(/([\p{Script=Han}])\s+([\p{Script=Han}])/gu, "$1$2")
    .replace(/,/g, "，")
    .replace(/(\d)，(?=\d{3}(?:\D|$))/g, "$1,")
    .replace(/;/g, "；")
    .replace(/!/g, "！")
    .replace(/\?/g, "？")
    .replace(/\s+([，。！？；：、])/g, "$1")
    .replace(/([（《“])\s+/g, "$1")
    .replace(/\s+([）》”])/g, "$1")
    .replace(/\s*行程亮点\s*Itinerary\s*HIGHLIGHTS\s*/gi, "")
    .replace(/Antarctic wildlife\s*/gi, "")
    .replace(/\s*Antarctic wildli\s*$/gi, "")
    .replace(/^fe\s+/i, "")
    .replace(/^ERICA\s+南美行程亮点\s*/i, "")
    .replace(/^HIGHLIGHTS OF SOUTH AM$/i, "南美行程亮点")
    .replace(/^HIGHLIGHTS OF SOUTH AMERICA 南美$/i, "南美行程亮点")
    .replace(/HIGHLIGHTS OF SOUTH AMERICA 南美 HIGHLIGHTS OF SOUTH AMERICA 南美/gi, "南美行程亮点")
    .replace(/HIGHLIGHTS\s+OF\s+SOUTH\s+AM\s*ERICA\s+南美\s*行程亮点/gi, "南美行程亮点")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return text;
}

function normalizeValue(value) {
  if (typeof value === "string") return normalizeText(value);
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object") {
    const normalized = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeValue(item)]));
    if (normalized.title === "HIGHLIGHTS OF SOUTH AM" && typeof normalized.content === "string") {
      normalized.title = "南美行程亮点";
      normalized.content = normalized.content.replace(/^ERICA\s+南美行程亮点\s*/, "");
    }
    if (normalized.title === "精灵的") normalized.title = "精灵的世界";
    if (/Antarctic wildli$/.test(normalized.title) && typeof normalized.content === "string") {
      normalized.title = normalized.title.replace(/\s*Antarctic wildli$/, "");
      normalized.content = normalized.content.replace(/^fe\s*/, "");
    }
    return normalized;
  }
  return value;
}

let changed = 0;
for (const name of readdirSync(detailsDir).filter((file) => file.endsWith(".json"))) {
  const path = join(detailsDir, name);
  const before = readFileSync(path, "utf8");
  const after = `${JSON.stringify(normalizeValue(JSON.parse(before)), null, 2)}\n`;
  if (after !== before) {
    writeFileSync(path, after);
    changed++;
  }
}

console.log(`Normalized ${changed} detail file(s).`);
