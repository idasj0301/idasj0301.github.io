import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const productsRaw = JSON.parse(readFileSync(join(root, "data/products.json"), "utf8"));
const detailsDir = join(root, "data/details");
const detailsMap = {};
if (existsSync(detailsDir)) {
  for (const f of readdirSync(detailsDir)) {
    if (f.endsWith(".json")) {
      detailsMap[f.replace(/\.json$/, "")] = JSON.parse(
        readFileSync(join(detailsDir, f), "utf8"),
      );
    }
  }
}
const tripsPublic = join(root, "public/trips");
const ROUTE_MAP_NAMES = ["route-map.png", "route-map.jpeg", "route-map.jpg", "route-map.webp"];

function resolveRouteMap(slug) {
  const dir = join(tripsPublic, slug);
  if (!existsSync(dir)) return undefined;
  for (const name of ROUTE_MAP_NAMES) {
    if (existsSync(join(dir, name))) {
      return { src: `assets/trips/${slug}/${name}`, alt: "航程航线图" };
    }
  }
  return undefined;
}

const products = productsRaw
  .filter((p) => p.published)
  .map((p) => {
    const base = detailsMap[p.slug];
    const routeMap = base?.routeMap ?? resolveRouteMap(p.slug);
    const detail = base
      ? { ...base, ...(routeMap && !base.routeMap ? { routeMap } : {}) }
      : routeMap
        ? { routeMap }
        : undefined;
    return { ...p, detail };
  });
const about = JSON.parse(readFileSync(join(root, "data/about.json"), "utf8"));
const leadEndpoint = process.env.PUBLIC_LEAD_ENDPOINT ?? "";
const outDir = join(root, "..", "preview-site");
const assetsDir = join(outDir, "assets");
mkdirSync(assetsDir, { recursive: true });

const logoSrc = join(root, "public/logo.png");
try {
  cpSync(logoSrc, join(assetsDir, "logo.png"));
} catch {
  /* logo copied separately */
}

const bannerPublic = join(root, "public/banner");
const previewBanner = join(assetsDir, "banner");
mkdirSync(previewBanner, { recursive: true });
if (existsSync(bannerPublic)) {
  for (const f of readdirSync(bannerPublic)) {
    if (/\.(jpe?g|png|webp)$/i.test(f)) {
      cpSync(join(bannerPublic, f), join(previewBanner, f), { force: true });
    }
  }
}
const BANNER_DEFS = [
  {
    alt: "南极冰川",
    file: "CLF_5650.jpg",
    link: "#/trips/2026-wangguin-antarctica-22d",
    fallback: "linear-gradient(135deg,#0c1929,#1b4965)",
  },
  {
    alt: "王企鹅群落",
    file: "DSC_7726.jpg",
    link: "#/trips/2026-wangguin-antarctica-22d",
    fallback: "linear-gradient(135deg,#1b4965,#2a6f97)",
  },
  {
    alt: "极地野生动物",
    file: "CLF_3860.jpg",
    link: "#/trips/2026-wangguin-antarctica-22d",
    fallback: "linear-gradient(135deg,#0d2818,#3d8b6e)",
    objectPosition: "center 62%",
  },
];
const bannerSlides = BANNER_DEFS.filter((b) => existsSync(join(previewBanner, b.file))).map(
  (b, i) => ({
    id: i,
    alt: b.alt,
    img: `assets/banner/${b.file}`,
    link: b.link,
    fallback: b.fallback,
    objectPosition: b.objectPosition ?? "center",
  }),
);

const previewTrips = join(assetsDir, "trips");
if (existsSync(tripsPublic)) {
  cpSync(tripsPublic, previewTrips, { recursive: true, force: true });
}

const ships = JSON.parse(readFileSync(join(root, "data/ships.json"), "utf8"));
const shipProfilesDir = join(root, "data/ship-profiles");
const shipProfiles = {};
if (existsSync(shipProfilesDir)) {
  for (const f of readdirSync(shipProfilesDir)) {
    if (f.endsWith(".json")) {
      shipProfiles[f.replace(/\.json$/, "")] = JSON.parse(
        readFileSync(join(shipProfilesDir, f), "utf8"),
      );
    }
  }
}
const shipsPublic = join(root, "public/ships");
const previewShips = join(assetsDir, "ships");
if (existsSync(shipsPublic)) {
  cpSync(shipsPublic, previewShips, { recursive: true, force: true });
}

/** 与官网 PRD / 小程序首页入口对齐（顶栏 7 项 + 关于我们） */
const categories = {
  antarctic: { label: "南极", path: "antarctic", tone: "#0a2540" },
  arctic: { label: "北极", path: "arctic", tone: "#1a3a52" },
  galapagos: { label: "加拉帕戈斯", path: "galapagos", tone: "#1b4965" },
  "light-expedition": { label: "其他轻探险", path: "light-expedition", tone: "#3d2b1f" },
  ticket: { label: "单船票", path: "tickets", tone: "#1e3a5f" },
  ship: { label: "船司甄选", path: "ships", tone: "#2c3e50" },
};
const NAV_EXTRA = { about: { label: "关于我们", path: "about" } };

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="theme-color" content="#fbfbfd"/>
<title>船客 · 极地邮轮与探险旅行</title>
<style>
:root{
  --ink:#1d1d1f;--sub:#6e6e73;--bg:#fbfbfd;--surface:#fff;
  --line:rgba(0,0,0,.08);--brand:#003066;--brand-hover:#002347;--accent:#1b4965;
  --apple-link:#0066cc;--radius:18px;--nav-h:64px;
  --ease:cubic-bezier(.25,.1,.25,1);
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased}
html,body{width:100%;margin:0}
body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","PingFang SC","Helvetica Neue",sans-serif;font-size:17px;line-height:1.47059;color:var(--ink);background:var(--bg);overflow-x:hidden}
main{width:100%}
a{color:var(--apple-link);text-decoration:none}
a:hover{text-decoration:underline}
.nav-btn:hover,.nav-menu a:hover,.nav-drawer a:hover{text-decoration:none!important}
img{display:block;max-width:100%}
.wrap{max-width:1200px;margin:0 auto;padding:0 clamp(20px,4vw,48px)}
.wrap-wide{max-width:none;width:100%;margin:0 auto;padding:0 clamp(20px,4vw,48px);box-sizing:border-box}

/* Nav — 全宽三栏 */
.nav{position:sticky;top:0;z-index:100;width:100%;
  background:rgba(251,251,253,.88);backdrop-filter:saturate(180%) blur(20px);
  -webkit-backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid var(--line)}
.nav-inner{width:100%;max-width:none;margin:0;padding:0 clamp(20px,4vw,48px);min-height:var(--nav-h);
  display:grid;grid-template-columns:auto 1fr auto;align-items:center;column-gap:clamp(16px,3vw,40px)}
.nav-logo img{height:30px;width:auto}
.nav-menu{display:flex;align-items:center;justify-content:center;flex-wrap:nowrap;
  gap:clamp(8px,1vw,18px);min-width:0;overflow-x:auto;-webkit-overflow-scrolling:touch;
  scrollbar-width:none;padding:4px 0}
.nav-menu::-webkit-scrollbar{display:none}
.nav-menu a{font-size:17px;color:var(--ink);padding:10px clamp(12px,1.2vw,18px);border-radius:980px;
  text-decoration:none;white-space:nowrap;opacity:.92;flex-shrink:0}
.nav-menu a:hover{background:rgba(0,0,0,.05);text-decoration:none;opacity:1}
.nav-end{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-shrink:0}
.nav-btn{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 16px;
  font-size:14px;font-weight:500;color:var(--ink);text-decoration:none!important;white-space:nowrap;
  border-radius:980px;transition:background .2s var(--ease)}
.nav-btn:hover{background:rgba(0,0,0,.06);text-decoration:none!important}
.nav-btn-primary{background:var(--brand);color:#fff!important;padding:0 18px}
.nav-btn-primary:hover{background:var(--brand-hover);text-decoration:none!important}
.nav-search input:focus{outline:2px solid var(--brand);outline-offset:1px}
.nav-drawer-actions{display:flex;flex-direction:column;gap:10px;padding:12px 8px 4px;border-top:1px solid var(--line);margin-top:8px}
.nav-drawer-actions .nav-btn{width:100%;min-height:44px;font-size:17px}
.nav-search{flex-shrink:0}
.nav-search input{width:clamp(128px,14vw,180px);min-height:38px;padding:0 16px;border:none;border-radius:980px;
  background:rgba(0,0,0,.06);font-size:16px;font-family:inherit;color:var(--ink)}
.nav-search input::placeholder{color:var(--sub)}
.nav-menu-btn{display:none;border:1px solid var(--line);background:#fff;border-radius:980px;padding:10px 18px;
  font-size:17px;font-family:inherit;cursor:pointer;flex-shrink:0}
.nav-drawer{display:none;flex-direction:column;gap:4px;padding:12px clamp(20px,4vw,48px) 20px;
  background:rgba(251,251,253,.98);border-bottom:1px solid var(--line)}
.nav-drawer.open{display:flex}
.nav-drawer a{font-size:17px;padding:12px 8px;color:var(--ink);text-decoration:none;border-radius:8px}
.nav-drawer a:hover{background:rgba(0,0,0,.04)}
@media(max-width:900px){
  .nav-menu,.nav-search,.nav-end .nav-btn{display:none}
  .nav-menu-btn{display:inline-flex}
  .nav-inner{grid-template-columns:auto 1fr auto}
}

/* 首页：导航贴 Banner、KV 全宽通栏 */
body.page-home .nav{background:rgba(251,251,253,.8);border-bottom:none}
.home-top{background:var(--bg)}
.banner-wrap{position:relative;width:100%;margin:0;padding:0;box-sizing:border-box}
.banner{position:relative;border-radius:0;overflow:hidden;height:min(52vw,520px);
  background:#0a2540;width:100%;max-width:none}
.banner-track{display:flex;height:100%;width:100%;transition:transform .6s var(--ease)}
.banner-slide{flex:0 0 100%;width:100%;min-width:100%;height:100%;position:relative;display:block;text-decoration:none!important}
.banner-slide .banner-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;display:block}
.banner-slide .bg-fallback{position:absolute;inset:0;background-size:cover;background-position:center}
.banner-dots{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);z-index:2;
  display:flex;gap:8px}
.banner-dots button{width:8px;height:8px;border-radius:50%;border:none;background:rgba(255,255,255,.4);cursor:pointer;padding:0}
.banner-dots button.on{background:#fff;width:24px;border-radius:4px}
.dual-entry{width:100%;padding:20px clamp(20px,4vw,48px) 12px;display:grid;grid-template-columns:1fr 1fr;gap:12px;box-sizing:border-box}
.dual-entry a{text-align:center;padding:16px;border-radius:14px;font-size:17px;font-weight:500;
  text-decoration:none!important;background:#f5f5f7;color:var(--ink)}
.dual-entry a.primary{background:var(--brand);color:#fff}
.tool-row{width:100%;padding:0 clamp(20px,4vw,48px) 28px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center;box-sizing:border-box}
.tool-row a{font-size:14px;padding:10px 16px;border-radius:980px;background:var(--surface);
  box-shadow:0 1px 4px rgba(0,0,0,.06);color:var(--ink);text-decoration:none!important}
.tool-row a:hover{background:#f5f5f7}

/* Hero */
.hero{text-align:center;padding:48px 0 56px;background:var(--surface)}
.hero-eyebrow{font-size:14px;color:var(--sub);letter-spacing:.02em;margin-bottom:8px}
.hero h1{font-size:clamp(40px,6vw,64px);font-weight:600;letter-spacing:-.015em;line-height:1.05;margin-bottom:12px}
.hero-lead{font-size:clamp(19px,2.5vw,24px);font-weight:400;color:var(--sub);max-width:640px;margin:0 auto 28px;line-height:1.35}

/* About — Banner + 三要点，无大段文字墙 */
.about-kv-wrap{padding:12px clamp(20px,4vw,48px) 0}
.about-kv{position:relative;border-radius:var(--radius);overflow:hidden;height:min(40vw,440px);min-height:280px}
.about-kv .bg{position:absolute;inset:0;background-size:cover;background-position:center}
.about-kv .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.55))}
.about-kv-copy{position:absolute;left:clamp(28px,5vw,56px);right:clamp(28px,5vw,56px);bottom:28px;z-index:1;color:#fff;text-align:left;max-width:720px}
.about-kv-eyebrow{font-size:14px;letter-spacing:.1em;opacity:.92;margin-bottom:10px;line-height:1.5}
.about-kv-copy h1{font-size:clamp(28px,4.5vw,44px);font-weight:600;line-height:1.28;text-shadow:0 2px 20px rgba(0,0,0,.35)}
.about-highlights{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;
  max-width:1060px;margin:28px auto 0;padding:0 clamp(20px,4vw,48px)}
.about-highlights article{padding:22px 24px;background:#fff;border:1px solid var(--line);border-radius:14px}
.about-highlights h2{font-size:18px;font-weight:600;color:var(--accent);margin-bottom:10px;line-height:1.3}
.about-highlights p{font-size:16px;line-height:1.65;color:var(--sub);margin:0}
.about-stats{list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:32px 48px;
  margin:40px auto 0;padding:40px clamp(20px,4vw,48px) 0;max-width:1060px;border-top:1px solid var(--line)}
.about-stats li{text-align:center;min-width:120px}
.about-stats strong{display:block;font-size:clamp(28px,4vw,40px);font-weight:600;color:var(--accent);line-height:1.15;margin-bottom:10px}
.about-stats span{display:block;font-size:15px;line-height:1.5;color:var(--sub);max-width:11em;margin:0 auto}
.hero-actions{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
.link-cta{font-size:17px;color:var(--brand)}
.link-cta::after{content:" ›";}

/* Product strip — Apple category tiles */
.section{padding:12px 0 64px}
.section-head{text-align:center;padding:52px 0 36px}
.section-head h2{font-size:40px;font-weight:600;letter-spacing:-.02em}
.section-head p{font-size:19px;color:var(--sub);margin-top:8px}
.section-more-wrap{text-align:center;margin:36px auto 4px;padding:0 clamp(20px,4vw,48px) 8px}
.apple-more-link{display:inline-flex;align-items:center;gap:7px;font-size:19px;font-weight:400;
  letter-spacing:-.022em;line-height:1.23536;color:#0066cc;text-decoration:none!important;
  transition:color .2s var(--ease),gap .2s var(--ease)}
.apple-more-link::after{content:"";flex-shrink:0;width:7px;height:7px;margin-top:1px;
  border-right:1.5px solid currentColor;border-top:1.5px solid currentColor;transform:rotate(45deg);
  transition:transform .2s var(--ease)}
.apple-more-link:hover{color:#0077ed}
.apple-more-link:hover::after{transform:rotate(45deg) translate(2px,-2px)}

/* Cards row — 自适应列，避免只有 1 条时挤在左半边 */
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr));gap:20px;
  width:100%;padding:0 clamp(20px,4vw,48px) 48px;box-sizing:border-box;isolation:isolate}
.cards>.card{min-width:0}
.card{background:var(--surface);border-radius:var(--radius);overflow:hidden;
  box-shadow:inset 0 0 0 1px var(--line);transition:transform .35s var(--ease),box-shadow .35s var(--ease);
  text-decoration:none!important;color:inherit;display:flex;flex-direction:column}
.card:hover{transform:scale(1.02);box-shadow:inset 0 0 0 1px rgba(0,0,0,.1),0 12px 40px rgba(0,0,0,.08)}
.card-media{position:relative;height:min(28vw,200px);min-height:160px;display:flex;align-items:flex-end;isolation:isolate;
  padding:14px 16px;flex-shrink:0;overflow:hidden}
.card-media::after{content:"";position:absolute;inset:0;
  background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,.45) 100%);pointer-events:none}
.card-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center}
.card-media .ship-tag{position:relative;z-index:1;font-size:14px;color:#fff;background:rgba(0,0,0,.35);
  backdrop-filter:blur(8px);padding:5px 12px;border-radius:980px}
.card-body{flex:1;display:flex;flex-direction:column;gap:6px;padding:18px 18px 20px;background:var(--surface)}
.card h3{font-size:17px;font-weight:600;line-height:1.4;margin:0;color:var(--ink);
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card .card-meta{font-size:14px;color:var(--sub);margin:0;line-height:1.45}
.card .card-sub{font-size:13px;color:var(--sub);margin:0}
.card .price{font-size:18px;color:var(--ink);font-weight:600;margin:auto 0 0;padding-top:10px;letter-spacing:-.01em}
.card .price.price-consult{font-size:17px;font-weight:500;color:var(--sub)}
.card[hidden]{display:none!important}
.year-filters{display:flex;flex-wrap:wrap;gap:10px;padding:0 clamp(20px,4vw,48px);margin-bottom:20px}
.year-filter{padding:10px 20px;border-radius:980px;font-size:16px;font-weight:500;border:none;cursor:pointer;
  background:#f3f4f6;color:var(--sub)}
.year-filter.on{background:var(--brand);color:#fff}
.year-filter-empty{grid-column:1/-1;text-align:center;padding:48px 22px;color:var(--sub)}
.tag-filters{display:flex;flex-wrap:wrap;gap:10px;padding:0 clamp(20px,4vw,48px);margin-bottom:16px}
.tag-filter{padding:10px 20px;border-radius:980px;font-size:16px;font-weight:500;border:none;cursor:pointer;
  background:#f3f4f6;color:var(--sub)}
.tag-filter.on{background:var(--brand);color:#fff}

/* Detail — Apple product page */
.detail-hero{text-align:center;padding:56px 22px 40px;background:var(--surface)}
.detail-hero .eyebrow{font-size:14px;color:var(--sub);margin-bottom:6px}
.detail-hero h1{font-size:clamp(32px,5vw,48px);font-weight:600;letter-spacing:-.02em;line-height:1.08;max-width:800px;margin:0 auto 12px}
.detail-hero .sub{font-size:19px;color:var(--sub);max-width:600px;margin:0 auto 20px}
.detail-hero .price-lg{font-size:21px;margin-top:8px}
.detail-visual{height:min(48vw,400px);margin:0;max-width:none;border-radius:0;background-size:cover;background-position:center}
.trip-route-map{background:var(--bg);padding:clamp(32px,5vw,48px) clamp(20px,4vw,48px);border-bottom:1px solid var(--line)}
.trip-route-map-inner{max-width:980px;margin:0 auto}
.trip-route-map h2{font-size:clamp(24px,3vw,28px);font-weight:600;letter-spacing:-.02em;text-align:center;margin-bottom:8px}
.route-map-note{text-align:center;font-size:15px;color:var(--sub);margin-bottom:20px;line-height:1.5}
.trip-route-map figure{margin:0;background:var(--surface);border-radius:16px;padding:clamp(12px,2.5vw,24px);box-shadow:0 2px 20px rgba(0,0,0,.06)}
.trip-route-map img{width:100%;height:auto;display:block}
.route-map-ref{font-size:15px;color:var(--sub);margin:0 0 20px}
.route-map-ref a{color:var(--brand);text-decoration:none}
.route-map-ref a:hover{text-decoration:underline}
.trip-gallery{margin:28px 0 8px}
.trip-gallery h3{font-size:22px;font-weight:600;margin-bottom:8px}
.gallery-note{font-size:15px;color:var(--sub);margin-bottom:16px}
.gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.gallery-grid figure{margin:0;border-radius:12px;overflow:hidden;background:#f5f5f7}
.gallery-grid img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
.gallery-grid figcaption{font-size:13px;color:var(--sub);padding:8px 10px}

.spec-bar{background:var(--surface);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.spec-grid{display:grid;grid-template-columns:repeat(4,1fr);max-width:980px;margin:0 auto}
.spec-grid div{padding:20px 16px;text-align:center;border-right:1px solid var(--line)}
.spec-grid div:last-child{border-right:none}
.spec-grid .v{font-size:17px;font-weight:600}
.spec-grid .l{font-size:12px;color:var(--sub);margin-top:4px}
@media(max-width:734px){.spec-grid{grid-template-columns:repeat(2,1fr)}.spec-grid div:nth-child(2){border-right:none}}

.detail-content{max-width:720px;margin:0 auto;padding:48px 22px 100px}
.detail-content h2{font-size:28px;font-weight:600;letter-spacing:-.02em;margin:40px 0 16px}
.detail-content h2:first-child{margin-top:0}
.detail-content p,.detail-content li{font-size:19px;line-height:1.55;color:var(--ink)}
.detail-content ul{padding-left:1.2em;margin:12px 0}
.detail-content li{margin:10px 0;color:var(--sub)}
.detail-content li strong{color:var(--ink)}

.tabs-sticky{position:sticky;top:var(--nav-h);z-index:50;background:rgba(251,251,253,.92);
  backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}
.tabs-inner{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:14px 22px;max-width:980px;margin:0 auto}
.tabs-inner button{border:none;background:none;font-size:17px;color:var(--sub);cursor:pointer;
  padding:8px 14px;border-radius:980px;white-space:nowrap;font-family:inherit}
.tabs-inner button.on{background:var(--brand);color:#fff;font-weight:500}
.route-tab-link{border:none;background:none;padding:0;font:inherit;color:var(--brand);cursor:pointer;text-decoration:underline}
.trip-route-map--embedded{background:transparent;padding:0 0 28px;border-bottom:none}
.trip-route-map--embedded h2{text-align:left;font-size:22px}
.trip-route-map--embedded .route-map-note{text-align:left}
.detail-content .tab-panel{display:none;animation:fadeIn .5s var(--ease)}
.detail-content .tab-panel.on{display:block}
.detail-hero-rich{text-align:center;padding:40px 22px 28px;background:var(--surface)}
.detail-hero-rich .eyebrow-en{font-size:15px;color:var(--sub);letter-spacing:.02em;margin-bottom:6px}
.detail-hero-rich .eyebrow{font-size:17px;color:var(--sub);margin-bottom:8px}
.detail-hero-rich h1{font-size:clamp(28px,4vw,40px);font-weight:600;letter-spacing:-.02em;line-height:1.1;margin-bottom:12px}
.detail-tags{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:12px 0 20px}
.detail-tags span{font-size:14px;padding:4px 12px;border-radius:980px;background:#eef4fa;color:var(--accent)}
.detail-tags span:first-child{background:#fef3e2;color:#b45309}
.spec-sheet{margin:20px 0 24px;border-radius:14px;background:#fff;border:1px solid var(--line);overflow:hidden}
.spec-row{display:grid;grid-template-columns:minmax(6.5em,30%) 1fr;gap:12px 20px;padding:16px 20px;
  border-bottom:1px solid var(--line);align-items:baseline}
.spec-row:last-child{border-bottom:none}
.spec-row dt{margin:0;font-size:15px;font-weight:500;color:var(--sub);line-height:1.45}
.spec-row dd{margin:0;font-size:17px;line-height:1.55;color:var(--ink)}
@media(max-width:520px){.spec-row{grid-template-columns:1fr;gap:6px;padding:14px 16px}}
.data-table{width:100%;border-collapse:collapse;font-size:17px;margin:16px 0 24px;border-radius:14px;
  overflow:hidden;background:#fff;border:1px solid var(--line)}
.data-table th,.data-table td{border:none;border-bottom:1px solid var(--line);padding:14px 18px;text-align:left;vertical-align:top}
.data-table thead th{background:#fbfbfd;font-size:13px;font-weight:500;color:var(--sub);padding-top:12px;padding-bottom:12px}
.data-table tbody tr:last-child td{border-bottom:none}
.data-table .sold{color:var(--sub);text-decoration:line-through}
.detail-content h3{font-size:22px;font-weight:600;margin:28px 0 12px;color:var(--accent)}
.detail-content .block{margin-bottom:24px}
.day-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-bottom:14px}
.day-hd{display:flex;justify-content:space-between;font-size:15px;font-weight:600;color:var(--accent);margin-bottom:8px}
.day-meta{font-size:15px;color:var(--sub);background:#f5f5f7;padding:8px 12px;border-radius:8px;margin:8px 0}
.day-card h4{font-size:19px;font-weight:600;margin:4px 0 8px}
.note{font-size:15px;color:var(--sub);margin-top:16px;padding:14px;background:#fef3e2;border-radius:10px}
.detail-content .lead{margin-top:20px;color:var(--sub)}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* 航程详情 · 底部咨询栏 */
.trip-cta{position:fixed;bottom:0;left:0;right:0;z-index:90;padding:0 clamp(20px,4vw,48px) calc(16px + env(safe-area-inset-bottom));
  background:rgba(251,251,253,.94);backdrop-filter:saturate(180%) blur(20px);border-top:1px solid var(--line);
  box-shadow:0 -6px 28px rgba(0,0,0,.06)}
.trip-cta-inner{max-width:1060px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;
  gap:20px;min-height:68px;padding:12px 0}
.trip-cta-copy{display:flex;flex-direction:column;gap:5px;min-width:0}
.trip-cta-price{margin:0;font-size:20px;font-weight:600;letter-spacing:-.01em;line-height:1.2}
.trip-cta-sub{margin:0;font-size:13px;line-height:1.45;color:var(--sub)}
.trip-cta-btn{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;min-height:48px;
  padding:0 32px;font-size:17px;font-weight:500;color:#fff;background:var(--brand);border-radius:980px;
  text-decoration:none!important;box-shadow:0 4px 14px rgba(0,48,102,.28)}
.trip-cta-btn:hover{background:var(--brand-hover);text-decoration:none!important}
.trip-cta-actions{display:flex;align-items:center;gap:10px;flex-shrink:0}
.trip-cta-secondary{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;
  font-size:16px;font-weight:500;color:var(--apple-link);background:#fff;border-radius:980px;text-decoration:none!important;
  box-shadow:inset 0 0 0 1px var(--line)}
.trip-cta-secondary:hover{background:#f5f5f7;text-decoration:none!important}
@media(max-width:480px){
  .trip-cta-inner{flex-wrap:wrap}
  .trip-cta-actions{width:100%}
  .trip-cta-secondary,.trip-cta-btn{flex:1;font-size:15px;padding:0 12px}
}

/* 预约留资 */
.inquiry-page{max-width:520px;margin:0 auto;padding:32px clamp(20px,4vw,48px) 80px}
.inquiry-hero{text-align:center;margin-bottom:28px}
.inquiry-eyebrow{font-size:14px;letter-spacing:.1em;color:var(--sub);margin-bottom:10px}
.inquiry-hero h1{font-size:clamp(30px,5vw,38px);font-weight:600;line-height:1.25;margin-bottom:10px}
.inquiry-tagline{font-size:17px;color:var(--sub);margin:0}
.inquiry-card{background:#fff;border:1px solid var(--line);border-radius:20px;padding:28px 24px 32px;
  box-shadow:0 8px 32px rgba(27,73,101,.08)}
.inquiry-alt{text-align:center;font-size:15px;color:var(--sub);margin-top:24px;line-height:1.8}
.lead-form .field{margin-bottom:18px}
.lead-form label{display:block;font-size:15px;font-weight:500;margin-bottom:8px}
.lead-form input,.lead-form select,.lead-form textarea{width:100%;min-height:48px;padding:12px 14px;font-size:17px;
  border:1px solid var(--line);border-radius:12px;font-family:inherit}
.lead-form textarea{min-height:96px;resize:vertical}
.lead-trip{font-size:16px;color:var(--sub);margin-bottom:20px;padding:12px 16px;background:#f5f5f7;border-radius:12px}
.lead-consent{display:flex;gap:10px;font-size:14px;color:var(--sub);margin-bottom:12px;align-items:flex-start}
.lead-consent input{margin-top:3px}
.lead-hint{font-size:14px;color:var(--sub);margin-bottom:16px;line-height:1.5}
.lead-submit{width:100%;min-height:48px;border:none;border-radius:980px;background:var(--brand);color:#fff;
  font-size:17px;font-weight:500;cursor:pointer;font-family:inherit}
.lead-error{color:#b91c1c;font-size:15px;margin-top:12px}
.lead-success{text-align:center;padding:8px 0}
.lead-success h2{font-size:24px;font-weight:600;margin-bottom:12px}
.lead-success p{font-size:17px;color:var(--sub);line-height:1.55;margin-bottom:24px}
.lead-success .btn-primary,.lead-success .btn-outline{display:flex;width:100%;min-height:48px;align-items:center;justify-content:center;
  border-radius:980px;font-size:17px;font-weight:500;text-decoration:none!important;margin-bottom:12px}
.lead-success .btn-primary{background:var(--brand);color:#fff}
.lead-success .btn-outline{color:var(--apple-link);box-shadow:inset 0 0 0 1px var(--line)}

/* 联系顾问页 */
.advisor-page{max-width:520px;margin:0 auto;padding:32px clamp(20px,4vw,48px) 80px}
.advisor-hero{text-align:center;margin-bottom:32px}
.advisor-eyebrow{font-size:14px;letter-spacing:.1em;color:var(--sub);margin-bottom:12px}
.advisor-hero h1{font-size:clamp(32px,5vw,40px);font-weight:600;line-height:1.2;margin-bottom:12px}
.advisor-tagline{font-size:17px;line-height:1.55;color:var(--sub);margin:0}
.advisor-card{background:#fff;border:1px solid var(--line);border-radius:20px;padding:32px 28px;
  box-shadow:0 8px 32px rgba(27,73,101,.08)}
.advisor-qr{display:flex;justify-content:center;margin-bottom:28px}
.advisor-qr-box{width:220px;height:220px;border-radius:16px;background:linear-gradient(145deg,#f5f5f7,#eef4fa);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:15px;color:var(--sub);text-align:center}
.advisor-steps{list-style:none;padding:0;margin:0 0 28px;display:flex;flex-direction:column;gap:16px}
.advisor-steps li{display:flex;gap:14px;align-items:flex-start}
.advisor-steps .n{flex-shrink:0;width:28px;height:28px;border-radius:50%;background:var(--accent);color:#fff;
  font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center}
.advisor-steps strong{display:block;font-size:17px;margin-bottom:4px}
.advisor-steps p{font-size:15px;color:var(--sub);margin:0;line-height:1.5}
.advisor-actions{display:flex;flex-direction:column;gap:12px}
.advisor-actions .btn-primary,.advisor-actions .btn-outline{width:100%;min-height:48px;display:flex;align-items:center;justify-content:center;
  border-radius:980px;font-size:17px;font-weight:500;text-decoration:none!important}
.advisor-actions .btn-primary{background:var(--brand);color:#fff}
.advisor-actions .btn-outline{color:var(--apple-link);box-shadow:inset 0 0 0 1px var(--line);background:#fff}
.advisor-trust{list-style:none;padding:24px 0 0;margin:0;text-align:center;font-size:14px;color:var(--sub);line-height:1.8}

footer{background:var(--surface);border-top:1px solid var(--line);padding:32px 0 48px;margin-top:40px}
footer .cols{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:24px;font-size:12px}
footer h4{font-size:12px;color:var(--sub);margin-bottom:10px;font-weight:400}
footer a{display:block;color:var(--sub);margin:6px 0;text-decoration:none}
footer a:hover{color:var(--ink);text-decoration:underline}
footer .legal{margin-top:24px;font-size:12px;color:var(--sub)}

.reveal{opacity:0;transform:translateY(24px);transition:opacity .8s var(--ease),transform .8s var(--ease)}
.reveal.visible{opacity:1;transform:none}

@media(prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none}.tile:hover,.card:hover{transform:none}}
body.has-cta{padding-bottom:calc(92px + env(safe-area-inset-bottom))}

.ship-picker-lead{text-align:center;font-size:19px;color:var(--sub);max-width:32em;margin:0 auto 32px;line-height:1.5;padding:0 22px}
.ship-picker-grid{list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:12px;
  padding:0 clamp(20px,4vw,48px) 48px;max-width:1060px;margin:0 auto}
.ship-tile{display:flex;flex-direction:column;align-items:center;text-align:center;padding:28px 20px 22px;background:var(--surface);
  border-radius:var(--radius);text-decoration:none!important;color:inherit;position:relative;overflow:hidden;
  transition:transform .35s var(--ease),background .35s var(--ease)}
.ship-tile::before{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px var(--line);pointer-events:none;transition:box-shadow .35s var(--ease)}
.ship-tile:hover{transform:scale(1.02);background:#f5f5f7}
.ship-tile:hover::before{box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
.ship-tile-logo{height:52px;width:100%;display:flex;align-items:center;justify-content:center;margin-bottom:14px}
.ship-tile-logo img{max-height:44px;max-width:150px;object-fit:contain;transition:transform .35s var(--ease)}
.ship-tile:hover .ship-tile-logo img{transform:scale(1.04)}
.ship-tile-text{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
.ship-tile-text strong{font-size:19px;font-weight:600;letter-spacing:-.01em;color:var(--ink)}
.ship-tile-text .en{font-size:14px;color:var(--sub)}
.ship-tile-cta{font-size:15px;color:var(--sub);display:inline-flex;align-items:center;gap:2px;margin-top:auto}
.ship-tile.has-profile .ship-tile-cta{color:var(--brand)}
.ship-tile .chev{font-size:18px;transition:transform .25s var(--ease)}
.ship-tile:hover .chev{transform:translateX(3px)}
.ship-profile-hero{background:var(--surface);border-bottom:1px solid var(--line);padding:32px clamp(20px,4vw,48px) 48px}
.ship-profile-hero .crumb{max-width:980px;margin:0 auto 20px;font-size:14px;color:var(--sub)}
.ship-profile-hero .crumb a{color:var(--brand);text-decoration:none}
.ship-profile-inner{max-width:980px;margin:0 auto;display:grid;grid-template-columns:1fr minmax(260px,42%);gap:32px;align-items:center}
.ship-profile-copy h1{font-size:clamp(32px,5vw,48px);font-weight:600;letter-spacing:-.02em;line-height:1.08;margin:8px 0 12px}
.ship-profile-copy .lead{font-size:19px;color:var(--sub);line-height:1.5;margin-bottom:16px}
.ship-profile-copy .eyebrow{font-size:15px;color:var(--sub);margin-bottom:8px}
.ship-profile-media{margin:0;border-radius:16px;overflow:hidden;background:#f5f5f7}
.ship-profile-media img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
.ship-spec-bar{background:var(--surface);border-bottom:1px solid var(--line)}
.ship-spec-bar .spec-grid{max-width:980px}
.ship-detail-main{max-width:1060px;margin:0 auto;padding:48px clamp(20px,4vw,48px) 80px;box-sizing:border-box}
.ship-detail-main h2{font-size:28px;font-weight:600;letter-spacing:-.02em;margin:40px 0 16px}
.ship-detail-main h2:first-child{margin-top:0}
.ship-detail-main p,.ship-detail-main li{font-size:19px;line-height:1.55;color:var(--sub)}
.ship-detail-main .hi-list{list-style:none;padding:0;display:grid;gap:10px}
.ship-detail-main .hi-list li{padding:14px 18px;background:#fff;border:1px solid var(--line);border-radius:12px;color:var(--ink)}
.ship-gallery-prev{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0 8px;width:100%}
.ship-gallery-prev img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px;display:block}
@media(max-width:734px){.ship-gallery-prev{grid-template-columns:repeat(2,1fr)}}
.ship-related-section{margin-top:48px;padding-top:48px;border-top:1px solid var(--line)}
.ship-related-section>h2{margin-top:0;text-align:left}
.ship-trip-cards{display:flex;flex-wrap:wrap;gap:20px;align-items:stretch}
.ship-trip-cards .card{flex:0 1 min(360px,100%);max-width:400px}
@media(max-width:900px){.ship-profile-inner{grid-template-columns:1fr}.ship-profile-media{order:-1}}
</style>
</head>
<body>
<header class="nav">
  <div class="nav-inner">
    <a class="nav-logo" href="#/" aria-label="船客首页"><img src="assets/logo.png" alt="船客" width="120" height="40"/></a>
    <nav class="nav-menu" aria-label="主导航">
      ${Object.values(categories).map((c) => `<a href="#/${c.path}">${c.label}</a>`).join("")}
      <a href="#/about">${NAV_EXTRA.about.label}</a>
    </nav>
    <div class="nav-end">
      <form class="nav-search" action="#/trips" onsubmit="location.hash='/trips?q='+encodeURIComponent(this.q.value);return false" role="search">
        <input name="q" type="search" placeholder="搜索" aria-label="搜索航程"/>
      </form>
      <a href="#/inquiry" class="nav-btn">预约留资</a>
      <a href="#/advisor" class="nav-btn nav-btn-primary">联系顾问</a>
      <button type="button" class="nav-menu-btn" id="nav-menu-btn" aria-expanded="false">菜单</button>
    </div>
  </div>
  <nav class="nav-drawer" id="nav-drawer" aria-label="移动端导航">
    ${Object.values(categories).map((c) => `<a href="#/${c.path}">${c.label}</a>`).join("")}
    <a href="#/about">${NAV_EXTRA.about.label}</a>
    <div class="nav-drawer-actions">
      <a href="#/inquiry" class="nav-btn">预约留资</a>
      <a href="#/advisor" class="nav-btn nav-btn-primary">联系顾问</a>
    </div>
  </nav>
</header>
<main id="app"></main>
<footer>
  <div class="wrap-wide cols">
    <div><h4>选航线</h4>${Object.values(categories).map((c) => `<a href="#/${c.path}">${c.label}</a>`).join("")}</div>
    <div><h4>探索</h4><a href="#/trips">全部航程</a><a href="#/inquiry">预约留资</a><a href="#/advisor">直连顾问</a></div>
    <div><h4>船客</h4><a href="#/about">关于我们</a><a href="#/inquiry">预约留资</a></div>
  </div>
  <p class="wrap-wide legal">预览版 · 内容来自产品 PPT · Copyright © 船客</p>
</footer>
<script>
const PRODUCTS = ${JSON.stringify(products)};
const SHIPS = ${JSON.stringify(ships)};
const SHIP_PROFILES = ${JSON.stringify(shipProfiles)};
const CAT = ${JSON.stringify(categories)};
const ANTARCTIC_TAG_FILTERS = ["全部","双飞","单飞","南极过大年","半环南极","延长线"];
function isExtensionProduct(p){
  return p.slug.startsWith("ext-")||(p.sourceFile||"").includes("延长线")||p.subcategory==="延长线";
}
function formatPriceLabel(n){
  const v=Number(n)||0;
  if(v>0) return '¥'+v.toLocaleString('zh-CN')+' 起';
  return '价格咨询';
}
function categoryProductList(kk,tag){
  let list=PRODUCTS.filter(p=>p.category===kk&&p.published);
  if(tag==="延长线") return list.filter(isExtensionProduct);
  list=list.filter(p=>!isExtensionProduct(p));
  if(tag&&tag!=="全部"){
    list=list.filter(p=>p.subcategory===tag||(p.tags||[]).includes(tag)||p.title.includes(tag));
  }
  return list;
}
function tagFilterHtml(kk,activeTag){
  if(kk!=="antarctic") return "";
  const cur=activeTag||"全部";
  return '<div class="tag-filters" data-cat="'+kk+'" role="tablist" aria-label="航程筛选">'+
    ANTARCTIC_TAG_FILTERS.map(t=>'<button type="button" class="tag-filter'+(t===cur?" on":"")+'" data-tag="'+esc(t)+'">'+esc(t)+'</button>').join("")+
    '</div>';
}
function bindTagFilters(){
  document.querySelectorAll(".tag-filters[data-cat]").forEach(bar=>{
    bar.querySelectorAll(".tag-filter").forEach(btn=>{
      btn.onclick=()=>{
        const cat=bar.dataset.cat;
        const tag=btn.dataset.tag||"全部";
        location.hash="/"+CAT[cat].path+(tag==="全部"?"":"?tag="+encodeURIComponent(tag));
      };
    });
  });
}
const ABOUT = ${JSON.stringify(about)};
const LEAD_ENDPOINT = ${JSON.stringify(leadEndpoint)};
const GRAD = {
  antarctic:"linear-gradient(145deg,#0c1929 0%,#1b4965 45%,#2d6a8f 100%)",
  arctic:"linear-gradient(145deg,#0f1c2e 0%,#2a4a6b 50%,#5b8ab5 100%)",
  galapagos:"linear-gradient(145deg,#0d2818 0%,#1a5c40 50%,#3d8b6e 100%)",
  "light-expedition":"linear-gradient(145deg,#2c1810 0%,#6b4423 50%,#a67c52 100%)",
  ticket:"linear-gradient(145deg,#1a2a3a 0%,#3d5a73 100%)",
  ship:"linear-gradient(145deg,#1b2838 0%,#4a6278 100%)"
};
const BANNER_SLIDES = ${JSON.stringify(bannerSlides)};
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function observeReveal(){
  requestAnimationFrame(()=>{
    document.querySelectorAll('.reveal').forEach(el=>{
      new IntersectionObserver((e,o)=>{e.forEach(x=>{if(x.isIntersecting){x.target.classList.add('visible');o.unobserve(x.target)}})},{threshold:.12}).observe(el);
    });
  });
}
function cardCoverHtml(p){
  const d=p.detail;
  const src=d&&(d.heroImage||(d.gallery&&d.gallery[0]&&d.gallery[0].src));
  if(src) return '<img class="card-img" src="'+assetPath(src)+'" alt="" loading="lazy" decoding="async"/>';
  return '';
}
const TITLE_STOP=/(?:出发\\s*\\/\\s*到达|航次安排|行程由船长|行程简介|Itinerary\\s+Introduction|SAIL\\s*&\\s*FLY|FLY\\s*&\\s*SAIL|ANTARCTICA|Arctic\\s+北极|Mediterranean|VISIT\\s+TWO|VANILLA\\s+FOUR|雷克雅未克|->)/i;
function cleanCardTitle(p){
  let t=String(p.title||'').replace(/\\s+/g,' ').trim();
  const cut=t.search(TITLE_STOP);
  if(cut>20) t=t.slice(0,cut).trim();
  t=t.replace(/([\\u4e00-\\u9fff])\\s+(?=[\\u4e00-\\u9fff])/g,'$1');
  t=t.replace(/20(26|27|28)\\s+20\\1年?/g,'20$1');
  const fn=(p.sourceFile||'').split('/').pop().replace(/\\.pptx$/i,'').replace(/^短线-|^长线-/,'');
  if(t.length>56&&fn.length>=6&&fn.length<=56) t=fn;
  if(t.length>56) t=t.slice(0,54).trim()+'…';
  return t;
}
function cardDateLine(p){
  const start=new Date(p.departureDate+'T12:00:00');
  const end=new Date(start); end.setDate(end.getDate()+(p.durationDays||1)-1);
  const sy=start.getFullYear(),sm=start.getMonth()+1,sd=start.getDate();
  const ey=end.getFullYear(),em=end.getMonth()+1,ed=end.getDate();
  if(sy===ey) return sy+'年'+sm+'月'+sd+'日 – '+em+'月'+ed+'日 · '+(p.durationDays||'')+'天';
  return sy+'年'+sm+'月'+sd+'日 – '+ey+'年'+em+'月'+ed+'日 · '+(p.durationDays||'')+'天';
}
function cardSub(p){
  const parts=[p.subcategory].concat(p.tags||[]).filter(Boolean);
  const uniq=[...new Set(parts)].filter(x=>x.length<=12).slice(0,3);
  return uniq.length?uniq.join(' · '):'';
}
function departureYears(list){
  const y=new Set(list.map(p=>parseInt(String(p.departureDate).slice(0,4),10)).filter(n=>!isNaN(n)));
  return [...y].sort((a,b)=>a-b);
}
function yearFilterHtml(years,gridId){
  if(years.length<2) return '';
  return '<div class="year-filters" data-grid="'+gridId+'" role="tablist">'+
    '<button type="button" class="year-filter on" data-year="all">全部</button>'+
    years.map(y=>'<button type="button" class="year-filter" data-year="'+y+'">'+y+'</button>').join('')+
    '</div>';
}
function cards(list){
  return list.map(p=>{
    const g=GRAD[p.category]||GRAD.antarctic;
    const cover=cardCoverHtml(p);
    const bg=cover?'':'background:'+g+';';
    const yr=String(p.departureDate||'').slice(0,4);
    const sub=cardSub(p);
    return '<a class="card reveal" href="#/trips/'+encodeURIComponent(p.slug)+'" data-year="'+esc(yr)+'">'+
      '<div class="card-media" style="'+bg+'">'+cover+'<span class="ship-tag">'+esc(p.shipName)+'</span></div>'+
      '<div class="card-body"><h3>'+esc(cleanCardTitle(p))+'</h3>'+
      '<p class="card-meta">'+esc(cardDateLine(p))+'</p>'+
      (sub?'<p class="card-sub">'+esc(sub)+'</p>':'')+
      '<p class="price'+(p.priceFrom>0?'':' price-consult')+'">'+esc(formatPriceLabel(p.priceFrom))+'</p></div></a>';
  }).join('');
}
function bindYearFilters(){
  document.querySelectorAll('.year-filters[data-grid]').forEach(bar=>{
    if(bar.dataset.bound) return;
    bar.dataset.bound='1';
    const grid=document.getElementById(bar.dataset.grid);
    if(!grid) return;
    const cardNodes=grid.querySelectorAll('.card[data-year]');
    const buttons=bar.querySelectorAll('.year-filter');
    function apply(year){
      cardNodes.forEach(c=>{c.hidden=year!=='all'&&c.dataset.year!==year;});
      const vis=year==='all'?cardNodes.length:[...cardNodes].filter(c=>!c.hidden).length;
      let empty=grid.querySelector('.year-filter-empty');
      if(!vis){
        if(!empty){empty=document.createElement('p');empty.className='year-filter-empty';
          empty.textContent=year+' 年暂无在售航程，可切换其他年份或联系顾问。';grid.appendChild(empty);}
      } else if(empty) empty.remove();
    }
    buttons.forEach(btn=>btn.onclick=()=>{
      const year=btn.dataset.year||'all';
      buttons.forEach(b=>b.classList.toggle('on',b===btn));
      apply(year);
    });
  });
}
function br(s){return esc(s).replace(/\\n/g,'<br>')}
function metaTable(rows){
  return '<dl class="spec-sheet">'+rows.map(r=>'<div class="spec-row"><dt>'+esc(r[0])+'</dt><dd>'+esc(r[1])+'</dd></div>').join('')+'</dl>';
}
function assetPath(url){
  if(!url) return '';
  const p=url.startsWith('/')?url.slice(1):url;
  if(p.startsWith('trips/')||p.startsWith('ships/')||p.startsWith('banner/')) return 'assets/'+p;
  return p;
}
function routeMapBlock(d,embedded){
  if(!d||!d.routeMap||!d.routeMap.src) return '';
  const m=d.routeMap;
  const note=m.caption?'<p class="route-map-note">'+esc(m.caption)+'</p>':'';
  const cls=embedded?'trip-route-map trip-route-map--embedded':'trip-route-map';
  const tag=embedded?'div':'section';
  return '<'+tag+' class="'+cls+'" aria-labelledby="route-map-title"><div class="trip-route-map-inner">'+
    '<h2 id="route-map-title">航线图</h2>'+note+
    '<figure><img src="'+assetPath(m.src)+'" alt="'+esc(m.alt||'航程航线图')+'" loading="lazy" decoding="async"/></figure>'+
    '</div></'+tag+'>';
}
function panelRoute(p,d){
  return routeMapBlock(d,true);
}
function routeMapRef(){
  return '<p class="route-map-ref">建议先查看 <button type="button" class="route-tab-link" data-goto-tab="route">航线</button> 页对照每日行程。</p>';
}
function galleryHtml(d){
  if(!d||!d.gallery||!d.gallery.length) return '';
  const items=d.gallery.map(g=>{
    const cap=g.caption?'<figcaption>'+esc(g.caption)+'</figcaption>':'';
    return '<figure><img src="'+assetPath(g.src)+'" alt="'+esc(g.alt)+'" loading="lazy"/>'+cap+'</figure>';
  }).join('');
  return '<div class="trip-gallery"><h3>航程实拍</h3><p class="gallery-note">2025年11月22日南极航线 · 摄影师 李可莱 / 芦迪</p><div class="gallery-grid">'+items+'</div></div>';
}
function panelOverview(p,d){
  let h='';
  if(d&&d.routeMap) h+=routeMapBlock(d,true);
  h+='<h2>产品概述</h2>';
  if(d&&d.metaTable) h+=metaTable(d.metaTable);
  else h+='<p>'+esc(p.overview||p.summary)+'</p>';
  if(d&&d.cabins&&d.cabins.length){
    h+='<h3>舱位与价格</h3><table class="data-table"><thead><tr><th>舱位</th><th>说明</th><th>价格</th></tr></thead><tbody>';
    h+=d.cabins.map(c=>'<tr><td>'+esc(c.name)+'</td><td>'+esc(c.spec)+'</td><td class="'+(c.soldOut?'sold':'')+'">'+(c.soldOut?esc(c.price)+' 售罄':esc(c.price))+'</td></tr>').join('');
    h+='</tbody></table>';
  }
  h+=galleryHtml(d);
  return h+'<p class="lead">'+esc(p.summary)+'</p>';
}
function panelHighlight(p,d){
  let h='<h2>航行亮点</h2>';
  if(d&&d.highlightSections){
    h+=d.highlightSections.map(s=>{
      let b='<div class="block"><h3>'+esc(s.title)+'</h3>';
      if(s.content) b+='<p>'+br(s.content)+'</p>';
      if(s.bullets) b+='<ul>'+s.bullets.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
      return b+'</div>';
    }).join('');
  } else h+='<ul>'+(p.highlights||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
  return h;
}
function panelSchedule(p,d){
  let h='<h2>每日安排</h2>';
  if(d&&d.routeMap) h+=routeMapRef();
  const days=d&&d.itinerary?d.itinerary:(p.itinerary||[]);
  h+=days.map(d0=>{
    let c='<div class="day-card"><div class="day-hd"><span>DAY '+d0.day+'</span>';
    if(d0.date) c+='<span>'+esc(d0.date)+'</span>';
    c+='</div><h4>'+esc(d0.title)+'</h4>';
    if(d0.meta) c+='<p class="day-meta">'+esc(d0.meta)+'</p>';
    return c+'<p>'+br(d0.content)+'</p></div>';
  }).join('');
  if(d&&d.itineraryNote) h+='<p class="note">'+esc(d.itineraryNote)+'</p>';
  return h;
}
function panelShip(p,d){
  let h='<h2>邮轮与舱位</h2>';
  if(d&&d.shipDetail){
    const s=d.shipDetail;
    h+='<h3>'+esc(s.name)+'</h3><p>'+br(s.intro||'')+'</p>';
    if(s.specs) h+=metaTable(s.specs);
    if(s.facilities){h+='<h3>公共区域</h3><ul>'+s.facilities.map(f=>'<li>'+esc(f)+'</li>').join('')+'</ul>';}
    if(s.cabins) h+=s.cabins.map(c=>'<div class="day-card"><h4 class="'+(c.soldOut?'sold':'')+'">'+esc(c.name)+' · '+esc(c.price)+(c.soldOut?' 售罄':'')+'</h4><p>'+esc(c.spec)+'</p></div>').join('');
  } else h+='<p>'+esc(p.ship||'')+'</p>';
  return h;
}
function panelFee(p,d){
  let h='<h2>费用说明</h2>';
  if(d&&d.feeIncluded){
    h+='<h3>费用包含</h3><ul>'+d.feeIncluded.map(i=>'<li>'+esc(i)+'</li>').join('')+'</ul>';
    if(d.feeExcluded) h+='<h3>费用不含</h3><ul>'+d.feeExcluded.map(i=>'<li>'+esc(i)+'</li>').join('')+'</ul>';
  } else h+='<p>'+esc(p.feeNote||'')+'</p>';
  return h;
}
function panelNotice(p,d){
  let h='<h2>出行须知</h2>';
  if(d&&d.noticeSections){
    h+=d.noticeSections.map(s=>{
      let b='<div class="block"><h3>'+esc(s.title)+'</h3>';
      if(s.content) b+='<p>'+esc(s.content)+'</p>';
      if(s.bullets) b+='<ul>'+s.bullets.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
      if(s.table) b+=metaTable(s.table);
      return b+'</div>';
    }).join('');
  } else h+='<p>'+esc(p.notice||'')+'</p>';
  return h;
}
function tripPage(p){
  const d=p.detail||null;
  const cat=CAT[p.category];
  const tabs=[['overview','概览']];
  if(d&&d.routeMap) tabs.push(['route','航线']);
  tabs.push(['highlight','亮点'],['schedule','日程'],['ship','邮轮'],['fee','费用'],['notice','须知']);
  const panels={overview:panelOverview,route:panelRoute,highlight:panelHighlight,schedule:panelSchedule,ship:panelShip,fee:panelFee,notice:panelNotice};
  const tabBtns=tabs.map((t,i)=>'<button type="button" class="'+(i?'':'on')+'" data-t="'+t[0]+'">'+t[1]+'</button>').join('');
  const panelHtml=tabs.map((t,i)=>'<section class="tab-panel '+(i?'':'on')+'" data-p="'+t[0]+'">'+(panels[t[0]]||function(){return ''})(p,d)+'</section>').join('');
  const tags=d&&d.tags?'<div class="detail-tags">'+d.tags.map(t=>'<span>'+esc(t)+'</span>').join('')+'</div>':'';
  document.body.classList.add('has-cta');
  return '<section class="detail-hero-rich">'+
    (d&&d.titleEn?'<p class="eyebrow-en">'+esc(d.titleEn)+'</p>':'')+
    '<p class="eyebrow">'+esc(cat.label)+' · '+esc(d&&d.subtitle?d.subtitle:p.shipName)+'</p>'+
    '<h1>'+esc(p.title)+'</h1>'+tags+
    '<div class="spec-bar"><div class="spec-grid"><div><span class="v">'+p.durationDays+'天</span><span class="l">行程</span></div>'+
    '<div><span class="v">'+esc(p.departureDate)+'</span><span class="l">出发</span></div>'+
    '<div><span class="v">'+esc(formatPriceLabel(p.priceFrom))+'</span><span class="l">参考价</span></div>'+
    '<div><span class="v">'+esc(p.shipName)+'</span><span class="l">邮轮</span></div></div></div></section>'+
    '<div class="detail-visual" style="'+(d&&d.heroImage?'background-image:url('+assetPath(d.heroImage)+');background-size:cover;background-position:center':'background:'+GRAD[p.category])+'" role="img" aria-label="'+esc(p.imageAlt||p.title)+'"></div>'+
    '<div class="tabs-sticky"><div class="tabs-inner">'+tabBtns+'</div></div>'+
    '<div class="detail-content">'+panelHtml+'</div>'+
    tripCtaHtml(formatPriceLabel(p.priceFrom),p.slug,p.title);
}
function tripCtaHtml(price,slug,title){
  let inq='#/inquiry';
  if(slug){
    inq+='?trip='+encodeURIComponent(slug);
    if(title) inq+='&title='+encodeURIComponent(title);
  }
  return '<aside class="trip-cta" aria-label="预约咨询"><div class="trip-cta-inner">'+
    '<div class="trip-cta-copy"><p class="trip-cta-price">'+esc(price)+'</p>'+
    '<p class="trip-cta-sub">专属顾问 · 舱位说明与出行建议</p></div>'+
    '<div class="trip-cta-actions"><a class="trip-cta-secondary" href="'+inq+'">预约留资</a>'+
    '<a class="trip-cta-btn" href="#/advisor">联系顾问</a></div></div></aside>';
}
function leadFormHtml(opts){
  opts=opts||{};
  const trip=opts.tripTitle?'<p class="lead-trip">咨询航程：<strong>'+esc(opts.tripTitle)+'</strong></p>':'';
  const interestOpts='<option value="">暂不确定</option><option value="南极">南极</option><option value="北极">北极</option>'+
    '<option value="加拉帕戈斯">加拉帕戈斯</option><option value="其他轻探险">其他轻探险</option><option value="其他">其他</option>';
  return '<form class="lead-form" id="lead-form">'+trip+
    '<input type="hidden" name="tripSlug" value="'+esc(opts.tripSlug||'')+'"/>'+
    '<input type="hidden" name="tripTitle" value="'+esc(opts.tripTitle||'')+'"/>'+
    '<input type="hidden" name="source" value="'+esc(opts.source||'inquiry')+'"/>'+
    '<div class="field"><label>您的称呼 *</label><input name="name" required placeholder="例如：张先生"/></div>'+
    '<div class="field"><label>手机或微信 *</label><input name="contact" required placeholder="便于顾问联系您"/></div>'+
    '<div class="field"><label>感兴趣的方向</label><select name="interest">'+interestOpts+'</select></div>'+
    '<div class="field"><label>补充说明（选填）</label><textarea name="note" rows="3"></textarea></div>'+
    '<label class="lead-consent"><input type="checkbox" name="consent" required/> <span>同意船客顾问通过上述联系方式与我沟通</span></label>'+
    '<p class="lead-hint">信息仅用于行程咨询。提交后顾问将在 1 个工作日内回复。</p>'+
    '<button type="submit" class="lead-submit">提交留资</button><p id="lead-error" class="lead-error" hidden></p></form>'+
    '<div id="lead-success" class="lead-success" hidden><h2>已收到您的预约</h2><p>顾问将尽快联系您。也可立即添加企业微信沟通。</p>'+
    '<a class="btn-primary" href="#/advisor">添加旅行顾问</a><a class="btn-outline" href="#/trips">继续浏览航程</a></div>';
}
function bindLeadForm(){
  const form=document.getElementById('lead-form');
  const ok=document.getElementById('lead-success');
  const err=document.getElementById('lead-error');
  if(!form||!ok) return;
  form.onsubmit=async function(e){
    e.preventDefault();
    if(err) err.hidden=true;
    const fd=new FormData(form);
    if(!fd.get('consent')){ if(err){err.textContent='请勾选同意';err.hidden=false;} return; }
    const payload={
      name:String(fd.get('name')||'').trim(),
      contact:String(fd.get('contact')||'').trim(),
      interest:String(fd.get('interest')||'').trim()||undefined,
      note:String(fd.get('note')||'').trim()||undefined,
      tripSlug:String(fd.get('tripSlug')||'').trim()||undefined,
      tripTitle:String(fd.get('tripTitle')||'').trim()||undefined,
      source:String(fd.get('source')||'inquiry'),
      submittedAt:new Date().toISOString()
    };
    if(!payload.name||!payload.contact){ if(err){err.textContent='请填写称呼与联系方式';err.hidden=false;} return; }
    const btn=form.querySelector('.lead-submit');
    if(btn) btn.disabled=true;
    if(LEAD_ENDPOINT){
      try{
        const res=await fetch(LEAD_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        if(!res.ok&&err){err.textContent='提交失败，请重试或致电 010-85864460';err.hidden=false;if(btn)btn.disabled=false;return;}
      }catch{
        if(err){err.textContent='网络异常，请稍后重试';err.hidden=false;if(btn)btn.disabled=false;return;}
      }
    }
    try{
      const key='chuanke_leads_v1';
      const prev=JSON.parse(localStorage.getItem(key)||'[]');
      localStorage.setItem(key,JSON.stringify([payload,...prev].slice(0,50)));
    }catch{}
    form.hidden=true; ok.hidden=false;
    window.scrollTo({top:0,behavior:'smooth'});
  };
}
function inquiryPage(params){
  params=params||new URLSearchParams();
  return '<div class="inquiry-page reveal"><header class="inquiry-hero"><p class="inquiry-eyebrow">船客 · 预约咨询</p>'+
    '<h1>留下联系方式</h1><p class="inquiry-tagline">顾问一对一回复，无需在线支付</p></header>'+
    '<div class="inquiry-card">'+leadFormHtml({tripSlug:params.get('trip'),tripTitle:params.get('title'),source:'inquiry'})+'</div>'+
    '<p class="inquiry-alt">已添加顾问？<a href="#/advisor">直接联系</a></p></div>';
}
function advisorPage(){
  const phone=(ABOUT.offices&&ABOUT.offices[0]&&ABOUT.offices[0].phone)||'010-85864460';
  const tel=phone.replace(/[^0-9]/g,'');
  const steps=[
    {n:'1',t:'扫码添加',d:'企业微信直连船客顾问'},
    {n:'2',t:'说明需求',d:'航程、舱位、出发时间'},
    {n:'3',t:'获取方案',d:'报价与行程细节一对一确认'}
  ];
  const stepHtml=steps.map(s=>'<li><span class="n">'+s.n+'</span><div><strong>'+s.t+'</strong><p>'+s.d+'</p></div></li>').join('');
  return '<div class="advisor-page reveal">'+
    '<header class="advisor-hero"><p class="advisor-eyebrow">船客旅行顾问</p><h1>一对一专属服务</h1>'+
    '<p class="advisor-tagline">官网不提供在线支付 · 顾问为您确认舱位与档期</p></header>'+
    '<div class="advisor-card"><div class="advisor-qr"><div class="advisor-qr-box"><span>企业微信二维码</span>'+
    '<code style="font-size:12px">assets/advisor-qr.png</code></div></div>'+
    '<ol class="advisor-steps">'+stepHtml+'</ol>'+
    '<div class="advisor-actions">'+
    '<a class="btn-primary" href="#/advisor">打开企业微信添加</a>'+
    '<a class="btn-outline" href="tel:'+tel+'">电话咨询 '+esc(phone)+'</a></div></div>'+
    '<ul class="advisor-trust"><li>廿五载极地邮轮经验</li><li>IAATO / AECO 双认证</li><li>报价以顾问确认为准</li></ul>'+
    '<p class="inquiry-alt" style="margin-top:28px">暂不方便扫码？<a href="#/inquiry">填写预约留资</a></p></div>';
}
function bindTabs(){
  const activate=t=>{
    document.querySelectorAll('.tabs-inner button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
    document.querySelectorAll('.detail-content .tab-panel').forEach(p=>p.classList.toggle('on',p.dataset.p===t));
  };
  document.querySelectorAll('.tabs-inner button').forEach(btn=>{
    btn.onclick=()=>activate(btn.dataset.t);
  });
  document.querySelectorAll('[data-goto-tab]').forEach(btn=>{
    btn.onclick=()=>activate(btn.dataset.gotoTab);
  });
}
function bannerHtml(){
  const slideList=BANNER_SLIDES.length?BANNER_SLIDES:[{
    id:0,alt:'船客 · 极地邮轮',img:'',link:'#/',fallback:'linear-gradient(135deg,#0c1929,#1b4965)'
  }];
  const slides=slideList.map((s,i)=>{
    const media=s.img
      ?'<img class="banner-img" src="'+s.img+'" alt="'+esc(s.alt)+'" loading="'+(i===0?'eager':'lazy')+'" style="object-position:'+esc(s.objectPosition||'center')+'"/>'
      :'<div class="bg-fallback" style="background:'+s.fallback+'"></div>';
    return '<a class="banner-slide" href="'+s.link+'" aria-label="'+esc(s.alt)+'">'+media+'</a>';
  }).join('');
  const dots=slideList.length>1
    ? slideList.map((_,i)=>'<button type="button" data-goto="'+i+'" class="'+(i?'':'on')+'" aria-label="第'+(i+1)+'帧"></button>').join('')
    : '';
  return '<div class="home-top"><div class="banner-wrap"><div class="banner"><div class="banner-track" id="banner-track">'+slides+'</div>'+
    '<div class="banner-dots" id="banner-dots">'+dots+'</div></div></div>'+
    '<div class="dual-entry"><a class="primary" href="#/calendar">旅行日历</a><a href="#/inquiry">预约留资</a></div>'+
    '<div class="tool-row">'+
    '<a href="#/tickets">单船票</a><a href="#/ships">船司甄选</a><a href="#/trips">全部航程</a><a href="#/articles">船说</a>'+
    '</div></div>';
}
function initBanner(){
  const track=document.getElementById('banner-track');
  if(!track) return;
  let idx=0;
  const n=track.children.length;
  if(n<2) return;
  const go=i=>{idx=(i+n)%n;track.style.transform='translateX('+(-idx*100)+'%)';
    document.querySelectorAll('#banner-dots button').forEach(b=>{
      b.classList.toggle('on',Number(b.dataset.goto)===idx);
    });
  };
  document.querySelectorAll('#banner-dots button').forEach(b=>{
    b.onclick=()=>go(Number(b.dataset.goto));
  });
  setInterval(()=>go(idx+1),6000);
}
function setBodyPageMode(home){
  document.body.classList.remove('has-cta','page-home');
  if(home) document.body.classList.add('page-home');
}
function home(){
  setBodyPageMode(true);
  const HOME_CFG=[
    {k:'antarctic',title:'近期出发 · 南极',limit:3},
    {k:'arctic',title:'近期出发 · 北极',limit:3},
    {k:'galapagos',title:'加拉帕戈斯',limit:0},
    {k:'light-expedition',title:'其他轻探险',limit:0},
  ];
  const sections=HOME_CFG.map(({k,title,limit})=>{
    let list=categoryProductList(k,"全部");
    if(limit>0) list=list.slice(0,limit);
    if(!list.length) return '';
    const more='<p class="section-more-wrap reveal"><a class="apple-more-link" href="#/'+CAT[k].path+'">查看更多</a></p>';
    return '<section class="section"><div class="section-head reveal"><h2>'+esc(title)+'</h2></div>'+
      '<div class="cards">'+cards(list)+'</div>'+more+'</section>';
  }).join('');
  return bannerHtml()+sections+
    '<section class="section" style="background:var(--surface)"><div class="wrap-wide reveal" style="text-align:center;padding:20px 0 40px">'+
    '<h2 style="font-size:28px;font-weight:600;margin-bottom:12px">关于船客</h2>'+
    '<p style="color:var(--sub);font-size:19px;max-width:640px;margin:0 auto 20px">'+esc(ABOUT.homeBlurb)+'</p>'+
    '<a class="link-cta" href="#/about">了解更多</a></div></section>';
}
function aboutBannerBase(){
  const raw=ABOUT.banner&&ABOUT.banner.image?ABOUT.banner.image:'/banner/about.jpg';
  let p=String(raw).replace(/^\\/+/, '');
  if(p.startsWith('banner/')) p='assets/banner/'+p.slice(7);
  else if(!p.startsWith('assets/')) p='assets/banner/about.jpg';
  return p.replace(/\\.(jpe?g|png|webp)$/i, '');
}
function aboutKvBanner(){
  const b=ABOUT.banner||{fallback:'linear-gradient(145deg,#0c1929,#1b4965,#2d6a8f)',alt:'关于船客'};
  const base=aboutBannerBase();
  return '<div class="about-kv-wrap"><div class="about-kv" id="about-kv">'+
    '<div class="bg" data-img-base="'+base+'" style="background:'+b.fallback+'"></div>'+
    '<div class="shade"></div>'+
    '<div class="about-kv-copy"><p class="about-kv-eyebrow">'+esc(ABOUT.eyebrow)+'</p><h1>'+esc(ABOUT.title)+'</h1></div></div></div>';
}
function initAboutBanner(){
  const bg=document.querySelector('#about-kv .bg');
  if(!bg) return;
  const base=bg.dataset.imgBase;
  ['.jpg','.png','.webp'].forEach(ext=>{
    const im=new Image();
    im.onload=()=>{bg.style.backgroundImage='url('+base+ext+')';bg.style.backgroundSize='cover';bg.style.backgroundPosition='center'};
    im.src=base+ext;
  });
}
function aboutPage(){
  const stats=ABOUT.stats.map(s=>'<li><strong>'+esc(s.value)+'</strong><span>'+esc(s.label)+'</span></li>').join('');
  const highlights=(ABOUT.highlights||[]).map(h=>'<article><h2>'+esc(h.title)+'</h2><p>'+esc(h.desc)+'</p></article>').join('');
  const creds=ABOUT.credentials.map(c=>'<li style="padding:14px 18px;background:var(--surface);border:1px solid var(--line);border-radius:12px;line-height:1.55">'+esc(c)+'</li>').join('');
  const dests=ABOUT.destinations.map(d=>'<a class="dest-card" href="#'+d.path+'" style="display:block;padding:20px;border:1px solid var(--line);border-radius:14px;background:#fff;text-decoration:none;color:inherit;margin-bottom:12px"><h3 style="font-size:20px;font-weight:600;color:var(--accent);margin-bottom:8px">'+esc(d.title)+'</h3><p style="font-size:16px;color:var(--sub);margin:0;line-height:1.6">'+esc(d.desc)+'</p></a>').join('');
  const timeline=ABOUT.milestones.map(m=>'<li style="padding:0 0 28px 24px;border-left:2px solid var(--line);margin-left:8px;list-style:none"><span style="display:block;font-weight:600;color:var(--accent);margin-bottom:8px;font-size:17px">'+esc(m.year)+'</span><p style="font-size:17px;color:var(--sub);margin:0;line-height:1.65">'+esc(m.text)+'</p></li>').join('');
  const adv=ABOUT.advantages.map(p=>'<p style="line-height:1.75;margin-bottom:18px">'+esc(p)+'</p>').join('');
  const offices=ABOUT.offices.map(o=>{
    const phone=o.phone?'<p style="line-height:1.6">电话 <a href="tel:'+o.phone.replace(/[^0-9]/g,'')+'">'+esc(o.phone)+'</a></p>':'';
    return '<div><h3 style="font-size:18px;margin-bottom:10px">'+esc(o.name)+'</h3><p style="color:var(--sub);line-height:1.65;margin-bottom:6px">'+esc(o.address)+'</p>'+phone+'</div>';
  }).join('');
  return '<section class="reveal">'+aboutKvBanner()+
    '<div class="about-highlights">'+highlights+'</div>'+
    '<ul class="about-stats">'+stats+'</ul></section>'+
    '<div class="detail-content" style="max-width:900px"><h2>资质与荣誉</h2><ul style="list-style:none;padding:0;display:grid;gap:12px">'+creds+'</ul>'+
    '<h2>旅行目的地</h2><div>'+dests+'</div>'+
    '<h2>公司历程</h2><ol style="padding:0;margin:0">'+timeline+'</ol>'+
    '<h2>我们的优势</h2>'+adv+
    '<h2>负责任的旅行</h2><p>'+esc(ABOUT.responsible)+'</p>'+
    '<h2>联系我们</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-bottom:20px">'+offices+'</div>'+
    '<p><a class="link-cta" href="#/advisor">联系旅行顾问</a> · <a class="link-cta" href="#/inquiry">预约留资</a></p></div>';
}
function productsForBrand(brand){
  const needles=brand.match.map(m=>m.toLowerCase());
  return PRODUCTS.filter(p=>p.published!==false&&needles.some(n=>{
    const hay=[p.shipName,p.title,p.subcategory||'',...(p.tags||[])].join(' ').toLowerCase();
    return hay.includes(n);
  }));
}
function shipsPage(){
  document.body.classList.remove('has-cta');
  const grid=SHIPS.map(b=>{
    const file=b.logo.split('/').pop();
    const prof=SHIP_PROFILES[b.id];
    const cta=prof?'了解这艘船':'查看品牌';
    return '<li><a class="ship-tile'+(prof?' has-profile':'')+'" href="#/ships/'+b.id+'">'+
      '<span class="ship-tile-logo"><img src="'+assetPath(b.logo)+'" alt=""/></span>'+
      '<span class="ship-tile-text"><strong>'+esc(b.name)+'</strong>'+
      (b.nameEn?'<span class="en">'+esc(b.nameEn)+'</span>':'')+'</span>'+
      '<span class="ship-tile-cta">'+cta+' <span class="chev">›</span></span></a></li>';
  }).join('');
  return '<section class="hero reveal"><p class="hero-eyebrow">船客</p><h1>船司甄选</h1>'+
    '<p class="hero-lead">按邮轮品牌了解船型 · 点击进入详细介绍</p></section>'+
    '<p class="ship-picker-lead reveal">精选极地探险邮轮与奢华运营商，方案图文来自船客产品 PPT。</p>'+
    '<ul class="ship-picker-grid reveal">'+grid+'</ul>';
}
function shipProfilePage(id){
  document.body.classList.remove('has-cta');
  const b=SHIPS.find(x=>x.id===id);
  if(!b) return '<div class="wrap" style="padding:80px 22px"><h1>未找到船司</h1><a class="link-cta" href="#/ships">返回船司甄选</a></div>';
  const prof=SHIP_PROFILES[id];
  const title=prof&&prof.vesselName?prof.vesselName:b.name;
  const sub=prof&&prof.vesselNameEn?prof.vesselNameEn:b.nameEn;
  const lead=prof&&prof.tagline?prof.tagline:b.blurb;
  const logo=assetPath(b.logo);
  const hero=prof&&prof.heroImage?'<figure class="ship-profile-media"><img src="'+assetPath(prof.heroImage)+'" alt="'+esc(title)+'"/></figure>':'';
  let specBar='';
  if(prof&&prof.specs&&prof.specs.length){
    specBar='<div class="ship-spec-bar"><div class="spec-grid">'+
      prof.specs.slice(0,8).map(([k,v])=>'<div><span class="v">'+esc(v)+'</span><span class="l">'+esc(k)+'</span></div>').join('')+
      '</div></div>';
  }
  let body='';
  if(prof&&prof.highlights&&prof.highlights.length){
    body+='<h2>船型亮点</h2><ul class="hi-list">'+prof.highlights.map(h=>'<li>'+esc(h)+'</li>').join('')+'</ul>';
  }
  if(prof&&prof.sections){
    prof.sections.forEach(s=>{
      body+='<h2>'+esc(s.title)+'</h2><p>'+esc(s.content)+'</p>';
    });
  } else {
    body+='<h2>品牌简介</h2><p>'+esc(b.blurb)+'</p><p>详细图文整理中，欢迎 <a class="link-cta" href="#/advisor">联系顾问</a> 索取船册。</p>';
  }
  if(prof&&prof.facilities&&prof.facilities.length){
    body+='<h2>公共区域与设施</h2><ul>'+prof.facilities.map(f=>'<li>'+esc(f)+'</li>').join('')+'</ul>';
  }
  if(prof&&prof.cabins&&prof.cabins.length){
    body+='<h2>舱型参考</h2><ul>'+prof.cabins.map(c=>'<li><strong>'+esc(c.name)+'</strong> — '+esc(c.spec)+(c.note?' · '+esc(c.note):'')+'</li>').join('')+'</ul>';
  }
  if(prof&&prof.gallery&&prof.gallery.length){
    body+='<h2>船上实景</h2><div class="ship-gallery-prev">'+prof.gallery.map(g=>'<img src="'+assetPath(g.src)+'" alt="'+esc(g.alt||'')+'" loading="lazy"/>').join('')+'</div>';
  }
  const rel=productsForBrand(b);
  const tripsBlock=rel.length
    ?'<section class="ship-related-section"><h2>相关航程</h2><div class="ship-trip-cards">'+cards(rel)+'</div></section>'
    :'<section class="ship-related-section"><h2>相关航程</h2><p style="font-size:19px;color:var(--sub)">档期整理中，<a class="link-cta" href="#/advisor">联系顾问</a>。</p></section>';
  return '<header class="ship-profile-hero reveal"><p class="crumb"><a href="#/ships">船司甄选</a> › '+esc(title)+'</p>'+
    '<div class="ship-profile-inner"><div class="ship-profile-copy">'+
    '<img src="'+logo+'" alt="" style="max-height:48px;margin-bottom:12px"/>'+
    '<p class="eyebrow">'+esc(sub)+'</p><h1>'+esc(title)+'</h1><p class="lead">'+esc(lead)+'</p>'+
    '<p><a class="btn btn-primary" href="#/advisor" style="display:inline-block;padding:12px 22px;border-radius:980px;background:var(--brand);color:#fff;text-decoration:none;font-size:17px;margin-right:12px">咨询航次</a>'+
    (rel[0]?'<a class="link-cta" href="#/trips/'+rel[0].slug+'">查看在售航程</a>':'')+'</p></div>'+hero+'</div></header>'+
    specBar+'<div class="ship-detail-main reveal">'+body+tripsBlock+'</div>';
}
function categoryPage(kk,activeTag){
  document.body.classList.remove('has-cta');
  if(kk==='ship') return shipsPage();
  const tag=activeTag||"全部";
  const list=categoryProductList(kk,tag);
  const empty='<div class="wrap-wide" style="text-align:center;padding:48px 22px 80px;color:var(--sub)">'+
    '<p style="font-size:19px;margin-bottom:16px">'+(kk==='ticket'?'单船票档期每日更新，请直连顾问获取报价。':'该栏目产品资料整理中，请先联系顾问。')+'</p>'+
    '<a class="link-cta" href="#/advisor">联系顾问</a></div>';
  const note=kk==='ticket'&&list.length?'<p class="wrap-wide" style="font-size:17px;color:var(--sub);padding:0 22px 48px;max-width:720px">单船票仅含船上服务，不含国际机票与签证。</p>':'';
  const gridId='preview-grid-'+kk;
  const years=departureYears(list);
  const tagBar=tagFilterHtml(kk,tag);
  const yBar=years.length>1&&list.length>=2?yearFilterHtml(years,gridId):'';
  return '<section class="hero reveal"><p class="hero-eyebrow">船客</p><h1>'+CAT[kk].label+'</h1><p class="hero-lead">'+
    (list.length?list.length+'条可咨询航次':'按航司/航次选品')+'</p></section>'+
    tagBar+
    (list.length?yBar+'<div class="wrap-wide cards" id="'+gridId+'" data-year-filter="'+(years.length>1?'1':'0')+'">'+cards(list)+'</div>'+note:empty);
}
function render(){
  const raw=location.hash.slice(1)||'/';
  const h=raw.split('?')[0].split('#')[0]||'/';
  const app=document.getElementById('app');
  const isHome=h==='/'||h==='';
  if(!isHome) setBodyPageMode(false);
  if(isHome) app.innerHTML=home();
  else if(h.startsWith('/trips/')){
    let slug='';
    try{slug=decodeURIComponent(h.replace(/^\\/trips\\//,'').split('?')[0]);}catch(e){slug=h.split('/')[2]||'';}
    const p=PRODUCTS.find(x=>x.slug===slug);
    app.innerHTML=p?tripPage(p):'<div class="wrap" style="padding:80px 0"><h1>未找到航程</h1><p style="color:var(--sub);margin-top:12px">请从列表重新进入，或运行 npm run build 更新预览。</p><a class="link-cta" href="#/trips">返回航程列表</a></div>';
    bindTabs();
  } else if(h==='/advisor'){
    app.innerHTML=advisorPage();
  } else if(h==='/about'){
    app.innerHTML=aboutPage();
  } else if(h==='/anniversary'){
    app.innerHTML='<section class="hero reveal" style="background:linear-gradient(135deg,#1b4965,#b45309);color:#fff"><p class="hero-eyebrow" style="color:#fef3e2">25 周年</p>'+
      '<h1 style="color:#fff">廿五载 · 极地同行</h1><p class="hero-lead" style="color:rgba(255,255,255,.9)">周年专题 · 限定礼遇 · 客人故事</p>'+
      '<a class="link-cta" style="color:#fff" href="#/advisor">咨询周年礼遇</a></section>';
  } else if(h==='/inquiry'){
    const qs=raw.includes('?')?raw.split('?')[1]:'';
    app.innerHTML=inquiryPage(new URLSearchParams(qs));
    bindLeadForm();
  } else if(h==='/custom'){
    location.hash='/inquiry';
    return;
  } else if(h==='/calendar'){
    app.innerHTML='<section class="hero reveal"><h1>旅行日历</h1><p class="hero-lead">按出发月份查看档期（完整版在正式站）。</p></section>';
  } else if(h==='/articles'){
    app.innerHTML='<section class="hero reveal"><h1>船说</h1><p class="hero-lead">客人故事与极地手记，内容筹备中。</p></section>';
  } else if(h==='/ships'){
    const qs=raw.includes('?')?raw.split('?')[1]:'';
    const legacy=new URLSearchParams(qs).get('brand');
    if(legacy){ location.hash='#/ships/'+legacy; return; }
    app.innerHTML=shipsPage();
  } else if(h.startsWith('/ships/')){
    const sid=h.split('/')[2];
    app.innerHTML=shipProfilePage(sid);
  } else {
    const kk=Object.keys(CAT).find(c=>'/'+CAT[c].path===h);
    const qs=raw.includes('?')?raw.split('?')[1]:'';
    const tag=new URLSearchParams(qs).get('tag')||'全部';
    app.innerHTML=kk?categoryPage(kk,tag):home();
  }
  observeReveal();
  bindTagFilters();
  bindYearFilters();
  initBanner();
  initAboutBanner();
}
(function(){
  const btn=document.getElementById('nav-menu-btn');
  const drawer=document.getElementById('nav-drawer');
  if(btn&&drawer){
    btn.onclick=()=>{
      const open=!drawer.classList.contains('open');
      drawer.classList.toggle('open',open);
      btn.setAttribute('aria-expanded',open?'true':'false');
    };
  }
})();
window.addEventListener('hashchange',render);
render();
</script>
</body>
</html>`;

writeFileSync(join(outDir, "index.html"), html, "utf8");
console.log("Apple-style preview:", join(outDir, "index.html"));
