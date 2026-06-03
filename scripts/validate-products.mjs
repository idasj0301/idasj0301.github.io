import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const products = JSON.parse(
  readFileSync(join(__dirname, "../data/products.json"), "utf8"),
);

const categories = new Set([
  "antarctic",
  "arctic",
  "galapagos",
  "light-expedition",
  "ticket",
  "ship",
]);

const slugs = new Set();
const ids = new Set();
let errors = 0;

for (const p of products) {
  const label = p.id ?? p.slug;
  if (!p.id || ids.has(p.id)) {
    console.error(`[${label}] duplicate or missing id`);
    errors++;
  }
  ids.add(p.id);

  if (!p.slug || slugs.has(p.slug)) {
    console.error(`[${label}] duplicate or missing slug`);
    errors++;
  }
  slugs.add(p.slug);

  if (!categories.has(p.category)) {
    console.error(`[${label}] invalid category`);
    errors++;
  }
  if (!p.summary || p.summary.length < 80) {
    console.error(`[${label}] summary too short (GEO need 80+ chars)`);
    errors++;
  }
  if (!Array.isArray(p.highlights) || p.highlights.length < 1) {
    console.error(`[${label}] highlights required`);
    errors++;
  }
}

console.log(`Checked ${products.length} products, ${products.filter((p) => p.published).length} published`);
if (products.length < 30) {
  console.error(`Expected 30+ products, got ${products.length}`);
  errors++;
}
if (errors) {
  process.exit(1);
}
console.log("OK");
