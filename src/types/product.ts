export type ProductCategory =
  | "antarctic"
  | "arctic"
  | "galapagos"
  | "light-expedition"
  | "ticket"
  | "ship";

export interface ItineraryDay {
  day: number;
  title: string;
  content: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  category: ProductCategory;
  subcategory?: string;
  tags?: string[];
  departureDate: string;
  endDate?: string;
  durationDays: number;
  priceFrom: number;
  priceLabel: string;
  company?: string;
  shipName: string;
  summary: string;
  overview?: string;
  highlights: string[];
  itinerary?: ItineraryDay[];
  ship?: string;
  feeNote?: string;
  notice?: string;
  published: boolean;
  featured?: boolean;
  imageAlt?: string;
  wecomFrom?: string;
  sourceFile?: string;
}

export interface Article {
  slug: string;
  title: string;
  author: string;
  tag?: string;
  image?: string;
  imageAlt?: string;
  imageCaption?: string;
  inlineImages?: {
    after: string;
    src: string;
    alt: string;
    caption?: string;
  }[];
  excerpt: string;
  body: string;
  published: boolean;
}
