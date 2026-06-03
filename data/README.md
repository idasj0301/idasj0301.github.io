# 船客官网数据说明（无传统数据库）

本站 **不使用 MySQL 等产品数据库**。所有航程内容以 JSON + 静态图片形式存放在本目录，构建时生成 HTML。

## 文件职责

| 路径 | 作用 |
|------|------|
| `products.json` | 全部 SKU：列表、摘要、简版 Tab 字段 |
| `details/{slug}.json` | 重点航程富详情（航线图、逐日行程等） |
| `ships.json` | 船司甄选品牌列表 |
| `ship-profiles/{id}.json` | 船舶详细介绍 |
| `about.json` | 关于我们 |
| `articles.json` | 船说文章 |

## 图片

放在 `../public/`：

- `public/trips/{slug}/` — 航线图、首图、图库
- `public/ships/` — 船司 logo、船册图
- `public/banner/` — 首页轮播

## 从硬盘同步 SKU

```bash
node scripts/sync-products-from-drive.mjs
```

规则：跳过文件名/路径含 `TY` 的同业 PPT；保留 4 条已校对精品 slug 的完整 JSON。

## 校验与构建

```bash
npm run validate:products
npm run build
```

## 留资（不是 SKU 数据）

访客提交预约时，正式站应将 `PUBLIC_LEAD_ENDPOINT` 构建为 `/api/lead`，再由服务器端 `server/lead-server.mjs` 读取 `WECOM_SMARTSHEET_WEBHOOK_URL` 并写入企业微信智能表格。不要把企业微信 Webhook 直接写入前端环境变量；未配置提交入口时仅浏览器本地备份。
