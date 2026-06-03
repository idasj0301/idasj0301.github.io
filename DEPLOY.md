# 船客官网上线 Checklist

## 上线前准备

- [ ] 确认 `astro.config.mjs` 中 `site` 为正式域名（如 `https://www.chuanke.com`）
- [ ] 配置 `.env`：`PUBLIC_WECOM_URL` = 企业微信获客链接
- [ ] 替换 `public/advisor-qr.png`（顾问企微二维码）
- [ ] 用企微 PDF **校对** `data/products.json` 中价格、日期、`published` 字段
- [ ] 填写 Footer ICP 备案号
- [ ] 本地执行：`npm run validate:products && npm run build && npm run preview`

---

## 方案 A：海外快速上线（无需备案）

适合：先预览、验证 GEO、海外访问。

| 步骤 | 操作 |
|------|------|
| 1 | 注册 [Vercel](https://vercel.com) 或 [Cloudflare Pages](https://pages.cloudflare.com) |
| 2 | 连接 Git 仓库，根目录选 `chuanke-site` |
| 3 | Build 命令：`npm run build`，输出目录：`dist` |
| 4 | 环境变量：`PUBLIC_WECOM_URL` |
| 5 | 域名 DNS：添加 CNAME 到平台提供的地址 |
| 6 | 开启 HTTPS（平台自动） |
| 7 | 提交 [Google Search Console](https://search.google.com/search-console) / 百度资源平台 |
| 8 | 验证 `https://你的域名/llms.txt` 与 `https://你的域名/sitemap-index.xml` 可访问 |

---

## 方案 B：国内正式运营（需 ICP 备案）

适合：`.cn` / 国内访客为主、合规要求。

| 步骤 | 操作 |
|------|------|
| 1 | 在阿里云/腾讯云完成 **ICP 备案**（约 2～4 周，与开发并行） |
| 2 | 对象存储 OSS + CDN，或「静态网站托管」服务 |
| 3 | 本地 `npm run build`，将 `dist/` 上传至桶/托管根目录 |
| 4 | CDN 绑定已备案域名，强制 HTTPS |
| 5 | 配置缓存：HTML 短缓存，静态资源长缓存 |
| 6 | 百度/Google 提交 sitemap |
| 7 | 若旧站存在：配置 301 重定向到对应 `/trips/{slug}` |

---

## 上线后 GEO 验证

- [ ] 任意详情页「查看源代码」可见 `application/ld+json`（TouristTrip）
- [ ] `curl https://域名/llms.txt` 返回航程列表
- [ ] `robots.txt` 中 Sitemap 地址正确
- [ ] 用 [Rich Results Test](https://search.google.com/test/rich-results) 抽检一条航程 URL

---

## 日常更新航程（约 10 分钟）

1. 按 `data/SKU_TEMPLATE.md` 编辑 `data/products.json`（或新增一条）
2. `npm run validate:products`
3. `git commit` → 推送 → 平台自动构建（或重新上传 `dist`）

---

## 常见问题

**构建失败**：确认 Node 18+，`rm -rf node_modules && npm install`。

**企微链接无效**：检查 `PUBLIC_WECOM_URL` 是否含协议 `https://`，重新部署。

**SKU 页面 404**：该条 `published` 须为 `true`，且 `slug` 唯一。

**备案期间想预览**：先用方案 A 子域名预览，备案后切主域名。
