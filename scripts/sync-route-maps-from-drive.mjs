/**
 * 为 data/products.json 中每条 SKU 从硬盘 PPT 提取航线图
 * 输出: public/trips/{slug}/route-map.{png|jpeg|...}
 */
import { readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const DRIVE = "/Volumes/Ida的硬盘，丢了赔付/船客产品2026";
const PRODUCTS = join(root, "data/products.json");
const PUBLIC_TRIPS = join(root, "public/trips");
const PY = join(__dirname, "extract-pptx-route-map.py");

/** 精品 SKU 的 sourceFile 在 products.json 里可能是短文件名，需映射到硬盘相对路径 */
const SLUG_TO_REL = new Map([
  ["2026-wangguin-antarctica-22d", "2026年11月22日船去飞回双岛/2026.11.22-12.13 飞船游南极·奇遇王企鹅22天.pptx"],
  [
    "2026-arctic-eclipse-three-islands",
    "2026年7月29日北极三岛日蚀航次/方案/短线/短线-2026.7.29-8.14日全食-巡游北极三岛.pptx",
  ],
  ["2026-ecuador-four-worlds", "2026年8月厄瓜多尔/方案/2026.8.04-08.22 厄瓜多尔.pptx"],
  ["2026-kimberley-wilderness", "2026年8月金伯利/最后的荒野·奇绝金伯利-2026.8.27-9.7.pptx"],
]);

const ROUTE_MEDIA_OVERRIDES = new Map([
  // 该 PPT 的航线图页同时含有船客 logo、传统半岛示意图和定制双岛图。
  // 面积规则会误抓 logo；这里指定南乔治亚 + 南极半岛的定制航线图。
  ["2027-11-10-12-01-南极半岛-南乔治亚岛-奇遇王企鹅之旅", "ppt/media/image12.png"],
]);

function resolvePptPath(product) {
  const mapped = SLUG_TO_REL.get(product.slug);
  if (mapped) {
    const p = join(DRIVE, mapped);
    if (existsSync(p)) return p;
  }
  if (product.sourceFile) {
    const full = join(DRIVE, product.sourceFile);
    if (existsSync(full)) return full;
    const base = product.sourceFile.split("/").pop();
    if (base) {
      const found = findPptByBasename(DRIVE, base);
      if (found) return found;
    }
  }
  return null;
}

function findPptByBasename(dir, basename, depth = 0) {
  if (depth > 6) return null;
  for (const ent of readdirSync(dir)) {
    if (ent.startsWith(".")) continue;
    const p = join(dir, ent);
    try {
      const st = statSync(p);
      if (st.isDirectory()) {
        const hit = findPptByBasename(p, basename, depth + 1);
        if (hit) return hit;
      } else if (ent === basename) {
        return p;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function clearOldRouteMaps(dir) {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    if (f.startsWith("route-map.")) {
      try {
        unlinkSync(join(dir, f));
      } catch {
        /* ignore */
      }
    }
  }
}

function main() {
  if (!existsSync(DRIVE)) {
    console.error("硬盘未挂载:", DRIVE);
    process.exit(1);
  }

  const products = JSON.parse(readFileSync(PRODUCTS, "utf8"));
  let ok = 0;
  let fail = 0;
  const failed = [];

  for (const p of products) {
    const ppt = resolvePptPath(p);
    if (!ppt) {
      fail++;
      failed.push(`${p.slug}: 找不到 PPT (${p.sourceFile ?? "无 sourceFile"})`);
      continue;
    }

    const outDir = join(PUBLIC_TRIPS, p.slug);
    mkdirSync(outDir, { recursive: true });
    clearOldRouteMaps(outDir);
    const outBase = join(outDir, "route-map");

    try {
      const preferredMedia = ROUTE_MEDIA_OVERRIDES.get(p.slug);
      const written = execSync(
        `python3 ${JSON.stringify(PY)} ${JSON.stringify(ppt)} ${JSON.stringify(outBase)}${preferredMedia ? ` ${JSON.stringify(preferredMedia)}` : ""}`,
        { encoding: "utf8" },
      ).trim();
      console.log("OK", p.slug, "→", written.replace(root, ""));
      ok++;
    } catch (e) {
      fail++;
      failed.push(`${p.slug}: 提取失败`);
    }
  }

  console.log(`\n航线图: 成功 ${ok}，失败 ${fail} / ${products.length}`);
  if (failed.length) {
    console.log("失败列表:\n" + failed.map((s) => `  - ${s}`).join("\n"));
  }
  process.exit(fail > 0 ? 1 : 0);
}

main();
