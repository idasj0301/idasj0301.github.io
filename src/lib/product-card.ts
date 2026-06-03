import type { Product } from "../types/product";

const TITLE_STOP =
  /(?:出发\s*\/\s*到达|航次安排|行程由船长|行程简介|Itinerary\s+Introduction|SAIL\s*&\s*FLY|FLY\s*&\s*SAIL|ANTARCTICA|Arctic\s+北极|Mediterranean|VISIT\s+TWO|VANILLA\s+FOUR|雷克雅未克|->)/i;

/** 卡片标题：去掉 PPT 首屏堆在一起的说明文字 */
export function cleanProductTitle(
  title: string,
  fileName?: string,
  overview?: string,
): string {
  let t = title.replace(/\s+/g, " ").trim();
  const cut = t.search(TITLE_STOP);
  if (cut > 20) t = t.slice(0, cut).trim();
  t = t.replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, "$1");
  t = t.replace(/20(26|27|28)\s+20\1年?/g, "20$1");
  t = t.replace(/20(26|27|28)年\s+20\1/g, "20$1");

  if (t.length > 56 && fileName) {
    const fn = fileName
      .replace(/\.pptx$/i, "")
      .replace(/^短线-|^长线-|^TY-/i, "")
      .trim();
    if (fn.length >= 6 && fn.length <= 56) t = fn;
  }
  if (t.length > 56 && overview && overview.length <= 56) t = overview;
  if (t.length > 56) t = `${t.slice(0, 54).trim()}…`;
  return t;
}

export function getCardTitle(product: Product): string {
  const src = product.sourceFile?.split("/").pop();
  return cleanProductTitle(product.title, src, product.overview);
}

export function getCardSubtitle(product: Product): string | undefined {
  const normalizedShip = product.shipName === "海神" ? "海神号" : product.shipName;
  const tags = (product.tags ?? []).filter(
    (tag) => tag !== product.subcategory && tag !== normalizedShip && tag !== product.shipName,
  );
  const parts = [product.subcategory, ...tags.slice(0, 1), normalizedShip].filter(Boolean);
  const uniq = [...new Set(parts)];
  return uniq.length ? uniq.join(" · ") : undefined;
}

export function formatCardDateLine(product: Product): string {
  const start = new Date(`${product.departureDate}T12:00:00`);
  const end = product.endDate ? new Date(`${product.endDate}T12:00:00`) : new Date(start);
  if (!product.endDate) end.setDate(end.getDate() + product.durationDays - 1);
  const sy = start.getFullYear();
  const sm = start.getMonth() + 1;
  const sd = start.getDate();
  const ey = end.getFullYear();
  const em = end.getMonth() + 1;
  const ed = end.getDate();
  if (sy === ey) {
    return `${sy}年${sm}月${sd}日 – ${em}月${ed}日 · ${product.durationDays}天`;
  }
  return `${sy}年${sm}月${sd}日 – ${ey}年${em}月${ed}日 · ${product.durationDays}天`;
}

export function getDepartureYear(product: Product): number {
  return parseInt(product.departureDate.slice(0, 4), 10);
}

export function getDepartureYears(products: Product[]): number[] {
  const years = new Set<number>();
  for (const p of products) {
    const y = getDepartureYear(p);
    if (!Number.isNaN(y)) years.add(y);
  }
  return [...years].sort((a, b) => a - b);
}
