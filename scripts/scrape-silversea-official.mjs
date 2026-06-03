import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const productsPath = join(root, "data", "products.json");
const detailsDir = join(root, "data", "details");
const publicTripsDir = join(root, "public", "trips");
const usedHeroKeys = new Set();

const dayNames = new Set(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
const countryOnly = new Set(["Antarctica", "South Shetland Islands, Antarctica", "Chile", "Falkland Islands", "South Georgia"]);

function decodeHtml(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&rsquo;", "'")
    .replaceAll("&lsquo;", "'")
    .replaceAll("&mdash;", "—")
    .replaceAll("&trade;", "™")
    .replaceAll("&reg;", "®")
    .replaceAll(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function textLines(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .split("\n")
    .map(decodeHtml)
    .filter(Boolean);
}

function metaContent(html, name) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i");
  return decodeHtml(html.match(re)?.[1] ?? "");
}

function extractOfficial(html, product) {
  const lines = textLines(html);
  const title = metaContent(html, "og:title").replace(/^Cruise from /, "").replace(/\s-\s[A-Z0-9]+$/, "");
  const description = metaContent(html, "description");
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? "";

  const oneCountry = lines.findIndex((line) => /^\d+\s+Countr/.test(line));
  const withOptional = lines.findIndex((line, i) => i > oneCountry && line === "With optional");
  const overview = lines.slice(oneCountry + 1, withOptional > -1 ? withOptional : oneCountry + 5).join(" ");

  const excursionIndex = lines.findIndex((line) => line.startsWith("The excursions/expedition activities"));
  const itinerary = [];
  for (let i = 0; i < lines.length; i += 1) {
    const [dow] = lines[i].split(",");
    if (!dayNames.has(dow)) continue;
    let port = "";
    for (let j = i - 1; j >= Math.max(0, i - 10); j -= 1) {
      const candidate = lines[j];
      if (
        candidate === "," ||
        countryOnly.has(candidate) ||
        candidate.startsWith("See details") ||
        /^\d{2}:\d{2}/.test(candidate) ||
        dayNames.has(candidate.split(",")[0])
      ) continue;
      port = candidate;
      break;
    }
    const time = lines[i + 1] && /^\d{2}:\d{2}/.test(lines[i + 1]) ? lines[i + 1] : "";
    itinerary.push({
      day: String(itinerary.length + 1),
      date: lines[i].replace(",", " ·"),
      title: port || "航行 / 探索",
      content: `银海日程：${port || product.title}${time ? `，${time}` : ""}。具体登陆、巡游与活动以船司当日安排为准。`,
    });
    if (excursionIndex > -1 && i > excursionIndex) break;
  }

  const benefitsStart = lines.findIndex((line) => line === "All-inclusive onboard benefits");
  const shipStart = lines.findIndex((line, i) => i > benefitsStart && line === "Ship");
  const benefits = lines
    .slice(benefitsStart + 2, shipStart > -1 ? shipStart : benefitsStart + 20)
    .filter((line) => !["STAFF & SERVICES", "LEISURE ONBOARD", "UTILITIES & AMENITIES"].includes(line))
    .slice(0, 12);

  const shipName = product.shipName.replace(/^银海\S+\s/, "");
  const shipMarker = lines.findIndex((line, i) => i > shipStart && line.includes(shipName.split(" ")[0]));
  const readMore = lines.findIndex((line, i) => i > shipMarker && line === "Read more >");
  const shipIntro = lines.slice(shipMarker + 1, readMore > -1 ? readMore : shipMarker + 5).join(" ");

  const images = extractImages(html, product, ogImage);
  return { title, description, overview, itinerary, benefits, shipIntro, images };
}

function extractImages(html, product, ogImage) {
  const raw = [];
  const imgRe = /<img\b[^>]*>/gi;
  for (const tag of html.match(imgRe) ?? []) {
    const src = tag.match(/\ssrc=["']([^"']+)["']/i)?.[1];
    const alt = decodeHtml(tag.match(/\salt=["']([^"']*)["']/i)?.[1] ?? "");
    if (!src || !src.includes("cdn.sanity.io")) continue;
    raw.push({ src: decodeHtml(src), alt });
  }
  const words = [
    "King George",
    "Antarctic",
    "South Shetland",
    "Puerto Williams",
    "Falkland",
    "South Georgia",
    "Silver Endeavour",
    "Silver Wind",
    "Silver Cloud",
    product.shipName.split(" ").at(-1),
  ].filter(Boolean);
  const chosen = [];
  if (ogImage) chosen.push({ src: decodeHtml(ogImage), alt: product.title });
  for (const image of raw) {
    if (!words.some((word) => image.alt.includes(word))) continue;
    if (!chosen.some((item) => imageKey(item.src) === imageKey(image.src))) chosen.push(image);
  }
  for (const image of raw) {
    if (chosen.length >= 28) break;
    if (!chosen.some((item) => imageKey(item.src) === imageKey(image.src))) chosen.push(image);
  }
  return chosen.slice(0, 28);
}

function imageKey(url) {
  return url.split("?")[0];
}

function imageUrl(url, index) {
  const base = imageKey(url);
  const params = index === 0 ? "w=1400&h=900&q=82&fit=max&auto=format" : "w=1200&h=780&q=80&fit=max&auto=format";
  return `${base}?${params}`;
}

async function downloadImage(url, path) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image ${res.status} ${url}`);
  await writeFile(path, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const products = JSON.parse(await readFile(productsPath, "utf8"));
  const silversea = products.filter((product) => product.slug.startsWith("silversea-"));

  for (const [index, product] of silversea.entries()) {
    const sourceUrl = product.sourceFile?.match(/https:\/\/www\.silversea\.com\/\S+/)?.[0];
    if (!sourceUrl) continue;
    const html = await fetch(sourceUrl).then((res) => {
      if (!res.ok) throw new Error(`${res.status} ${sourceUrl}`);
      return res.text();
    });
    const official = extractOfficial(html, product);
    const detailPath = join(detailsDir, `${product.slug}.json`);
    const detail = JSON.parse(await readFile(detailPath, "utf8"));
    const assetDir = join(publicTripsDir, product.slug);
    await mkdir(assetDir, { recursive: true });

    const hero =
      official.images.find((image) => !usedHeroKeys.has(imageKey(image.src))) ??
      official.images[index % Math.max(official.images.length, 1)] ??
      official.images[0];
    if (hero) usedHeroKeys.add(imageKey(hero.src));
    const gallery = official.images.filter((image) => image !== hero).slice(0, 3);
    const allImages = [hero, ...gallery].filter(Boolean);
    for (const [imageIndex, image] of allImages.entries()) {
      const fileName = imageIndex === 0 ? "hero.jpg" : `gallery-${String(imageIndex).padStart(2, "0")}.jpg`;
      await downloadImage(imageUrl(image.src, imageIndex), join(assetDir, fileName));
    }

    product.summary = official.overview || official.description || product.summary;
    product.overview = `${product.title}，${product.departureDate} — ${product.endDate}，${product.durationDays}天。资料按银海航次 ${product.tags?.find((tag) => /^[A-Z0-9]{10,}$/.test(tag)) ?? ""} 整理。`;
    product.highlights = [
      official.description || product.highlights[0],
      "行程、港口、活动和飞航/接驳安排为航次计划说明，最终以船司实时确认为准。",
      product.priceFrom > 0 ? `蘑菇表格参考起价：${product.priceLabel}` : "该航次价格需顾问向银海实时确认。",
    ];

    detail.titleEn = official.title || detail.titleEn;
    detail.heroImage = `/trips/${product.slug}/hero.jpg`;
    detail.gallery = allImages.slice(1).map((image, imageIndex) => ({
      src: `/trips/${product.slug}/gallery-${String(imageIndex + 1).padStart(2, "0")}.jpg`,
      alt: image.alt || `${product.title} 航次图片 ${imageIndex + 1}`,
      caption: image.alt || "航次图片",
    }));
    detail.highlightSections = [
      {
        title: "航线亮点",
        content: official.overview || official.description || detail.highlightSections?.[0]?.content || product.summary,
      },
      {
        title: "船上服务与包含",
        bullets: official.benefits.slice(0, 8),
      },
    ];
    if (official.itinerary.length >= 2) detail.itinerary = official.itinerary;
    detail.shipDetail = {
      ...(detail.shipDetail ?? {}),
      intro: official.shipIntro || detail.shipDetail?.intro,
      facilities: official.benefits.slice(0, 8),
    };
    detail.itineraryNote = `以上日程为航次计划说明；实际港口、时间、登陆和探险活动以船司最终确认为准。`;
    detail.metaTable = [
      ...(detail.metaTable ?? []).filter(([label]) => label !== "航线来源"),
      ["航线来源", sourceUrl],
    ];
    await writeFile(detailPath, `${JSON.stringify(detail, null, 2)}\n`);
    console.log(`Scraped ${product.slug}`);
  }

  await writeFile(productsPath, `${JSON.stringify(products, null, 2)}\n`);
  console.log(`Updated ${silversea.length} Silversea voyages from official pages.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
