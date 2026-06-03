import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ShipBrand } from "./ships";
import { getShipBrand } from "./ships";

const profilesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../data/ship-profiles",
);

export interface ShipProfile {
  brandId: string;
  vesselName: string;
  vesselNameEn?: string;
  tagline: string;
  heroImage?: string;
  highlights?: string[];
  sections?: { title: string; content: string; bullets?: string[] }[];
  specs?: [string, string][];
  facilities?: string[];
  cabins?: { name: string; spec: string; note?: string }[];
  gallery?: { src: string; alt: string }[];
  relatedSlugs?: string[];
  vessels?: {
    name: string;
    nameEn?: string;
    role?: string;
    intro: string;
    specs?: [string, string][];
    cabins?: string[];
  }[];
}

const cache = new Map<string, ShipProfile>();

function loadProfile(id: string): ShipProfile | undefined {
  if (cache.has(id)) return cache.get(id);
  const path = join(profilesDir, `${id}.json`);
  if (!existsSync(path)) return undefined;
  const data = JSON.parse(readFileSync(path, "utf8")) as ShipProfile;
  cache.set(id, data);
  return data;
}

export function getShipProfile(brandId: string) {
  return loadProfile(brandId);
}

export function listShipProfileIds() {
  if (!existsSync(profilesDir)) return [];
  return readdirSync(profilesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

export function getShipPage(brandId: string): {
  brand: ShipBrand;
  profile?: ShipProfile;
} | undefined {
  const brand = getShipBrand(brandId);
  if (!brand) return undefined;
  return { brand, profile: loadProfile(brandId) };
}
