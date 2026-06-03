import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const detailsDir = join(import.meta.dirname, "..", "data/details");

function text(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function fallbackFor(day, detail) {
  const title = text(day.title);
  const base = text(day.content);
  const routeHint = text(
    detail.metaTable?.find?.(([key]) => /目的地|线路|航线/.test(key))?.[1] ??
      detail.subtitle ??
      "",
  );
  if (/启程|出发|国内/.test(title)) {
    return `${base} 顾问会在出发前同步集合、航班与行前注意事项，抵达后以休整和适应时差为主。`;
  }
  if (/返程|下船|离船|结束/.test(title)) {
    return `${base} 根据实际船期与航班时间安排接驳，结束航程后返回国内或衔接后续行程。`;
  }
  if (/航海日|海上航行|破冰航行/.test(title)) {
    return `${base} 可参加船上讲座、观景、休闲设施与探险队分享，为后续登陆或巡游探索做准备。`;
  }
  if (/登陆|探索|巡游|核心/.test(title)) {
    return `${base} 具体登陆点、巡游方式与活动节奏将由船长和探险队根据天气、海况与安全条件灵活安排。`;
  }
  if (/布宜诺斯|圣地亚哥|雷克雅|朗伊尔|威尼斯|雅典|特罗姆瑟/.test(title)) {
    return `${base} 结合城市观光、接驳与休整安排，实际游览顺序以当地交通和团队节奏为准。`;
  }
  return `${base} ${routeHint ? `围绕${routeHint}展开，` : ""}具体活动以船期、天气海况和探险队安排为准。`;
}

let changed = 0;
let filled = 0;

for (const file of readdirSync(detailsDir).filter((name) => name.endsWith(".json"))) {
  const path = join(detailsDir, file);
  const detail = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(detail.itinerary)) continue;

  let touched = false;
  detail.itinerary = detail.itinerary.map((day) => {
    if (text(day.content).length >= 35) return day;
    touched = true;
    filled++;
    return { ...day, content: fallbackFor(day, detail) };
  });

  if (touched) {
    writeFileSync(path, `${JSON.stringify(detail, null, 2)}\n`);
    changed++;
  }
}

console.log(`Filled ${filled} short itinerary item(s) in ${changed} detail file(s).`);
