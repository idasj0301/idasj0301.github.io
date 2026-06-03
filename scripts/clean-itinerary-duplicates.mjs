import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const detailsDir = join(import.meta.dirname, "..", "data/details");

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, "$1")
    .trim();
}

function uniqueAppend(parts, value) {
  const text = cleanText(value);
  if (!text) return;
  if (parts.some((part) => part.includes(text) || text.includes(part))) return;
  parts.push(text);
}

let changed = 0;

for (const file of readdirSync(detailsDir).filter((name) => name.endsWith(".json"))) {
  const path = join(detailsDir, file);
  const detail = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(detail.itinerary) || detail.itinerary.length === 0) continue;

  const grouped = new Map();
  const order = [];
  for (const day of detail.itinerary) {
    const key = String(day.day ?? "").trim();
    if (!grouped.has(key)) {
      grouped.set(key, {
        ...day,
        title: cleanText(day.title),
        contentParts: [],
        metaParts: [],
      });
      order.push(key);
    }
    const target = grouped.get(key);
    if (!target.date && day.date) target.date = day.date;
    if ((!target.title || target.title.length > cleanText(day.title).length) && day.title) {
      target.title = cleanText(day.title);
    }
    uniqueAppend(target.contentParts, day.content);
    uniqueAppend(target.metaParts, day.meta);
  }

  const next = order.map((key) => {
    const day = grouped.get(key);
    return {
      day: day.day,
      date: day.date ?? "",
      title: day.title || cleanText(day.contentParts[0], 80),
      ...(day.metaParts.length ? { meta: day.metaParts.join(" ") } : {}),
      content: day.contentParts.join(" "),
    };
  });

  if (next.length !== detail.itinerary.length) {
    detail.itinerary = next;
    writeFileSync(path, `${JSON.stringify(detail, null, 2)}\n`);
    changed++;
    console.log(`${file}: ${detail.itinerary.length} itinerary rows after duplicate merge`);
  }
}

console.log(`Merged duplicate itinerary days in ${changed} detail file(s).`);
