import shipsData from "../../data/ships.json";
import { getPublishedProducts } from "./products";
import type { Product } from "../types/product";

export interface ShipBrand {
  id: string;
  name: string;
  nameEn: string;
  logo: string;
  tags: string[];
  match: string[];
  blurb: string;
}

export const SHIP_BRANDS = shipsData as ShipBrand[];

export function getShipBrand(id: string): ShipBrand | undefined {
  return SHIP_BRANDS.find((b) => b.id === id);
}

export function productsForBrand(brand: ShipBrand): Product[] {
  const needles = brand.match.map((m) => m.toLowerCase());
  return getPublishedProducts().filter((p) => {
    const hay = [p.shipName, p.title, p.subcategory ?? "", ...(p.tags ?? [])]
      .join(" ")
      .toLowerCase();
    return needles.some((n) => hay.includes(n));
  });
}
