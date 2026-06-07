import type { Article, Product } from "../types/product";
import { SITE } from "./site";

function priceCurrency(product: Product) {
  if (product.priceLabel.includes("€")) return "EUR";
  if (product.priceLabel.includes("$")) return "USD";
  return "CNY";
}

export function productJsonLd(product: Product) {
  const offer =
    product.priceFrom > 0
      ? {
          "@type": "Offer",
          price: product.priceFrom,
          priceCurrency: priceCurrency(product),
          availability: "https://schema.org/InStock",
          url: `${SITE.url}/trips/${product.slug}/`,
        }
      : {
          "@type": "Offer",
          availability: "https://schema.org/InStock",
          url: `${SITE.url}/trips/${product.slug}/`,
          description: product.priceLabel,
        };

  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: product.title,
    description: product.summary,
    touristType: "Leisure",
    provider: {
      "@type": "TravelAgency",
      name: SITE.name,
      url: SITE.url,
    },
    offers: offer,
    itinerary: product.itinerary?.map((d) => ({
      "@type": "ItemList",
      name: `第${d.day}天 ${d.title}`,
      description: d.content,
    })),
  };
}

export function articleJsonLd(article: Article) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    image: article.image ? `${SITE.url}${article.image}` : undefined,
    author: { "@type": "Person", name: article.author },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    areaServed: "CN",
    knowsAbout: ["南极旅行", "北极旅行", "加拉帕戈斯", "极地邮轮"],
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
