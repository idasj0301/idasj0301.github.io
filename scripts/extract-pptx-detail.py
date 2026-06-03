#!/usr/bin/env python3
"""
从船客产品 PPT 提取与 2026-wangguin-antarctica-22d 同结构的详情 JSON。
用法: python3 extract-pptx-detail.py <pptx路径> [--product-json <path>]
"""
from __future__ import annotations

import html
import json
import re
import sys
import zipfile
from pathlib import Path

ROUTE_CAPTION = "示意图仅供参考，每日停靠以实际船期与探险队长安排为准。"

META_KEYS = [
    ("出行日期", r"出行日期\s*"),
    ("目的地", r"出行目的地\s*"),
    ("出行时长", r"出行时长\s*"),
    ("线路特点", r"线路特点\s*"),
    ("团队规模", r"团队规模\s*"),
    ("出发城市", r"出发城市\s*"),
    ("出发城市", r"出发地\s*"),
]

HIGHLIGHT_MARKER = re.compile(r"行程亮点|Itinerary\s+HIGHLIGHTS", re.I)
SHIP_ZONE = re.compile(
    r"邮轮介绍|Cruise\s+introduction|舱房介绍|甲板平面图|邮轮设施|"
    r"Seaventure|海神号|中国国家地理号|国家地理号|庞洛北冕号|北冕号|"
    r"指挥官夏古号|夏古号|COMMANDANT\s+CHARCOT|66°\s*Expeditions",
    re.I,
)
COMPANY_SLIDE = re.compile(r"船客旅行创立于|关注我们了解更多|Follow us to learn more", re.I)
STOP_HIGHLIGHT = re.compile(
    r"费用包含|费用不含|航线图|Itinerary\s+map|行程简介|Itinerary\s+introduction|"
    r"产品概述|舱\s*位\s*价\s*格|邮轮介绍|Cruise\s+introduction|"
    r"Booking information|Fee description",
    re.I,
)


def norm(text: str) -> str:
    t = html.unescape(text)
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])", r"\1", t)
    t = re.sub(r"20(26|27|28)\s+20\1年?", r"20\1", t)
    return t


def get_slides(path: str, limit: int = 120) -> list[str]:
    with zipfile.ZipFile(path) as z:
        names = sorted(
            [n for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml", n)],
            key=lambda x: int(re.search(r"slide(\d+)", x).group(1)),
        )
        out = []
        for name in names[:limit]:
            xml = z.read(name).decode("utf-8", "ignore")
            parts = re.findall(r"<a:t>([^<]*)</a:t>", xml)
            out.append(norm(" ".join(parts)))
        return out


def parse_title_en(slide1: str) -> str | None:
    words = re.findall(r"[A-Z][A-Z\s,&·\-]{4,}", slide1)
    for w in words:
        w = norm(w)
        if len(w) > 8 and any(
            k in w for k in ("ANTARCTICA", "ARCTIC", "GALAPAGOS", "SAIL", "EXPEDITION")
        ):
            return w[:120]
    m = re.search(r"(FLY\s*&\s*SAIL[^A]{0,80}ANTARCTICA[^A]{0,40})", slide1, re.I)
    if m:
        return norm(m.group(1).replace("&amp;", "&"))
    return None


def parse_meta_table(slides: list[str]) -> list[list[str]]:
    for slide in slides[:4]:
        if "出行日期" not in slide and "出行目的地" not in slide:
            continue
        rows = []
        for label, pat in META_KEYS:
            m = re.search(pat + r"(.+?)(?=出行日期|出行目的地|出行时长|线路特点|团队规模|出发城市|舱\s*位|产品概述|$)", slide)
            if m:
                rows.append([label, norm(m.group(1))])
        if rows:
            return rows
    return []


def parse_cabins(text: str) -> list[dict]:
    table_cabins = parse_cabin_price_rows(text)
    if table_cabins:
        return table_cabins

    cabins = []
    for m in re.finditer(r"([\d,]+)\s*元\s*/?\s*人", text):
        price_raw = m.group(1).replace(",", "").replace(" ", "")
        if len(price_raw) < 5:
            continue
        before = text[max(0, m.start() - 140) : m.start()]
        best_idx, name = -1, None
        for n in ("船东套房", "阳台房", "三人间", "舷窗房", "海景房"):
            idx = before.rfind(n)
            if idx > best_idx:
                best_idx, name = idx, n
        if not name:
            continue
        spec = norm(before[best_idx + len(name) :])
        price = f"¥{price_raw}/人"
        sold = "售罄" in text[m.start() : m.end() + 40]
        cabins.append({"name": name, "spec": spec, "price": price, "soldOut": sold})
    if cabins:
        seen = set()
        uniq = []
        for c in cabins:
            key = (c["name"], c["spec"][:20])
            if key in seen:
                continue
            seen.add(key)
            uniq.append(c)
        return uniq
    patterns = [
        r"([\u4e00-\u9fffA-Za-z0-9（）\(\)㎡\s]{2,16}?)\s+(\d+\s*层[^R元]{0,50})?\s*RMB\s*([\d,]+)\s*/?\s*人",
        r"([\u4e00-\u9fffA-Za-z0-9（）\(\)㎡\s]{2,16}?)\s+(\d+\s*层[^元]{0,50})?\s*([\d,]+)\s*元\s*/?\s*人",
    ]
    for pat in patterns:
        for m in re.finditer(pat, text):
            name = norm(m.group(1))
            if "舱位" in name or "价格" in name or len(name) < 2:
                continue
            spec = norm(m.group(2) or "")
            price = f"¥{m.group(3).replace(',', '')}/人"
            sold = "售罄" in text[m.start() : m.end() + 30]
            cabins.append({"name": name, "spec": spec, "price": price, "soldOut": sold})
    return cabins


def clean_price(raw: str) -> int:
    digits = re.sub(r"\D", "", raw)
    return int(digits) if digits else 0


def format_price(raw: str | int) -> str:
    value = raw if isinstance(raw, int) else clean_price(raw)
    return f"¥{value:,} / 人"


INVALID_CABIN_RE = re.compile(r"签证|报名|取消|政策|费用|公证|认证|保险|机票|须知|说明")
VALID_CABIN_RE = re.compile(r"房|套房|Suite|Stateroom|Cabin", re.I)


def sanitize_cabin(cabin: dict) -> dict | None:
    name = norm(str(cabin.get("name", "")))
    spec = norm(str(cabin.get("spec", "")))
    price = norm(str(cabin.get("price", "")))
    sold_out = bool(cabin.get("soldOut")) or "售罄" in name or "售罄" in spec
    name = re.sub(r"[（(]?\s*售罄\s*[）)]?", "", name).strip()
    spec = re.sub(r"[（(]?\s*售罄\s*[）)]?", "", spec).strip()
    blob = f"{name} {spec}"
    if not name or not price:
        return None
    if INVALID_CABIN_RE.search(blob):
        return None
    if not VALID_CABIN_RE.search(name):
        return None
    return {"name": name, "spec": spec, "price": price, "soldOut": sold_out}


def split_cabin_name_spec(row: str) -> tuple[str, str]:
    row = norm(row)
    floor_m = re.search(
        r"[-—–]?\s*\d+\s*(?:/\s*\d+\s*)?层|"
        r"[（(]\s*\d+(?:\s*\.\s*\d+)?(?:\s*-\s*\d+(?:\s*\.\s*\d+)?)?\s*㎡",
        row,
    )
    if floor_m and floor_m.start() > 1:
        name = norm(row[: floor_m.start()])
        spec = norm(row[floor_m.start() :])
    else:
        name = row[:24]
        spec = row[24:]
    name = re.sub(r"\s*[|｜]\s*$", "", name).strip()
    spec = re.sub(r"^[|｜]\s*", "", spec).strip()
    return name, spec


def parse_discount_price_grid(text: str) -> list[dict]:
    if "58 折特惠" not in text or "价格说明" not in text:
        return []
    cabins = [
        ("船东套房", "7 层"),
        ("阳台套房", "6 层"),
        ("标准套房", "5 层船中"),
        ("标准套房", "4 层船中"),
        ("标准套房", "5 层前部"),
        ("标准套房", "4 层前部"),
    ]
    m = re.search(r"58\s*折特惠\s*价格\s*(.+)$", text)
    if not m:
        return []
    price_matches = list(re.finditer(r"￥\s*([\d,\s]{5,})", m.group(1)))
    out = []
    for idx, pm in enumerate(price_matches[: len(cabins)]):
        price = clean_price(pm.group(1))
        if price < 10000:
            continue
        name, spec = cabins[idx]
        out.append(
            {
                "name": name,
                "spec": spec,
                "price": format_price(price),
                "soldOut": "售罄" in m.group(1)[pm.start() : pm.end() + 20],
            }
        )
    return out


def parse_header_price_rows(text: str) -> list[dict]:
    if not re.search(r"舱\s*位\s*价\s*格", text) or not re.search(r"元\s*/\s*人", text):
        return []
    block = re.split(r"预定政策|Booking information|产品名称|产品概述|PRODUCT OVERVIEW", text, maxsplit=1)[0]
    price_number = r"(?:\d{1,3}\s*,\s*)+\d{3}"
    pat = re.compile(
        r"([\u4e00-\u9fffA-Za-z0-9（）()\s+./·-]{2,40}?(?:房|套房)\s*"
        r"(?:\d+\s*层)?\s*[（(][^）)]*㎡[^）)]*[）)](?:\s*可住\s*\d+\s*人)?)"
        rf"\s+({price_number})(?=\s+(?:-|{price_number}|[\u4e00-\u9fffA-Za-z]|第\d))"
    )
    out = []
    for m in pat.finditer(block):
        row = m.group(1)
        price = clean_price(m.group(2))
        if price < 10000:
            continue
        name, spec = split_cabin_name_spec(row)
        name = re.sub(r"^[-\s]+", "", name)
        name = re.sub(
            r"^.*?(?=(尊爵|豪华|豪爵|荣耀|主人|海景|贵宾|船东|阳台|标准))",
            "",
            name,
        )
        if "尊爵" in row and name == "阳台房":
            name = "尊爵阳台房"
        if len(name) < 2:
            continue
        out.append({"name": name, "spec": spec, "price": format_price(price), "soldOut": False})
    return out


def parse_euro_price_rows(text: str) -> list[dict]:
    if "€" not in text:
        return []
    pat = re.compile(
        r"([A-Za-z ]+Deck\s*\d+)\s*([\u4e00-\u9fff]+(?:套房|房))\s*€\s*([\d,\s]{4,})"
    )
    out = []
    for m in pat.finditer(text):
        price = clean_price(m.group(3))
        if price < 1000:
            continue
        out.append(
            {
                "name": norm(m.group(2)),
                "spec": norm(m.group(1)),
                "price": f"€{price:,} / 人",
                "soldOut": False,
            }
        )
    return out


def parse_rmb_suffix_rows(text: str) -> list[dict]:
    if "RMB" not in text:
        return []
    block = re.split(r"产品概述|PRODUCT OVERVIEW|费用包含|费用说明", text, maxsplit=1)[0]
    price_number = r"(?:\d{1,3}\s*,\s*)+\d{3}"
    pat = re.compile(
        r"([\u4e00-\u9fffA-Za-z0-9（）()\s+./·-]{2,50}?(?:房|套房)"
        r"(?:[（(][^）)]*㎡[^）)]*[）)])?)"
        rf"\s+({price_number})\s*RMB\s*/\s*人"
    )
    out = []
    for m in pat.finditer(block):
        price = clean_price(m.group(2))
        if price < 10000:
            continue
        name, spec = split_cabin_name_spec(m.group(1))
        name = re.sub(r"^.*?(?=(豪华|礼宾|顶层|海景|海中阁|阳台|标准))", "", name)
        name = re.sub(r"^起", "", name)
        out.append(
            {
                "name": name,
                "spec": spec or "指定房型",
                "price": format_price(price),
                "soldOut": False,
            }
        )
    return out


def parse_cabin_price_rows(text: str) -> list[dict]:
    if "舱" not in text or not re.search(r"价\s*格|RMB|元\s*/\s*人|€|欧\s*元", text, re.I):
        return []
    euro_rows = parse_euro_price_rows(text)
    if euro_rows:
        return euro_rows

    suffix_rows = parse_rmb_suffix_rows(text)
    if suffix_rows:
        return suffix_rows

    discount_grid = parse_discount_price_grid(text)
    if discount_grid:
        return discount_grid

    header_rows = parse_header_price_rows(text)
    if header_rows:
        return header_rows

    price_pat = re.compile(
        r"(?:RMB|￥)\s*([\d,\s]{5,})\s*(?:元)?\s*(?:/\s*人)?|"
        r"([\d,\s]{5,})\s*(?:元)?\s*/\s*人",
        re.I,
    )
    matches = list(price_pat.finditer(text))
    if not matches:
        return []

    header = re.search(r"舱\s*位\s*价\s*格", text)
    cursor = header.end() if header else 0
    cabins = []
    for m in matches:
        price_num = clean_price(m.group(1) or m.group(2) or "")
        if price_num < 10000:
            cursor = m.end()
            continue
        row = norm(text[cursor : m.start()])
        cursor = m.end()
        row = re.sub(r"^[（(]\s*2\s*人入住\s*1\s*间\s*[）)]", "", row).strip()
        row = re.sub(r"^价\s*格\s*[（(].*?[）)]", "", row).strip()
        row = re.sub(r"^舱\s*位\s*", "", row).strip()
        if not row or len(row) < 2:
            continue
        name, spec = split_cabin_name_spec(row)
        name = re.sub(r"^起", "", name)
        if not spec and re.search(r"房|套房", name):
            spec = "指定房型"
        if len(name) < 2 or re.search(r"产品概述|出行日期|线路特点", name):
            continue
        cabins.append(
            {
                "name": name,
                "spec": spec,
                "price": format_price(price_num),
                "soldOut": "售罄" in text[m.start() : m.end() + 40],
            }
        )

    seen = set()
    uniq = []
    for c in cabins:
        key = (c["name"], c["spec"], c["price"])
        if key in seen:
            continue
        seen.add(key)
        uniq.append(c)
    return uniq


def split_bracket_items(block: str) -> list[str]:
    items = re.findall(r"【([^】]+)】([^【]+)", block)
    if items:
        return [norm(f"{k}：{v}") for k, v in items]
    lines = [norm(x) for x in re.split(r"[；;]\s*", block) if len(norm(x)) > 4]
    return lines[:20]


def parse_fees(slides: list[str]) -> tuple[list[str], list[str]]:
    included, excluded = [], []
    for slide in slides:
        if "费用包含" not in slide:
            continue
        m = re.search(r"费用包含[：:]\s*(.+?)(?=费用不含|$)", slide, re.S)
        if m:
            included = split_bracket_items(m.group(1))
        m2 = re.search(r"费用不含[：:]\s*(.+?)(?=费用说明|报名须知|$)", slide, re.S)
        if m2:
            excluded = split_bracket_items(m2.group(1))
        break
    return included, excluded


def parse_notice_sections(slides: list[str]) -> list[dict]:
    sections = []
    for slide in slides:
        if not any(k in slide for k in ("报名须知", "预定政策", "取消政策", "签证说明")):
            continue
        if "报名须知" in slide:
            m = re.search(r"报名须知[：:]\s*(.+?)(?=预定政策|取消政策|签证说明|$)", slide, re.S)
            if m:
                sections.append({"title": "报名须知", "content": norm(m.group(1))})
        if "预定政策" in slide:
            m = re.search(r"预定政策[：:]\s*(.+?)(?=取消政策|签证说明|$)", slide, re.S)
            if m:
                bullets = re.findall(r"[①②③④⑤]\s*([^①②③④⑤]+)", m.group(1))
                if bullets:
                    sections.append({"title": "预定政策", "bullets": [norm(b) for b in bullets]})
                else:
                    sections.append({"title": "预定政策", "content": norm(m.group(1))})
        if "取消政策" in slide:
            m = re.search(r"取消政策[：:]\s*(.+?)(?=签证说明|\*|$)", slide, re.S)
            if m:
                bullets = re.findall(r"[①②③④⑤]\s*([^①②③④⑤*]+)", m.group(1))
                table = []
                for row in re.findall(
                    r"出发前(\d+[^；;]*?)[；;]\s*([^①②③④⑤]+)",
                    m.group(1),
                ):
                    table.append([f"出发前{norm(row[0])}", norm(row[1])])
                sec: dict = {"title": "取消政策"}
                if table:
                    sec["table"] = table
                elif bullets:
                    sec["bullets"] = [norm(b) for b in bullets]
                else:
                    sec["content"] = norm(m.group(1))
                sections.append(sec)
        if "签证说明" in slide:
            m = re.search(r"签证说明[：:]\s*(.+?)(?=预定需知|$)", slide, re.S)
            if m:
                sections.append({"title": "签证说明", "content": norm(m.group(1))})
        break
    return sections


def parse_highlight_slide_marked(slide: str) -> dict | None:
    """按 PPT「行程亮点」页提取：正文 + · 标题（中英文副标题之前）"""
    if not HIGHLIGHT_MARKER.search(slide):
        return None
    body = HIGHLIGHT_MARKER.split(slide, maxsplit=1)[0].strip()
    title_m = re.search(
        r"([\u4e00-\u9fff][\u4e00-\u9fff\s·]{3,48}?)(?:\s+[A-Za-z][A-Za-z\s·]{2,40})?\s*$",
        body,
    )
    if title_m:
        title = norm(title_m.group(1))
        content = norm(body[: title_m.start()].strip())
    else:
        parts = [norm(p) for p in re.split(r"(?<=[。！？])\s*", body) if len(norm(p)) > 10]
        if not parts:
            return None
        title = parts[-1][:48]
        content = " ".join(parts[:-1]) if len(parts) > 1 else parts[0]
    if len(content) < 20:
        return None
    if len(title) < 4:
        title = content[:24] + ("…" if len(content) > 24 else "")
    return {"title": title, "content": content[:1200]}


def parse_bracket_highlights(slide: str) -> list[dict]:
    items = []
    for k, v in re.findall(r"【([^】]+)】([^【]+)", slide):
        title = norm(k)
        content = norm(v)
        if len(title) >= 4 and len(content) >= 8:
            items.append({"title": title, "content": content[:800]})
    return items


def parse_arctic_intro_slide(slide: str) -> dict | None:
    if "北极三岛" not in slide or "世界之北" not in slide:
        return None
    if HIGHLIGHT_MARKER.search(slide):
        return None
    content = norm(slide)
    return {"title": "北极三岛 · 地球穹顶", "content": content[:1200]}


def parse_overview_destination_highlights(slides: list[str]) -> list[dict]:
    """部分轻探险产品没有单独「行程亮点」页，目的地介绍页就是亮点内容。"""
    highlights = []
    in_overview = False
    title_pat = re.compile(
        r"^([\u4e00-\u9fff]{2,12}\s*[-—·]\s*[\u4e00-\u9fffA-Za-z]{2,16}?)"
        r"(?=(?:一座|一片|作为|历史|古老|以|坐落|被誉为|藏着|多元|世界|拥有))"
        r"(.+)$"
    )
    for slide in slides:
        if "产品概述" in slide or "Product overview" in slide:
            in_overview = True
            continue
        if not in_overview:
            continue
        if re.search(r"航线图|Itinerary\s+map|行程简介|Itinerary\s+introduction", slide, re.I):
            break
        if COMPANY_SLIDE.search(slide) or SHIP_ZONE.search(slide):
            continue
        m = title_pat.match(slide)
        if not m:
            continue
        title = norm(m.group(1))
        content = norm(m.group(2))
        content = re.sub(r"\s+[A-Z][A-Za-z\s]{2,24}$", "", content).strip()
        if len(title) < 5 or len(content) < 30:
            continue
        highlights.append({"title": title, "content": content[:900]})
    return highlights[:8]


def parse_intro_highlight_title(slide: str) -> tuple[str, str] | None:
    cleaned = re.sub(r"\s+[A-Z][A-Za-z\s·,&'-]{2,80}$", "", slide).strip()
    explicit = re.match(
        r"^([\u4e00-\u9fff]{2,12}\s*[-—·]\s*[\u4e00-\u9fffA-Za-z]{2,16}?)"
        r"(?=(?:一座|一片|作为|历史|古老|以|坐落|被誉为|藏着|多元|世界|拥有|在|当))"
        r"(.+)$",
        cleaned,
    )
    if explicit:
        return norm(explicit.group(1)), norm(explicit.group(2))

    starter = re.search(
        r"(一座|一个|一片|在|当|它|作为|是|为|曾|从|非洲最|地中海|世界|"
        r"坐落|被誉为|拥有|古老|邂逅|荒野|水与沙|尊享|全新升级|"
        r"特别的路线|精灵的世界)",
        cleaned,
    )
    if starter and 1 <= starter.start() <= 18:
        title = norm(cleaned[: starter.start()])
        content = norm(cleaned[starter.start() :])
        half = len(title) // 2
        if len(title) % 2 == 0 and title[:half] == title[half:]:
            title = title[:half]
        return title, content

    if len(cleaned) >= 70:
        title = cleaned[:22]
        content = cleaned[22:]
        return norm(title), norm(content)
    return None


def parse_intro_destination_highlights(slides: list[str]) -> list[dict]:
    """封面后的目的地/体验介绍页，经常承载真实卖点但没有「亮点」标题。"""
    highlights = []
    reject = re.compile(
        r"出行日期|舱位价格|产品概述|航线图|路线图|地图|行程简介|费用包含|费用不含|"
        r"参考航班|参考住宿|参考餐食|报名须知|取消政策|预定政策",
        re.I,
    )
    for idx, slide in enumerate(slides):
        if idx == 0:
            continue
        if re.search(r"行程简介|Itinerary\s+introduction", slide, re.I):
            break
        if reject.search(slide) or COMPANY_SLIDE.search(slide) or SHIP_ZONE.search(slide):
            continue
        if len(slide) < 70 or not re.search(r"[\u4e00-\u9fff]", slide):
            continue
        parsed = parse_intro_highlight_title(slide)
        if not parsed:
            continue
        title, content = parsed
        if len(title) < 2 or len(content) < 35:
            continue
        highlights.append({"title": title[:48], "content": content[:900]})
        if len(highlights) >= 8:
            break
    return highlights


def parse_antarctic_style_highlights(slides: list[str]) -> list[dict]:
    """南极飞船游：亮点在费用页之后、行程简介之前"""
    highlights = []
    started = False
    for slide in slides:
        if "费用包含" in slide or "费用不含" in slide:
            started = True
            continue
        if not started:
            continue
        if STOP_HIGHLIGHT.search(slide):
            if "航线图" in slide or "行程简介" in slide:
                break
            continue
        if HIGHLIGHT_MARKER.search(slide):
            block = parse_highlight_slide_marked(slide)
            if block:
                highlights.append(block)
            continue
        if "行程亮点" in slide:
            continue
        parts = [norm(x) for x in re.split(r"(?<=[。！？])\s*", slide) if len(norm(x)) > 12]
        if len(parts) < 2:
            continue
        title = parts[0][:36]
        rest = " ".join(parts[1:])
        bullets = [norm(s) for s in re.split(r"[。；]\s*", rest) if 15 <= len(norm(s)) <= 140]
        if len(bullets) >= 2:
            highlights.append({"title": title, "bullets": bullets[:8]})
        elif len(rest) >= 20:
            highlights.append({"title": title, "content": rest[:800]})
    return highlights


def parse_highlight_sections(slides: list[str]) -> list[dict]:
    highlights = []
    seen_titles: set[str] = set()

    def add(block: dict | None):
        if not block:
            return
        blob = f"{block.get('title', '')} {block.get('content', '')} {' '.join(block.get('bullets', []))}"
        if COMPANY_SLIDE.search(blob):
            return
        t = block.get("title", "")
        if t in seen_titles:
            return
        seen_titles.add(t)
        highlights.append(block)

    for slide in slides:
        if COMPANY_SLIDE.search(slide):
            continue
        if STOP_HIGHLIGHT.search(slide) and not HIGHLIGHT_MARKER.search(slide):
            if "航线图" in slide or "行程简介" in slide:
                break
            continue
        bracket_items = parse_bracket_highlights(slide)
        if bracket_items:
            for item in bracket_items:
                add(item)
        elif HIGHLIGHT_MARKER.search(slide):
            add(parse_highlight_slide_marked(slide))
        add(parse_arctic_intro_slide(slide))

    if len(highlights) < 3:
        for block in parse_overview_destination_highlights(slides):
            add(block)

    if len(highlights) < 3:
        for block in parse_intro_destination_highlights(slides):
            add(block)

    if len(highlights) < 3:
        for block in parse_antarctic_style_highlights(slides):
            add(block)

    return highlights[:12]


def parse_itinerary_overview(slide: str) -> list[dict]:
    items = []
    for m in re.finditer(
        r"Day\s*(\d+(?:-\d+)?)\s+(\d+\s*月\s*\d+(?:-\d+)?\s*日)?\s*([^D]+?)(?=Day\s*\d|$)",
        slide,
        re.I,
    ):
        day = m.group(1).replace(" ", "")
        date = norm(m.group(2) or "")
        title = norm(m.group(3))
        if len(title) < 2:
            continue
        items.append(
            {
                "day": day,
                "date": date,
                "title": title[:80],
                "content": title,
            }
        )
    return items


def strip_itinerary_meta_tail(text: str) -> str:
    text = re.sub(r"行程简介\s*Itinerary\s+introduction", "", text, flags=re.I)
    text = re.sub(
        r"参考(?:住宿|餐食|航班)\s*[：:][^参考行程day\*]+",
        "",
        text,
        flags=re.I,
    )
    text = re.sub(r"住宿\s*[：:][^参考行程day\*]+", "", text, flags=re.I)
    text = re.sub(r"\*[^。]+。?$", "", text)
    return norm(text)


def extract_itinerary_body(text: str) -> str:
    text = strip_itinerary_meta_tail(text)
    for pat in (
        r"航海日.+",
        r"今日.+",
        r"当您.+",
        r"这\s*\d.+",
        r"(?:进入|离开|游览|乘坐|探索|告别).+",
        r"(?:国内|雷克雅|斯科斯|伊托科|奥斯卡|凯瑟|朗伊尔|斯瓦尔巴|新奥勒松).+",
    ):
        m = re.search(pat, text, re.S)
        if m and len(m.group(0)) > 15:
            return norm(m.group(0))
    return text


def parse_itinerary_day_slides(slides: list[str]) -> list[dict]:
    """逐页解析「正文 + day N 日期 + 参考住宿/餐食」结构的日程幻灯片"""
    items = []
    day_pat = re.compile(
        r"day\s*(\d+(?:-\d+)?)\s+(\d+\s*月\s*\d+(?:-\d+)?\s*日)",
        re.I,
    )
    for slide in slides:
        if not re.search(r"参考(?:住宿|餐食)|住宿\s*[：:]", slide):
            continue
        matches = list(day_pat.finditer(slide))
        if not matches:
            continue
        for i, m in enumerate(matches):
            before = slide[: m.start()] if i == 0 else slide[matches[i - 1].end() : m.start()]
            after = slide[m.end() : matches[i + 1].start() if i + 1 < len(matches) else len(slide)]
            before_clean = extract_itinerary_body(before)
            after_clean = extract_itinerary_body(after)
            if len(before_clean) >= 50 and not before_clean.startswith("参考"):
                narrative = before_clean
            elif len(after_clean) >= 30:
                narrative = after_clean
            else:
                narrative = before_clean if len(before_clean) >= len(after_clean) else after_clean
            if len(narrative) < 12:
                continue
            title, content = narrative[:48], narrative
            if i == len(matches) - 1 and m.end() >= len(slide) - 30:
                tail_m = re.search(
                    r"([\u4e00-\u9fffA-Za-z（）\(\)·丨\s]{6,55})\s*$",
                    before if len(before_clean) >= 30 else after,
                )
                if tail_m and len(narrative) > len(tail_m.group(1)) + 30:
                    title = norm(tail_m.group(1))
                    content = extract_itinerary_body(
                        (before if len(before_clean) >= 30 else after)[: tail_m.start()]
                    )
            else:
                title_m = re.match(
                    r"^([\u4e00-\u9fffA-Za-z（）\(\)·丨\-\s]{4,55}?(?:·|丨)[\u4e00-\u9fffA-Za-z（）\(\)·\s]{0,35}?)"
                    r"(?=[，,。\s]|今日|乘坐|抵达|探索|当您|离开|进入|游览|格陵兰|航海|国内|参考)",
                    narrative,
                )
                if title_m:
                    title = norm(title_m.group(1))
                    content = norm(narrative[title_m.end() :])
                elif narrative.startswith("航海日"):
                    title, content = "航海日", norm(narrative[3:])
            meta_parts = []
            tail = after
            for label in ("参考航班", "参考住宿", "参考餐食", "住宿"):
                mm = re.search(
                    label + r"\s*[：:]\s*([^参考]+?)(?=参考|行程简介|day\s|\*|$)",
                    tail,
                    re.I,
                )
                if mm:
                    meta_parts.append(f"{label}：{norm(mm.group(1))}")
            items.append(
                {
                    "day": m.group(1).replace(" ", ""),
                    "date": norm(m.group(2)),
                    "title": title[:80],
                    "meta": " · ".join(meta_parts) if meta_parts else None,
                    "content": content[:1200] if len(content) > 20 else narrative[:1200],
                }
            )
    return items


def parse_itinerary_day_cards(slides: list[str]) -> list[dict]:
    items = []
    for slide in slides:
        if "day " not in slide.lower() and "Day " not in slide:
            continue
        for m in re.finditer(
            r"day\s*(\d+(?:-\d+)?)\s+(\d+\s*月\s*\d+(?:-\d+)?\s*日)\s*(.+?)(?=day\s*\d|Day\s*\d|行程简介|$)",
            slide,
            re.I | re.S,
        ):
            body = norm(m.group(3))
            title_m = re.match(r"^([\u4e00-\u9fffA-Za-z丨\-\s]{2,40})", body)
            title = title_m.group(1).strip() if title_m else body[:40]
            meta_parts = []
            for label in ("参考航班", "参考住宿", "参考餐食"):
                mm = re.search(label + r"\s*[：:]\s*([^参考]+)", body)
                if mm:
                    meta_parts.append(f"{label}：{norm(mm.group(1))}")
            content_m = re.search(
                r"(?:国内|早餐后|今日|南极|北极|格陵兰|冰岛|丹麦|挪威|斯瓦尔巴|"
                r"哥本哈根|雷克雅|斯科斯|伊托科|登船|航海|冲锋|登陆|德雷克|"
                r"布宜诺斯|圣地亚哥|探索|行程|告别|巡游|峡湾).+",
                body,
            )
            content = norm(content_m.group(0)) if content_m else body[:800]
            if len(content) < 40 and len(body) > len(content):
                content = body[:800]
            items.append(
                {
                    "day": m.group(1).replace(" ", ""),
                    "date": norm(m.group(2)),
                    "title": title,
                    "meta": " · ".join(meta_parts) if meta_parts else None,
                    "content": content,
                }
            )
    return items


def split_chinese_day_title(body: str) -> tuple[str, str]:
    body = strip_itinerary_meta_tail(body)
    body = re.sub(r"每日行程", "", body).strip()
    body = norm(body)
    title_m = re.match(
        r"^(.{4,64}?)(?=(?:抵达|清晨|早餐|下午|今日|我们|随着|海上|位于|向北|搭乘|"
        r"这里|岛上|小镇|北极|具体|天气|在|是|拥有|将|您|踏上|离船|探索))",
        body,
    )
    if title_m:
        title = norm(title_m.group(1))
        content = norm(body[title_m.end() :])
        if len(content) >= 25:
            return title[:80], content[:1200]
    return body[:48], body[:1200]


def parse_chinese_itinerary_slides(slides: list[str]) -> list[dict]:
    items = []
    day_pat = re.compile(r"第\s*(\d+)\s*天(?:\s*[～~-]\s*第?\s*(\d+)\s*天)?")
    for slide in slides:
        if "每日行程" not in slide or "第" not in slide or "天" not in slide:
            continue
        if "费用包含" in slide or "费用信息" in slide or SHIP_ZONE.search(slide):
            continue
        matches = list(day_pat.finditer(slide))
        if not matches:
            continue
        for idx, match in enumerate(matches):
            start = match.end()
            end = matches[idx + 1].start() if idx + 1 < len(matches) else len(slide)
            body = norm(slide[start:end])
            if len(body) < 25:
                continue
            day = match.group(1)
            if match.group(2):
                day = f"{match.group(1)}-{match.group(2)}"
            title, content = split_chinese_day_title(body)
            items.append(
                {
                    "day": day,
                    "date": "",
                    "title": title,
                    "content": content,
                }
            )
    return items


def parse_itinerary(slides: list[str]) -> list[dict]:
    chinese = parse_chinese_itinerary_slides(slides)
    if len(chinese) >= 4:
        return chinese
    day_slides = parse_itinerary_day_slides(slides)
    if len(day_slides) >= 4:
        return day_slides
    for slide in slides:
        if "行程简介" in slide and re.search(r"Day\s*\d", slide, re.I):
            overview = parse_itinerary_overview(slide)
            if len(overview) >= 4:
                return overview
    day_cards = parse_itinerary_day_cards(slides)
    if len(day_cards) >= 4:
        return day_cards
    for slide in slides:
        overview = parse_itinerary_overview(slide)
        if len(overview) >= 3:
            return overview
    return []


def detect_ship_name(slides: list[str], product_ship: str = "") -> str:
    content_slides = [s for s in slides if not COMPANY_SLIDE.search(s)]
    blob = " ".join(content_slides)
    if re.search(r"中国国家地理号|国家地理号", blob, re.I):
        return "中国国家地理号"
    if re.search(r"银海奋进|Silver\s+Endeavour", blob, re.I):
        return "银海奋进号"
    if re.search(r"庞洛北冕号|北冕号", blob, re.I):
        return "庞洛北冕号"
    if re.search(r"指挥官夏古号|夏古号|Le\s+Commandant\s+Charcot|COMMANDANT\s+CHARCOT", blob, re.I):
        return "指挥官夏古号"
    if re.search(r"海神号|Seaventure", blob, re.I):
        return "Seaventure 海神号"
    if "环球领航" in blob or "World Navigator" in blob:
        return "World Navigator 环球领航号"
    if re.search(r"庞洛日丽号|Le\s+Laperouse", blob, re.I):
        return "Le Laperouse 庞洛日丽号"
    if re.search(r"Silversea|银海", blob, re.I):
        return "银海邮轮"
    if re.search(r"庞洛|Ponant", blob, re.I):
        return "庞洛邮轮"
    if product_ship and product_ship != "探险邮轮":
        return product_ship
    return product_ship or "探险邮轮"


def parse_ship_intro_from_ppt(slides: list[str]) -> str:
    parts = []
    in_zone = False
    for slide in slides:
        if "费用包含" in slide or "费用不含" in slide:
            in_zone = True
            continue
        if not in_zone:
            continue
        if COMPANY_SLIDE.search(slide):
            continue
        if not SHIP_ZONE.search(slide):
            continue
        cleaned = re.sub(r"邮轮介绍\s*Cruise\s+introduction", "", slide, flags=re.I)
        cleaned = re.sub(r"舱房介绍|甲板平面图|邮轮设施", "", cleaned, flags=re.I)
        cleaned = norm(cleaned)
        if len(cleaned) > 60 and cleaned not in parts:
            parts.append(cleaned[:600])
        if len(parts) >= 3:
            break
    return " ".join(parts)[:1200]


def parse_ship_specs_from_ppt(slide: str) -> list[list[str]] | None:
    if "海神" not in slide and "Seaventure" not in slide:
        return None
    pairs = []
    labels = [
        ("翻新年份", r"翻新年份\s*(\d{4})"),
        ("载客", r"载客\s*(\d+)\s*人"),
        ("船员", r"船员\s*(\d+)\s*人"),
        ("吃水", r"吃水\s*([\d.]+)\s*米"),
        ("船长", r"船长\s*([\d.]+)\s*米"),
        ("船宽", r"船宽\s*(\d+)\s*米"),
        ("吨位", r"吨位\s*([\d,]+)\s*吨"),
        ("航速", r"平均航速\s*([\d.]+)\s*节"),
        ("抗冰", r"抗冰级\s*([^\s]{2,12})"),
        ("餐厅", r"餐厅\s*(\d+)\s*个"),
    ]
    for label, pat in labels:
        m = re.search(pat, slide)
        if m:
            pairs.append([label, norm(m.group(1))])
    return pairs if len(pairs) >= 4 else None


def parse_ship_facilities_from_ppt(slides: list[str]) -> list[str]:
    facilities = []
    for slide in slides:
        if "邮轮设施" not in slide and "美食餐厅" not in slide:
            continue
        if COMPANY_SLIDE.search(slide):
            continue
        for label in (
            "美食餐厅",
            "俱乐部酒吧",
            "酒吧大厅",
            "露天泳池",
            "剧院",
            "健身房",
            "桑拿房",
            "图书馆",
            "休息厅",
        ):
            if label in slide:
                m = re.search(label + r"[^。]{8,120}", slide)
                if m:
                    facilities.append(norm(m.group(0))[:100])
    return list(dict.fromkeys(facilities))[:10]


def load_ship_profile(ship_name: str, profiles_dir: Path) -> dict | None:
    keys = {
        "海神": "seaventure",
        "Seaventure": "seaventure",
        "环球领航": "atlas",
        "World Navigator": "atlas",
        "庞洛日丽": "ponant",
        "Le Laperouse": "ponant",
    }
    pid = None
    for k, v in keys.items():
        if k in ship_name:
            pid = v
            break
    if not pid:
        return None
    path = profiles_dir / f"{pid}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def build_ship_detail(
    profile: dict | None,
    ship_name: str,
    cabins: list[dict],
    ppt_intro: str = "",
    ppt_specs: list[list[str]] | None = None,
    ppt_facilities: list[str] | None = None,
) -> dict:
    intro_parts = []
    if profile:
        intro_parts.append(profile.get("tagline", ""))
        for sec in profile.get("sections", [])[:2]:
            if sec.get("content"):
                intro_parts.append(sec["content"])
    if ppt_intro:
        intro_parts.append(ppt_intro)
    intro = norm(" ".join(p for p in intro_parts if p))[:1200]
    if not intro:
        intro = f"{ship_name}，舱位与设施以签约方案为准。"

    specs = (profile.get("specs") if profile else None) or ppt_specs
    facilities = (profile.get("facilities") if profile else None) or ppt_facilities

    ship_cabins = []
    if profile:
        ship_cabins = [
            {
                "name": c["name"],
                "spec": c.get("spec", ""),
                "price": c.get("note", "价格咨询"),
            }
            for c in profile.get("cabins", [])
        ]
    if not ship_cabins and cabins:
        ship_cabins = [
            {"name": c["name"], "spec": c["spec"], "price": c["price"]} for c in cabins
        ]

    out = {
        "name": profile.get("vesselName", ship_name) if profile else ship_name,
        "intro": intro,
        "cabins": ship_cabins,
    }
    if specs:
        out["specs"] = specs
    if facilities:
        out["facilities"] = facilities
    return out


def extract(pptx_path: str, product: dict | None, profiles_dir: Path) -> dict:
    slides = get_slides(pptx_path)
    slide1 = slides[0] if slides else ""

    meta = parse_meta_table(slides)
    cabins = []
    for s in slides:
        cabins.extend(parse_cabins(s))
    seen = set()
    uniq_cabins = []
    for c in cabins:
        c = sanitize_cabin(c)
        if not c:
            continue
        key = (
            norm(c.get("name", "")),
            re.sub(r"可住\d+人", "", re.sub(r"\s+", "", norm(c.get("spec", "")))),
            c.get("price"),
        )
        if key in seen:
            continue
        seen.add(key)
        uniq_cabins.append(c)

    fee_in, fee_out = parse_fees(slides)
    notices = parse_notice_sections(slides)
    highlights = parse_highlight_sections(slides)
    itinerary = parse_itinerary(slides)

    title_en = parse_title_en(slide1)
    subtitle = (product.get("subcategory") or product.get("shipName", "")) if product else ""
    extra = [product.get("subcategory")] if product and product.get("subcategory") else []
    tags = list(dict.fromkeys(((product.get("tags") or []) if product else []) + extra))[:5]

    ship_name = detect_ship_name(
        slides, product.get("shipName", "") if product else ""
    )
    profile = load_ship_profile(ship_name, profiles_dir)
    ppt_intro = parse_ship_intro_from_ppt(slides)
    ppt_specs = None
    for s in slides:
        ppt_specs = parse_ship_specs_from_ppt(s) or ppt_specs
    ppt_facilities = parse_ship_facilities_from_ppt(slides)
    ship_detail = build_ship_detail(
        profile,
        ship_name,
        uniq_cabins,
        ppt_intro=ppt_intro,
        ppt_specs=ppt_specs,
        ppt_facilities=ppt_facilities or None,
    )

    detail = {
        "titleEn": title_en,
        "subtitle": subtitle,
        "tags": [t for t in tags if t],
        "metaTable": meta,
        "cabins": uniq_cabins,
        "highlightSections": highlights,
        "itinerary": [{k: v for k, v in d.items() if v is not None} for d in itinerary],
        "itineraryNote": "可登陆点仅供参考，经验丰富的探险队会根据天气和海况决定实际登陆地点。",
        "shipDetail": ship_detail,
        "feeIncluded": fee_in,
        "feeExcluded": fee_out,
        "noticeSections": notices,
    }

    slug = product.get("slug", "") if product else ""
    if slug:
        trip_dir = Path(__file__).resolve().parent.parent / "public" / "trips" / slug
        for name in ("hero.jpg", "hero.png", "hero.webp"):
            if (trip_dir / name).exists():
                detail["heroImage"] = f"/trips/{slug}/{name}"
                break
        for name in ("route-map.png", "route-map.jpeg", "route-map.jpg"):
            if (trip_dir / name).exists():
                detail["routeMap"] = {
                    "src": f"/trips/{slug}/{name}",
                    "alt": "航程航线图",
                    "caption": ROUTE_CAPTION,
                }
                break
        if profile and profile.get("gallery"):
            detail["gallery"] = profile["gallery"][:6]

    return detail


def score(detail: dict) -> int:
    s = 0
    s += len(detail.get("highlightSections") or []) * 3
    s += len(detail.get("itinerary") or []) * 2
    s += len(detail.get("feeIncluded") or [])
    s += len(detail.get("feeExcluded") or [])
    s += len(detail.get("noticeSections") or []) * 2
    s += len(detail.get("cabins") or [])
    s += 5 if detail.get("shipDetail", {}).get("specs") else 0
    return s


def main():
    if len(sys.argv) < 2:
        print("usage: extract-pptx-detail.py <pptx> [--product-json path]", file=sys.stderr)
        sys.exit(1)
    pptx = sys.argv[1]
    product = None
    if "--product-json" in sys.argv:
        i = sys.argv.index("--product-json")
        product = json.loads(Path(sys.argv[i + 1]).read_text(encoding="utf-8"))
    profiles_dir = Path(__file__).resolve().parent.parent / "data" / "ship-profiles"
    detail = extract(pptx, product, profiles_dir)
    print(json.dumps(detail, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
