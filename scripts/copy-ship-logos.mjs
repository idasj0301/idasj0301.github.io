/**
 * 从本机「船司logo」目录同步品牌 logo 到 public/ships/
 * 用法: node scripts/copy-ship-logos.mjs
 */
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "../public/ships");
const desktop = "/Users/pro/Desktop/船司logo";

const map = [
  ["Silversea-Cruises_logo.png", "silversea.png"],
  ["Quark_Expeditions_logo.svg", "quark.svg"],
  ["庞洛/LOGO_PONANT_EXPLORATION_BLEU.jpg", "ponant.jpg"],
  ["66/English logo/En logo(orange)-horizonta.png", "expeditions-66.png"],
  ["Hapag-Lloyd_Cruises_logo.svg.png", "hapag_lloyd.png"],
  ["Vir_Logo_Secondary_Color_RGB_220.png", "scenic_virgin.png"],
  ["Atlas/Atlas_Horizontal_Color.png", "atlas.png"],
];

mkdirSync(out, { recursive: true });
let n = 0;
for (const [src, dest] of map) {
  const from = join(desktop, src);
  if (!existsSync(from)) {
    console.warn("skip (missing):", from);
    continue;
  }
  copyFileSync(from, join(out, dest));
  n++;
  console.log("ok", dest);
}
console.log(`Copied ${n} logos → ${out}`);
