# 船客 SKU 录入模板

从企微尾盘 **PDF/PPT** 抽取后，按下列字段填入 `data/products.json`（或复制单条对象）。

## 必填字段

| 字段 | 说明 | 示例 |
|------|------|------|
| `id` | 内部编号 `品类缩写-序号` | `ant-001` |
| `slug` | URL 英文短链，全站唯一 | `2026-wangguin-antarctica` |
| `title` | 对外标题 | `2026 飞船游南极 · 奇遇王企鹅 22天` |
| `category` | 见下表 | `antarctic` |
| `subcategory` | 列表筛选用 | `单飞` / `双飞` / `半环南极` |
| `tags` | 标签数组 | `["单飞","王企鹅"]` |
| `departureDate` | ISO 日期 | `2026-11-22` |
| `durationDays` | 整数天数 | `22` |
| `priceFrom` | 数字（元） | `149900` |
| `priceLabel` | 展示用 | `¥149900起` |
| `shipName` | 邮轮名 | `海神号` |
| `summary` | **150–300 字纯文本**，GEO 与列表摘要 | 见下方范文 |
| `highlights` | 亮点，字符串数组，3–6 条 | |
| `published` | 是否上线 | `true` / `false` |

## 详情 6 Tab 对应字段

| Tab | 字段 |
|-----|------|
| 概览 | `overview`（可与 summary 扩展） |
| 亮点 | `highlights` |
| 日程 | `itinerary[]` → `{ day, title, content }` |
| 邮轮 | `ship` |
| 费用 | `feeNote` |
| 须知 | `notice` |

## category 枚举

| 值 | 顶栏 |
|----|------|
| `antarctic` | 南极 |
| `arctic` | 北极 |
| `galapagos` | 加拉帕戈斯 |
| `light-expedition` | 其他轻探险 |
| `ticket` | 单船票 |
| `ship` | 船司甄选 |

## summary 范文（GEO）

> 船客 2026 年南极单飞航程，搭乘海神号自乌斯怀亚出发，行程 22 天，重点登陆王企鹅聚居地。含往返机票、船上全餐、探险队长带队登陆。参考起价 ¥149900/人，2026 年 11 月 22 日出发。咨询请通过官网「直连顾问」添加企业微信。

## 从 PDF 抽取步骤

1. 企微尾盘下载 PDF（优先于 PPT）。
2. 复制全文到 Cursor，说明品类与 `slug`。
3. 运行 `npm run validate:products` 校验必填与字数。
4. 业务校对：价格、日期、船名、是否 `published: false`（售完即止）。

## 可选

- `featured: true` — 首页推荐流
- `wecomFrom: "ant-001"` — 企微链接溯源参数
- `imageAlt` — 首图无障碍与 GEO

校验规则见 `data/product.schema.json` 与 `scripts/validate-products.mjs`。
