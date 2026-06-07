import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const productsPath = join(root, "data/products.json");
const detailsDir = join(root, "data/details");
const publicTripsDir = join(root, "public/trips");
const tmp = "/private/tmp/chuanke-supplemental-audit";

function media(folder, name) {
  return join(tmp, folder, "media", name);
}

function sourceFile(path) {
  return path.replace("/Volumes/Ida的硬盘，丢了赔付/船客产品2026/", "");
}

const commonNotice =
  "具体行程、住宿、航班、舱位与费用包含以最终出团通知、签约合同及顾问确认为准；自然探险类行程可能因天气、交通、景区政策或船方安排调整。";

const configs = [
  {
    mode: "insert",
    product: {
      id: "supp-east-africa-2026-08-02",
      slug: "2026-east-africa-migration-10d",
      title: "生命的礼赞 · 狂野东非",
      category: "light-expedition",
      subcategory: "陆地轻探险",
      tags: ["东非", "动物大迁徙", "Safari", "肯尼亚", "坦桑尼亚"],
      departureDate: "2026-08-02",
      endDate: "2026-08-11",
      durationDays: 10,
      priceFrom: 99800,
      priceLabel: "¥99,800 起",
      shipName: "陆地轻探险",
      summary:
        "生命的礼赞 · 狂野东非，2026年8月2日至8月11日，10天9晚，深入肯尼亚与坦桑尼亚，直击东非动物大迁徙、马拉河天河之渡与 Safari 游猎。",
      overview:
        "以东非动物大迁徙为核心，串联肯尼亚、坦桑尼亚草原生态，追踪角马、斑马、羚羊迁徙队伍与非洲五霸。",
      highlights: [
        "直击东非动物大迁徙与马拉河天河之渡",
        "Safari 游猎追踪非洲五霸",
        "角马、斑马、羚羊迁徙队伍生态观察",
        "野奢营地与草原景观住宿",
      ],
      itinerary: [
        { day: 1, title: "国内 → 东非", content: "集合出发，经转机前往东非，抵达后接机入住。" },
        { day: 2, title: "开启草原探索", content: "进入东非草原区域，调整时差并熟悉 Safari 游猎节奏。" },
        { day: 3, title: "迁徙队伍观察", content: "寻找角马、斑马、羚羊组成的迁徙队伍，理解东非草原的生命循环。" },
        { day: 5, title: "马拉河与天河之渡", content: "在迁徙季核心区域守候马拉河渡河机会，具体观赏以动物活动和向导判断为准。" },
        { day: 7, title: "非洲五霸 Safari", content: "追踪狮子、豹子、非洲水牛、大象与犀牛，也有机会观察猎豹、长颈鹿等动物。" },
        { day: 9, title: "草原晨昏游猎", content: "利用清晨和傍晚光线进行自然观察与摄影，感受东非荒野的节奏。" },
        { day: 10, title: "返程", content: "结束东非荒野之旅，送机返回国内。" },
      ],
      ship: "本产品为陆地轻探险，无邮轮。",
      feeNote: "费用包含与不含以 PPT 方案、实时资源和签约合同为准。",
      notice:
        "野生动物活动和渡河场景具有不确定性，具体观赏以季节、天气、动物迁徙路径、保护区政策和向导现场判断为准。",
      published: true,
      featured: false,
      imageAlt: "东非动物大迁徙角马渡河",
      sourceFile: sourceFile(
        "/Volumes/Ida的硬盘，丢了赔付/船客产品2026/补充sku/2026年8月东非9晚10天/方案/2026年8月东非9晚10天.pptx",
      ),
    },
    assets: {
      hero: media("east-africa", "image5.png"),
      routeMap: media("east-africa", "image4.png"),
      gallery: [media("east-africa", "image9.png"), media("east-africa", "image34.png"), media("east-africa", "image23.jpeg")],
      highlights: [
        media("east-africa", "image5.png"),
        media("east-africa", "image9.png"),
        media("east-africa", "image22.png"),
        media("east-africa", "image58.jpeg"),
        media("east-africa", "image23.jpeg"),
      ],
    },
    detail: {
      titleEn: "WILD EAST AFRICA",
      subtitle: "陆地轻探险",
      tags: ["东非", "动物大迁徙", "Safari"],
      metaTable: [
        ["出行日期", "2026.08.02 — 2026.08.11"],
        ["目的地", "肯尼亚、坦桑尼亚"],
        ["出行时长", "10天9晚"],
        ["线路特点", "动物大迁徙、Safari 游猎、草原生态观察"],
        ["团队规模", "精品小团"],
        ["交通方式", "陆地轻探险"],
      ],
      cabins: [{ name: "陆地轻探险席位", spec: "10天9晚，肯尼亚 + 坦桑尼亚", price: "¥99,800 / 人" }],
      highlightSections: [
        {
          title: "东非动物大迁徙",
          content:
            "角马、斑马、羚羊等食草动物每年在塞伦盖蒂与马赛马拉之间循环迁徙，全年跋涉超过 3200 公里，是地球上最大规模的陆地哺乳动物迁徙之一。",
        },
        {
          title: "马拉河 · 天河之渡",
          content:
            "每年 7-10 月，迁徙大军抵达马拉河，渡河成为全程最震撼也最不可预测的片段。行程以迁徙季为核心设计，但具体场景需尊重自然节奏。",
        },
        {
          title: "自然的较量",
          content:
            "草原上狮子、豹子、猎豹、鳄鱼等捕食者与迁徙队伍共同构成真实而紧张的生态现场，适合自然观察与摄影。",
        },
        {
          title: "Safari 追踪非洲五霸",
          content:
            "多次游猎寻找狮子、豹子、非洲水牛、大象与犀牛，也关注长颈鹿、斑马、羚羊、鸟类等东非草原代表物种。",
        },
        {
          title: "野奢营地与草原生活",
          content:
            "用舒适营地和景观住宿承接高强度自然观察，在清晨、傍晚和夜色中感受东非荒野的辽阔与生命力。",
        },
      ],
      itineraryNote: "迁徙路线、动物聚集点和渡河发生时间无法保证，每日安排以向导和保护区现场判断为准。",
      feeIncluded: ["行程所列住宿、当地用车与司导服务", "国家公园及保护区门票", "行程所列餐食与 Safari 游猎安排"],
      feeExcluded: ["国际及内陆段机票差额、签证、保险及个人消费", "单房差、自费项目、不可抗力导致的额外费用"],
      noticeSections: [
        { title: "自然观察", content: "野生动物活动具有不确定性，迁徙和渡河场景无法保证，请以自然发生为准。" },
        { title: "出行准备", content: "东非草原昼夜温差、日晒和道路颠簸明显，建议准备防晒、防尘、轻便保暖衣物及合适镜头。" },
      ],
    },
  },
  {
    mode: "insert",
    product: {
      id: "supp-danube-2026-09-22",
      slug: "2026-danube-balkan-river-cruise-10d",
      title: "探秘多瑙河 · 巴尔干北线",
      category: "light-expedition",
      subcategory: "河轮",
      tags: ["多瑙河", "巴尔干", "河轮", "东欧"],
      departureDate: "2026-09-22",
      endDate: "2026-10-01",
      durationDays: 10,
      priceFrom: 59900,
      priceLabel: "¥59,900 起",
      company: "Riverside Luxury Cruises",
      shipName: "Riverside Luxury Cruises 河轮",
      summary:
        "2026年9月22日至10月1日，8晚10天，多瑙河下游巴尔干北线，串联罗马尼亚、保加利亚、塞尔维亚、克罗地亚与匈牙利。",
      overview:
        "从多瑙河下游进入小众东欧秘境，穿越铁门峡谷，探访久尔久、鲁塞、维丁、贝尔格莱德、布达佩斯等历史城市。",
      highlights: [
        "一船畅游多瑙河下游五国",
        "穿越铁门峡谷，欣赏多瑙河地质奇观",
        "顶奢河轮套房体验，可加订布拉格服务包",
        "东欧古堡、要塞、老城与皇家王城串联",
      ],
      itinerary: [
        { day: 1, title: "抵达布加勒斯特 / 登船", content: "抵达后接机，前往久尔久登上河轮。" },
        { day: 2, title: "久尔久 / 鲁塞", content: "探访多瑙河两岸城市与友谊大桥，进入保加利亚河港鲁塞。" },
        { day: 4, title: "维丁与古要塞", content: "游览多元文化交融的边境城市，感受巴巴维达堡垒等历史遗迹。" },
        { day: 5, title: "铁门峡谷", content: "巡航穿越多瑙河最壮阔的峡谷段，欣赏山脉与河谷景观。" },
        { day: 7, title: "贝尔格莱德", content: "游览萨瓦河与多瑙河交汇处的塞尔维亚首都。" },
        { day: 10, title: "布达佩斯离船", content: "抵达匈牙利首都，可衔接布拉格深度服务包或返程。" },
      ],
      ship: "Riverside Luxury Cruises 河轮，舱位与设施以产品资料、实时舱位和签约合同为准。",
      feeNote: "布拉格 3天2晚服务包为可选增订，参考价 ¥8,000 / 人。",
      notice: commonNotice,
      published: true,
      featured: false,
      imageAlt: "多瑙河巴尔干北线",
      sourceFile: sourceFile(
        "/Volumes/Ida的硬盘，丢了赔付/船客产品2026/补充sku/2026年9月多瑙河河轮/2026年9月巴尔干北线多瑙河河轮8晚10+布拉格服务包.pptx",
      ),
    },
    assets: {
      hero: media("danube", "image3.jpeg"),
      routeMap: media("danube", "image5.png"),
      gallery: [media("danube", "image2.png"), media("danube", "image13.png"), media("danube", "image17.png")],
      highlights: [media("danube", "image23.png"), media("danube", "image7.jpeg"), media("danube", "image14.png")],
      ship: media("danube", "image28.png"),
      shipGallery: [media("danube", "image41.png"), media("danube", "image50.jpeg"), media("danube", "image51.jpeg")],
    },
    detail: {
      titleEn: "DANUBE BALKAN RIVER CRUISE",
      subtitle: "欧洲河轮",
      tags: ["多瑙河", "巴尔干", "河轮"],
      metaTable: [
        ["出行日期", "2026.09.22 — 2026.10.01"],
        ["目的地", "罗马尼亚、保加利亚、塞尔维亚、克罗地亚、匈牙利"],
        ["出行时长", "8晚10天"],
        ["线路特点", "欧洲顶奢河轮、多瑙河巴尔干北线"],
        ["团队规模", "精品贵宾团"],
        ["可选服务包", "布拉格 3天2晚深度游览"],
      ],
      cabins: [
        { name: "旋律套房 Melody Suite", spec: "2层甲板，17㎡，最多可住2人", price: "¥59,900 / 人" },
        { name: "和韵套房 Symphony Suite", spec: "3层甲板，18㎡，最多可住2人", price: "¥70,900 / 人" },
        { name: "海马套房 Seahorse Suite", spec: "2层甲板，24㎡，最多可住2人", price: "¥82,900 / 人" },
        { name: "河畔套房 Riverside Suite", spec: "3层甲板，24㎡，最多可住2人", price: "¥87,900 / 人" },
        { name: "德彪西套房 Debussy Suite", spec: "3层甲板，47㎡，最多可住2人", price: "¥165,900 / 人" },
        { name: "主人套房 Owner Suite", spec: "3层甲板，71㎡，最多可住4人", price: "¥227,900 / 人" },
      ],
      highlightSections: [
        {
          title: "秋色多瑙河",
          content:
            "九月底至十月初的多瑙河谷进入金黄与琥珀色交织的季节，河水、古堡与山谷秋光相映，是东欧河轮最适合慢赏的时段之一。",
        },
        {
          title: "一船串联巴尔干五国",
          content:
            "从罗马尼亚古堡、保加利亚古要塞，到塞尔维亚老城、克罗地亚战争记忆与匈牙利皇家王城，一次读懂东欧千年更迭。",
        },
        {
          title: "铁门峡谷",
          content:
            "多瑙河穿过喀尔巴阡山脉与巴尔干山脉之间的峡谷，峭壁与河面形成极具电影感的自然景观。",
        },
      ],
      shipDetail: {
        name: "Riverside Luxury Cruises 河轮",
        intro:
          "Riverside Luxury Cruises 主打精品河轮套房体验，船上配置餐厅、酒吧、公共休息空间与多级别套房，适合追求舒适度的欧洲河轮客人。",
        specs: [
          ["线路", "多瑙河下游巴尔干北线"],
          ["舱房", "旋律套房至主人套房"],
          ["可选延展", "布拉格 3天2晚服务包"],
        ],
        facilities: ["河景套房", "餐厅与酒吧", "观景甲板", "公共休息空间"],
      },
      feeIncluded: ["河轮船票及船上餐食服务", "行程所列岸上游览与用车服务", "中文服务与团队协调"],
      feeExcluded: ["国际机票、签证、保险及个人消费", "布拉格服务包等可选延展项目", "单房差及合同未列明费用"],
      noticeSections: [{ title: "服务包说明", content: "布拉格服务包需达到成团人数并以顾问确认价格为准。" }],
    },
  },
];

const csaBase = {
  category: "galapagos",
  subcategory: "中南美洲",
  tags: ["哥伦比亚", "厄瓜多尔", "巴拿马", "加拉帕戈斯", "Infinity 无限号"],
  durationDays: 21,
  shipName: "Infinity 无限号",
  company: "Royal Galapagos",
  title: "穿行赤道线 · 中南美洲三国之旅",
  highlights: [
    "临近赤道线的中南美洲三国串联",
    "哥伦比亚波哥大与安第斯山麓城市探索",
    "加拉帕戈斯 Infinity 豪华游艇包船",
    "亚马逊雨林生态酒店与独木舟探秘",
    "巴拿马运河与殖民老城人文体验",
  ],
  itinerary: [
    { day: 1, title: "国内 → 波哥大", content: "集合出发，经转机前往哥伦比亚首都波哥大。" },
    { day: 3, title: "波哥大城市探索", content: "游览黄金博物馆、玻利瓦尔广场、蒙塞拉特山等城市精华。" },
    { day: 4, title: "波哥大 → 基多", content: "飞往厄瓜多尔首都基多，参观赤道纪念碑。" },
    { day: 5, title: "科托帕希火山", content: "前往安第斯山脉中的活火山国家公园，感受高山生态。" },
    { day: 6, title: "加拉帕戈斯登船", content: "飞往群岛，登上 Infinity 无限号开始 7 晚游艇巡航。" },
    { day: 7, title: "加拉帕戈斯群岛巡游", content: "近距离观察海鬣蜥、蓝脚鲣鸟、象龟、海狮等特有物种。" },
    { day: 13, title: "基多 → 亚马逊雨林", content: "进入热带雨林生态酒店，乘独木舟寻找珍稀动植物。" },
    { day: 16, title: "巴拿马", content: "前往巴拿马，参观运河核心段与殖民老城。" },
    { day: 21, title: "返程抵达国内", content: "结束中南美洲三国之旅。" },
  ],
  ship: "Infinity 无限号：Royal Galapagos 豪华游艇，舱位与设施以产品资料、实时舱位和签约合同为准。",
  notice: commonNotice,
};

function makeCsa({ slug, id, year, departureDate, endDate, priceFrom, priceLabel, sourcePpt, folder, heroFile = "image40.jpeg", imageAlt = "加拉帕戈斯群岛野生动物与 Infinity 无限号" }) {
  configs.push({
    mode: "insert",
    product: {
      ...csaBase,
      id,
      slug,
      departureDate,
      endDate,
      priceFrom,
      priceLabel,
      summary: `${csaBase.title}，${year}年${departureDate.slice(5, 7)}月${departureDate.slice(8, 10)}日至${endDate.slice(5, 7)}月${endDate.slice(8, 10)}日，21天17晚，搭乘 Infinity 无限号包船巡游加拉帕戈斯，并串联哥伦比亚、厄瓜多尔与巴拿马。`,
      overview: `${csaBase.title}，哥伦比亚 + 厄瓜多尔 + 巴拿马，Infinity 无限号加拉帕戈斯游艇包船 7 晚。`,
      feeNote: "费用包含与不含以产品方案及签约合同为准；签证、国际机票差额、个人消费等通常另计。",
      published: true,
      featured: false,
      imageAlt,
      sourceFile: sourceFile(sourcePpt),
    },
    assets: {
      hero: media(folder, heroFile),
      heroFit: true,
      routeMap: media(folder, "image23.jpeg"),
      gallery: [media(folder, "image19.jpeg"), media(folder, "image24.jpeg"), media(folder, "image38.jpeg")],
      highlights: [media(folder, "image5.jpeg"), media(folder, "image26.jpeg"), media(folder, "image36.jpeg"), media(folder, "image19.jpeg"), media(folder, "image54.jpeg")],
      ship: media(folder, "image54.jpeg"),
      shipGallery: [media(folder, "image59.png"), media(folder, "image60.png"), media(folder, "image66.jpeg")],
    },
    detail: makeCsaDetail({ departureDate, endDate, priceFrom, priceLabel }),
  });
}

function makeCsaDetail({ departureDate, endDate, priceFrom }) {
  return {
    titleEn: "TRAVERSE THE EQUATOR",
    subtitle: "中南美洲三国",
    tags: ["哥伦比亚", "厄瓜多尔", "巴拿马", "加拉帕戈斯"],
    metaTable: [
      ["出行日期", `${departureDate.replaceAll("-", ".")} — ${endDate.replaceAll("-", ".")}`],
      ["目的地", "哥伦比亚、厄瓜多尔、巴拿马"],
      ["出行时长", "17晚21天（加拉帕戈斯游艇 7 晚）"],
      ["邮轮 / 交通", "Royal Galapagos Infinity 无限号豪华游艇"],
      ["团队规模", "18+2 人精致小团（加帕游艇包船）"],
      ["线路特点", "赤道线三国、加拉帕戈斯、雨林与巴拿马运河"],
    ],
    cabins: [
      { name: "一层阳台房", spec: "21-25㎡，共 6 间", price: `¥${priceFrom.toLocaleString()} / 人` },
      { name: "二层阳台房", spec: "23㎡，共 2 间", price: `¥${(priceFrom + 6000).toLocaleString()} / 人` },
      { name: "二层阳台套房", spec: "32㎡，共 2 间", price: `¥${(priceFrom + 10000).toLocaleString()} / 人` },
    ],
    highlightSections: [
      { title: "波哥大 · 安第斯山麓的明珠", content: "哥伦比亚首都波哥大坐落于安第斯高原，黄金博物馆、玻利瓦尔广场与蒙塞拉特山串联城市历史与高原景观。" },
      { title: "厄瓜多尔 · 全球物种库", content: "从基多老城到科托帕希火山，再进入加拉帕戈斯与亚马逊雨林，一国之内浓缩高山、海岛和热带雨林生态。" },
      { title: "加拉帕戈斯 · 看世界最初的样子", content: "搭乘 Infinity 无限号包船巡游群岛，观察海鬣蜥、蓝脚鲣鸟、象龟、军舰鸟、海狮等不怕人的野生动物。" },
      { title: "亚马逊雨林 · 住进地球的肺", content: "入住雨林生态酒店，乘独木舟深入水道，寻找鸟类、灵长类、爬行动物与热带植物。" },
      { title: "巴拿马运河与殖民老城", content: "近距离观察巨轮穿梭船闸，漫步百年殖民老城与滨海堤道，收束中南美洲人文体验。" },
    ],
    itineraryNote: "加拉帕戈斯登陆点、雨林活动与巴拿马运河参观安排以当地天气、船方及保护区规定为准。",
    shipDetail: {
      name: "Infinity 无限号",
      intro: "Infinity 无限号是 Royal Galapagos 旗下豪华现代游艇之一，适合加拉帕戈斯小团包船巡游，配置阳台房、阳台套房、餐厅、公共休息区和观景甲板。",
      specs: [
        ["船司", "Royal Galapagos"],
        ["舱位", "一层阳台房、二层阳台房、二层阳台套房"],
        ["巡游", "加拉帕戈斯群岛 7 晚"],
      ],
      facilities: ["阳台客房", "餐厅与酒吧", "观景甲板", "公共休息区"],
    },
    feeIncluded: ["行程所列酒店、游艇住宿及餐食", "加拉帕戈斯巡游与指定岸上活动", "当地用车、导游及团队服务"],
    feeExcluded: ["国际机票差额、签证、保险及个人消费", "单房差、自费项目及合同未列明费用"],
    noticeSections: [
      { title: "加拉帕戈斯规则", content: "群岛登陆和野生动物观赏需遵守国家公园规定，不可触摸、投喂或惊扰动物。" },
      { title: "体能提示", content: "雨林、火山和群岛段含户外步行、上下船及湿滑地面，建议具备良好体能。" },
    ],
  };
}

makeCsa({
  slug: "2026-equator-central-south-america-21d",
  id: "supp-csa-2026-11-22",
  year: 2026,
  departureDate: "2026-11-22",
  endDate: "2026-12-12",
  priceFrom: 149800,
  priceLabel: "¥149,800 起",
  folder: "csa-2026",
  sourcePpt:
    "/Volumes/Ida的硬盘，丢了赔付/船客产品2026/补充sku/2026年11月中南美洲三国17晚21天/方案/2026年11月穿行赤道线·中南美洲三国之旅17晚21天.pptx",
});

makeCsa({
  slug: "2027-equator-central-south-america-21d",
  id: "supp-csa-2027-08-01",
  year: 2027,
  departureDate: "2027-08-01",
  endDate: "2027-08-21",
  priceFrom: 159800,
  priceLabel: "¥159,800 起",
  folder: "csa-2027",
  heroFile: "image19.jpeg",
  imageAlt: "巴拿马运河与中南美洲三国之旅",
  sourcePpt:
    "/Volumes/Ida的硬盘，丢了赔付/船客产品2026/补充sku/2027年8月中南美洲三国17晚21天/方案/2027年8月穿行赤道线·中南美洲三国之旅17晚21天.pptx",
});

configs.push({
  mode: "insert",
  product: {
    id: "supp-ecuador-2027-02-20",
    slug: "2027-ecuador-origin-species-20d",
    title: "厄瓜多尔 · 物种的起源探索之旅",
    category: "galapagos",
    subcategory: "加拉帕戈斯",
    tags: ["厄瓜多尔", "加拉帕戈斯", "亚马逊雨林", "Infinity 无限号"],
    departureDate: "2027-02-20",
    endDate: "2027-03-11",
    durationDays: 20,
    priceFrom: 159800,
    priceLabel: "¥159,800 起",
    company: "Royal Galapagos",
    shipName: "Infinity 无限号",
    summary:
      "厄瓜多尔 · 物种的起源探索之旅，2027年2月20日至3月11日，17晚20天，含加拉帕戈斯 Infinity 无限号游艇 7 晚。",
    overview:
      "从基多老城、科托帕希火山到加拉帕戈斯群岛与亚马逊热带雨林，一次探索厄瓜多尔高山、海岛与雨林生态。",
    highlights: [
      "基多老城世界文化遗产",
      "科托帕希火山与安第斯山脉",
      "加拉帕戈斯 Infinity 无限号包船",
      "亚马逊热带雨林生态酒店",
      "近距离观察不怕人的野生动物",
    ],
    itinerary: [
      { day: 1, title: "国内 → 阿姆斯特丹", content: "集合搭乘国际航班，经转机前往厄瓜多尔。" },
      { day: 2, title: "抵达基多", content: "抵达厄瓜多尔首都基多，接机入住酒店。" },
      { day: 3, title: "基多 / 科托帕希", content: "游览基多老城与科托帕希火山国家公园。" },
      { day: 4, title: "加拉帕戈斯登船", content: "飞往群岛，登上 Infinity 无限号。" },
      { day: 5, title: "群岛巡游", content: "巡游赫诺韦萨岛、圣地亚哥岛、圣克鲁斯岛等岛屿。" },
      { day: 11, title: "离船返回基多", content: "结束加拉帕戈斯航段，返回厄瓜多尔本土。" },
      { day: 12, title: "亚马逊雨林", content: "进入雨林生态酒店，展开独木舟与步道探索。" },
      { day: 18, title: "基多返程", content: "从基多启程返回国内。" },
    ],
    ship: "Infinity 无限号：舱位与设施以产品资料、实时舱位和签约合同为准。",
    feeNote: "费用包含与不含以产品方案及签约合同为准。",
    notice: commonNotice,
    published: true,
    featured: false,
    imageAlt: "加拉帕戈斯象龟、蓝脚鲣鸟与雨林生态",
    sourceFile: sourceFile(
      "/Volumes/Ida的硬盘，丢了赔付/船客产品2026/补充sku/2027年2月厄瓜多尔/方案/2027年2月厄瓜多尔17晚20天.pptx",
    ),
  },
  assets: {
    hero: media("ecuador-2027", "image5.png"),
    heroFit: true,
    routeMap: media("ecuador-2027", "image21.jpeg"),
    gallery: [media("ecuador-2027", "image6.png"), media("ecuador-2027", "image23.jpeg"), media("ecuador-2027", "image45.jpeg")],
    highlights: [media("ecuador-2027", "image7.jpeg"), media("ecuador-2027", "image23.jpeg"), media("ecuador-2027", "image25.jpeg"), media("ecuador-2027", "image44.jpeg")],
    ship: media("ecuador-2027", "image38.jpeg"),
    shipGallery: [media("ecuador-2027", "image52.png"), media("ecuador-2027", "image55.png"), media("ecuador-2027", "image59.jpeg")],
  },
  detail: makeCsaDetail({ departureDate: "2027-02-20", endDate: "2027-03-11", priceFrom: 159800 }),
});

configs.push({
  mode: "update",
  product: {
    slug: "20270220-0320穿越南美七国29天25晚",
    title: "纵贯安第斯 · 南美七国全境揽胜",
    departureDate: "2027-02-20",
    endDate: "2027-03-20",
    durationDays: 29,
    summary:
      "纵贯安第斯 · 南美七国全境揽胜，2027年2月20日至3月20日，25晚29天，串联哥伦比亚、秘鲁、玻利维亚、智利、巴西、阿根廷与乌拉圭。",
    overview:
      "一次纵贯南美七国，覆盖波哥大、利马、亚马逊雨林、马丘比丘、乌尤尼盐湖、圣地亚哥、复活节岛、里约、伊瓜苏与布宜诺斯艾利斯。",
    highlights: [
      "南美七国一次全境揽胜",
      "马丘比丘、乌尤尼盐湖、复活节岛三大地标",
      "亚马逊雨林、伊瓜苏瀑布与安第斯高原自然景观",
      "里约热内卢、布宜诺斯艾利斯、瓦尔帕莱索等城市人文",
    ],
    imageAlt: "南美七国全境揽胜",
    sourceFile: sourceFile(
      "/Volumes/Ida的硬盘，丢了赔付/船客产品2026/补充sku/2027年2月20日南美七国全境揽胜之旅/20270220-0320穿越南美七国29天25晚.pptx",
    ),
  },
  assets: {
    hero: media("south7", "image10.jpeg"),
    routeMap: media("south7", "image19.png"),
    gallery: [media("south7", "image6.jpeg"), media("south7", "image8.png"), media("south7", "image21.jpeg")],
    highlights: [media("south7", "image6.jpeg"), media("south7", "image8.png"), media("south7", "image14.png"), media("south7", "image24.png")],
  },
  detail: {
    titleEn: "SOUTH AMERICA GRAND JOURNEY",
    subtitle: "陆地轻探险",
    tags: ["南美七国", "安第斯", "马丘比丘", "乌尤尼", "复活节岛"],
    metaTable: [
      ["出行日期", "2027.02.20 — 2027.03.20"],
      ["目的地", "哥伦比亚、秘鲁、玻利维亚、智利、巴西、阿根廷、乌拉圭"],
      ["出行时长", "25晚29天"],
      ["线路特点", "南美七国全境揽胜"],
      ["团队规模", "精品小团"],
      ["交通方式", "陆地轻探险"],
    ],
    cabins: [],
    highlightSections: [
      { title: "波哥大与利马", content: "从安第斯高原上的哥伦比亚首都，到太平洋岸边的秘鲁殖民老城，开启南美人文纵贯线。" },
      { title: "马丘比丘与印加圣谷", content: "深入安第斯山脉，探访印加文明遗址与高原城市库斯科。" },
      { title: "亚马逊雨林", content: "从马尔多纳多港进入亚马逊雨林，寻找鸟类、灵长类和热带植物。" },
      { title: "乌尤尼盐湖", content: "玻利维亚天空之镜是南美高原最具辨识度的自然景观之一，雨季积水时如天地倒映。" },
      { title: "复活节岛与智利海岸", content: "飞往南太平洋上的复活节岛，探访摩艾石像，再回到瓦尔帕莱索与圣地亚哥。" },
      { title: "里约、伊瓜苏与布宜诺斯艾利斯", content: "以巴西山海城市、世界级瀑布和阿根廷探戈文化收束全程。" },
    ],
    itinerary: [
      { day: "1-2", date: "02月20-21日", title: "国内 → 波哥大", content: "集合出发，经转机抵达哥伦比亚首都波哥大。" },
      { day: "3", date: "02月22日", title: "波哥大", content: "游览黄金博物馆、玻利瓦尔广场与蒙塞拉特山。" },
      { day: "4-6", date: "02月23-25日", title: "利马 / 亚马逊雨林", content: "经利马进入马尔多纳多港，入住雨林区域，展开自然观察。" },
      { day: "7-10", date: "02月26日-03月01日", title: "印加圣谷 / 马丘比丘 / 库斯科", content: "探访印加圣谷、马丘比丘与库斯科老城。" },
      { day: "11-13", date: "03月02-04日", title: "拉巴斯 / 乌尤尼", content: "进入玻利维亚高原，游览拉巴斯与乌尤尼盐湖。" },
      { day: "14-19", date: "03月05-10日", title: "智利 / 复活节岛", content: "前往圣地亚哥、瓦尔帕莱索与复活节岛，探索摩艾石像与太平洋海岸文化。" },
      { day: "20-24", date: "03月11-15日", title: "里约 / 伊瓜苏", content: "游览里约热内卢与伊瓜苏瀑布，感受巴西自然与城市活力。" },
      { day: "25-29", date: "03月16-20日", title: "布宜诺斯艾利斯 / 乌拉圭 / 返程", content: "探访阿根廷与乌拉圭，返程回国。" },
    ],
    itineraryNote: "南美多国跨境行程航班和陆路衔接较多，最终顺序以出团通知为准。",
    feeIncluded: ["行程所列酒店、用车、导游及门票", "行程所列餐食与团队服务", "南美境内必要交通安排"],
    feeExcluded: ["国际机票差额、签证、保险及个人消费", "单房差、自费项目及合同未列明费用"],
    noticeSections: [
      { title: "签证提示", content: "南美多国签证、电子授权或入境材料要求需按出行时政策办理。" },
      { title: "高原提示", content: "库斯科、拉巴斯、乌尤尼等地海拔较高，请评估身体状况并遵医嘱准备。" },
    ],
  },
});

function detailImage(src, alt, caption) {
  return caption ? { src, alt, caption } : { src, alt };
}

async function writeImage(source, dest, { width = 2400, route = false, fitHero = false } = {}) {
  if (!existsSync(source)) {
    throw new Error(`Missing image source: ${source}`);
  }
  const ext = extname(dest).toLowerCase();
  let pipeline = sharp(readFileSync(source)).rotate();
  if (fitHero) {
    pipeline = pipeline.resize(2400, 1350, { fit: "cover", position: "attention" });
  } else if (width) {
    pipeline = pipeline.resize({ width, withoutEnlargement: true });
  }
  if (route && ext === ".png") {
    await pipeline.png({ compressionLevel: 8 }).toFile(dest);
  } else {
    await pipeline.jpeg({ quality: route ? 88 : 84, mozjpeg: true }).toFile(dest);
  }
}

function ensureUniqueProduct(products, product) {
  const existingIndex = products.findIndex((p) => p.slug === product.slug);
  if (existingIndex >= 0) {
    products[existingIndex] = { ...products[existingIndex], ...product };
  } else {
    products.push(product);
  }
}

async function applyConfig(config) {
  const slug = config.product.slug;
  const dir = join(publicTripsDir, slug);
  mkdirSync(dir, { recursive: true });

  await writeImage(config.assets.hero, join(dir, "hero.jpg"), { width: 2400, fitHero: config.assets.heroFit === true });
  const routeExt = extname(config.assets.routeMap || "").toLowerCase() === ".png" ? "png" : "jpg";
  if (config.assets.routeMap) {
    await writeImage(config.assets.routeMap, join(dir, `route-map.${routeExt}`), { width: 1800, route: true });
  }

  const gallery = [];
  for (const [index, source] of (config.assets.gallery || []).entries()) {
    const name = `gallery-${String(index + 1).padStart(2, "0")}.jpg`;
    await writeImage(source, join(dir, name), { width: 1800 });
    gallery.push(detailImage(`/trips/${slug}/${name}`, config.product.imageAlt || config.product.title));
  }

  const highlightImages = [];
  for (const [index, source] of (config.assets.highlights || []).entries()) {
    const name = `highlight-${String(index + 1).padStart(2, "0")}.jpg`;
    await writeImage(source, join(dir, name), { width: 1800 });
    highlightImages.push(detailImage(`/trips/${slug}/${name}`, config.product.title));
  }

  let shipImage;
  if (config.assets.ship) {
    await writeImage(config.assets.ship, join(dir, "ship.jpg"), { width: 1800 });
    shipImage = detailImage(`/trips/${slug}/ship.jpg`, config.product.shipName || config.product.title);
  }

  const shipGallery = [];
  for (const [index, source] of (config.assets.shipGallery || []).entries()) {
    const name = `ship-gallery-${String(index + 1).padStart(2, "0")}.jpg`;
    await writeImage(source, join(dir, name), { width: 1600 });
    shipGallery.push(detailImage(`/trips/${slug}/${name}`, config.product.shipName || config.product.title));
  }

  const detail = {
    ...config.detail,
    heroImage: `/trips/${slug}/hero.jpg`,
    routeMap: config.assets.routeMap
      ? {
          src: `/trips/${slug}/route-map.${routeExt}`,
          alt: `${config.product.title}路线图`,
          caption: "示意图仅供参考，实际顺序与停靠以出团通知为准。",
        }
      : undefined,
    gallery,
  };

  detail.highlightSections = (config.detail.highlightSections || []).map((section, index) => ({
    ...section,
    image: highlightImages[index % highlightImages.length],
  }));

  if (config.detail.shipDetail || shipImage || shipGallery.length) {
    detail.shipDetail = {
      ...(config.detail.shipDetail || {
        name: config.product.shipName,
        intro: config.product.ship,
      }),
      image: shipImage || config.detail.shipDetail?.image,
      gallery: shipGallery.length ? shipGallery : config.detail.shipDetail?.gallery,
      cabins: config.detail.cabins?.length ? config.detail.cabins : config.detail.shipDetail?.cabins,
    };
  }

  writeFileSync(join(detailsDir, `${slug}.json`), `${JSON.stringify(detail, null, 2)}\n`);
}

async function main() {
  const products = JSON.parse(readFileSync(productsPath, "utf8"));

  for (const config of configs) {
    if (config.mode === "update") {
      const index = products.findIndex((p) => p.slug === config.product.slug);
      if (index < 0) throw new Error(`Cannot update missing product: ${config.product.slug}`);
      products[index] = { ...products[index], ...config.product };
    } else {
      ensureUniqueProduct(products, config.product);
    }
    await applyConfig(config);
  }

  products.sort((a, b) => {
    const dateCompare = String(a.departureDate || "").localeCompare(String(b.departureDate || ""));
    if (dateCompare !== 0) return dateCompare;
    return String(a.slug).localeCompare(String(b.slug));
  });
  writeFileSync(productsPath, `${JSON.stringify(products, null, 2)}\n`);

  for (const config of configs) {
    execFileSync("node", ["-e", `JSON.parse(require('fs').readFileSync(${JSON.stringify(join(detailsDir, `${config.product.slug}.json`))}, 'utf8'));`]);
    console.log(`[OK] ${config.product.slug}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
