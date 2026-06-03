# 船客官网

基于 Astro 的静态官网：30+ SKU 结构化展示、企业微信转化、GEO（`llms.txt`、JSON-LD、sitemap）。

## 快速开始

```bash
cd chuanke-site
cp .env.example .env
# 编辑 PUBLIC_WECOM_URL
npm install
npm run dev
```

## 内容维护

| 文件 | 说明 |
|------|------|
| `data/products.json` | 全部航程 SKU（或运行 `node scripts/generate-products.mjs` 重置样板） |
| `data/SKU_TEMPLATE.md` | 从企微 PDF 录入字段说明 |
| `data/articles.json` | 船说文章 |

```bash
npm run validate:products   # 校验 30+ 条与 GEO 摘要字数
npm run build               # 生成 llms.txt + 站点
```

## 替换素材

- 顾问二维码：`public/advisor-qr.png`，并更新 `src/pages/advisor.astro`
- 正式域名：修改 `astro.config.mjs` 的 `site`

## 文档

- [DEPLOY.md](./DEPLOY.md) — 上线 checklist
- [AGENTS.md](./AGENTS.md) — Agent Team 工作规则
- [docs/agent-team.md](./docs/agent-team.md) — 第一阶段 Agent Team 布局
- [docs/single-ticket-product-agent.md](./docs/single-ticket-product-agent.md) — 单船票产品 Agent 专项规则
