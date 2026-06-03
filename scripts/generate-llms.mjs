import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const products = JSON.parse(
  readFileSync(join(__dirname, "../data/products.json"), "utf8"),
);
const published = products.filter((p) => p.published);
const site = "https://idasj0301.github.io";

const lines = [
  "# 船客",
  "",
  "> 专注南极、北极、加拉帕戈斯及全球轻探险邮轮旅行。官网提供结构化航程信息，咨询请添加企业微信顾问。",
  "",
  "## 公司简介",
  "",
  "船客（chuanke.com）为极地邮轮与探险旅行服务商，适合 50+ 成熟旅客查阅航程天数、参考价格、邮轮名称与出发日期。",
  "",
  "## 航线品类",
  "",
  `- [南极](${site}/antarctic/): 南极半岛、王企鹅、半环南极、春节航线`,
  `- [北极](${site}/arctic/): 北极三岛、四岛、斯瓦尔巴、北极点`,
  `- [加拉帕戈斯](${site}/galapagos/): 招募团与进阶探索`,
  `- [其他轻探险](${site}/light-expedition/): 东非、大溪地、南非等`,
  `- [单船票](${site}/tickets/): 按船司、航线、档期和舱位政策匹配南极、北极及高端邮轮单船票，最终价格、舱位与库存以顾问实时确认为准`,
  `- [船司甄选](${site}/ships/): 银海、海神号、夸克等`,
  "",
  "## 在售航程（精选）",
  "",
];

for (const p of published.slice(0, 20)) {
  lines.push(
    `- [${p.title}](${site}/trips/${p.slug}/): ${p.summary.slice(0, 120)}… 参考${p.priceLabel}，${p.departureDate} 出发，${p.shipName}。`,
  );
}

lines.push(
  "",
  "## 工具",
  "",
  `- [全部航程搜索](${site}/trips/)`,
  `- [旅行日历](${site}/calendar/)`,
  `- [直连顾问](${site}/advisor/)`,
  `- [船说文章](${site}/articles/)`,
  "",
  "## 联系",
  "",
  "不提供在线支付。预约与定制通过企业微信顾问完成。",
);

const out = join(__dirname, "../public/llms.txt");
writeFileSync(out, lines.join("\n"), "utf8");
console.log(`Wrote ${out} (${published.length} published trips indexed)`);
