import type { ProductCategory } from "../types/product";

export interface CategoryMeta {
  slug: ProductCategory;
  label: string;
  path: string;
  description: string;
  filters?: string[];
}

export const CATEGORIES: CategoryMeta[] = [
  {
    slug: "antarctic",
    label: "南极",
    path: "/antarctic",
    description:
      "南极半岛、王企鹅、半环南极与春节航线。船客提供双飞与单飞等多种档期，适合首次南极与深度探险旅客。",
    filters: ["全部", "双飞", "单飞", "南极过大年", "半环南极", "延长线"],
  },
  {
    slug: "arctic",
    label: "北极",
    path: "/arctic",
    description:
      "北极三岛、四岛、斯瓦尔巴与北极点航线。夏季黄金窗口出发，专业探险队保障登陆安全。",
    filters: ["全部", "三岛", "四岛", "北极点", "斯瓦尔巴"],
  },
  {
    slug: "galapagos",
    label: "加拉帕戈斯",
    path: "/galapagos",
    description:
      "厄瓜多尔一国四境深度行程，串联安第斯、亚马逊与加拉帕戈斯群岛，近距离观察象龟与海鬣蜥。",
  },
  {
    slug: "light-expedition",
    label: "其他轻探险",
    path: "/light-expedition",
    description:
      "东非、南非、大溪地、巴塔哥尼亚等轻探险目的地，不含加拉帕戈斯品类。",
  },
  {
    slug: "ticket",
    label: "单船票",
    path: "/tickets",
    description:
      "按船司、航线、档期和舱位政策匹配南极、北极及高端邮轮单船票，适合已自行安排机票、签证与前后段行程的旅客。",
    filters: ["全部", "南极", "北极", "格陵兰", "庞洛", "银海", "夸克", "66度", "早鸟", "尾舱"],
  },
  {
    slug: "ship",
    label: "船司甄选",
    path: "/ships",
    description:
      "银海、海神号、Atlas 等极地邮轮品牌精选，点击进入各船详细介绍与相关航程。",
  },
];

export const ABOUT_PATH = "/about";

export function getCategory(slug: ProductCategory) {
  return CATEGORIES.find((c) => c.slug === slug);
}
