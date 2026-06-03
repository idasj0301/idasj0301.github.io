import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Product } from "../types/product";

const detailsDir = join(dirname(fileURLToPath(import.meta.url)), "../../data/details");

export interface TripGalleryImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface ProductDetail {
  titleEn?: string;
  subtitle?: string;
  tags?: string[];
  heroImage?: string;
  routeMap?: {
    src: string;
    alt?: string;
    caption?: string;
  };
  gallery?: TripGalleryImage[];
  metaTable?: [string, string][];
  cabins?: { name: string; spec: string; price: string; soldOut?: boolean }[];
  highlightSections?: {
    title: string;
    content?: string;
    bullets?: string[];
  }[];
  itinerary?: {
    day: string;
    date?: string;
    title: string;
    meta?: string;
    content: string;
  }[];
  itineraryNote?: string;
  shipDetail?: {
    name: string;
    intro: string;
    specs?: [string, string][];
    facilities?: string[];
    cabins?: { name: string; spec: string; price: string; soldOut?: boolean }[];
  };
  feeIncluded?: string[];
  feeExcluded?: string[];
  noticeSections?: {
    title: string;
    content?: string;
    bullets?: string[];
    table?: [string, string][];
  }[];
}

const cache = new Map<string, ProductDetail>();

function loadDetail(slug: string): ProductDetail | undefined {
  if (cache.has(slug)) return cache.get(slug);
  const path = join(detailsDir, `${slug}.json`);
  if (!existsSync(path)) return undefined;
  const data = JSON.parse(readFileSync(path, "utf8")) as ProductDetail;
  cache.set(slug, data);
  return data;
}

export function getProductDetail(slug: string): ProductDetail | undefined {
  return loadDetail(slug);
}

export function mergeProductWithDetail(product: Product) {
  const detail = loadDetail(product.slug);
  return { product, detail };
}

export function listDetailSlugs() {
  if (!existsSync(detailsDir)) return [];
  return readdirSync(detailsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}
