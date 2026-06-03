import productsData from "../../data/products.json";
import articlesData from "../../data/articles.json";
import type { Article, Product, ProductCategory } from "../types/product";

export const products = productsData as Product[];
export const articles = articlesData as Article[];

export function getPublishedProducts() {
  return products.filter((p) => p.published);
}

/** 延长线 SKU（仅在南极等品类页「延长线」筛选项展示） */
export function isExtensionProduct(p: Product) {
  return (
    p.slug.startsWith("ext-") ||
    (p.sourceFile?.includes("延长线") ?? false) ||
    p.subcategory === "延长线"
  );
}

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug && p.published);
}

export function getProductsByCategory(category: ProductCategory, tag?: string) {
  let list = products.filter((p) => p.category === category && p.published);

  if (tag === "延长线") {
    return list
      .filter(isExtensionProduct)
      .sort(
        (a, b) =>
          new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime(),
      );
  }

  list = list.filter((p) => !isExtensionProduct(p));

  if (tag && tag !== "全部") {
    list = list.filter(
      (p) =>
        p.subcategory === tag ||
        p.tags?.includes(tag) ||
        p.title.includes(tag),
    );
  }
  return list.sort(
    (a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime(),
  );
}

export function getCategoryPageProducts(category: ProductCategory) {
  return products
    .filter((p) => p.category === category && p.published)
    .sort(
      (a, b) =>
        new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime(),
    );
}

/** 首页品类条：仅主航程，不含延长线（南极/北极等取前 N 条） */
export function getHomeCategoryProducts(category: ProductCategory, limit = 3) {
  return getProductsByCategory(category).slice(0, limit);
}

export function getFeaturedProducts(limit = 6) {
  const featured = products.filter((p) => p.published && p.featured);
  if (featured.length >= limit) return featured.slice(0, limit);
  return getPublishedProducts().slice(0, limit);
}

export function searchProducts(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return getPublishedProducts();
  return getPublishedProducts().filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.shipName.toLowerCase().includes(q) ||
      p.subcategory?.toLowerCase().includes(q),
  );
}

export function getProductsByMonth(year: number, month: number) {
  return getPublishedProducts().filter((p) => {
    const d = new Date(p.departureDate);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
}

export function getArticleBySlug(slug: string) {
  return articles.find((a) => a.slug === slug && a.published);
}

export function formatDate(iso: string) {
  return iso.slice(0, 10);
}
