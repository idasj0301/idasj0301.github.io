import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const projectRoot = join(import.meta.dirname, "..");
const detailsDir = join(projectRoot, "data/details");
const publicDir = join(projectRoot, "public");

function publicPath(src) {
  return join(publicDir, decodeURI(src).replace(/^\//, ""));
}

function scoreLandscape(meta) {
  const ratio = meta.width / meta.height;
  const target = 16 / 9;
  return Math.abs(ratio - target);
}

let changed = 0;

for (const file of readdirSync(detailsDir).filter((name) => name.endsWith(".json"))) {
  const path = join(detailsDir, file);
  const detail = JSON.parse(readFileSync(path, "utf8"));
  if (!detail.heroImage || !Array.isArray(detail.gallery)) continue;

  const heroPath = publicPath(detail.heroImage);
  if (!existsSync(heroPath)) continue;

  const heroMeta = await sharp(heroPath).metadata();
  if (!heroMeta.width || !heroMeta.height || heroMeta.width >= heroMeta.height) continue;

  const candidates = [];
  for (const image of detail.gallery) {
    if (!image.src) continue;
    const candidatePath = publicPath(image.src);
    if (!existsSync(candidatePath)) continue;
    const meta = await sharp(candidatePath).metadata();
    if (!meta.width || !meta.height) continue;
    const ratio = meta.width / meta.height;
    if (ratio < 1.2) continue;
    candidates.push({ src: image.src, meta });
  }

  candidates.sort((a, b) => scoreLandscape(a.meta) - scoreLandscape(b.meta));
  const replacement = candidates[0]?.src;
  if (!replacement) continue;

  detail.heroImage = replacement;
  writeFileSync(path, `${JSON.stringify(detail, null, 2)}\n`);
  changed++;
  console.log(`${file}: hero -> ${replacement}`);
}

console.log(`Updated ${changed} portrait hero image(s).`);
