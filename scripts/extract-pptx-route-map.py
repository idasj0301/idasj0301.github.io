#!/usr/bin/env python3
"""从 pptx 中提取「航线图」幻灯片上的主图，写入目标路径。排除甲板图/客舱图。"""
import re
import struct
import sys
import zipfile
from pathlib import Path

# 明确是船舱/甲板/房型介绍页，整页跳过
NEGATIVE_SLIDE = re.compile(
    r"甲板图|客舱介绍|客舱|房型|船舱|甲板介绍|邮轮介绍|极地邮轮介绍|"
    r"DECK\s*PLAN|CABIN|套房面积|层甲板",
    re.I,
)

# 每日行程页里的「*航线」免责声明，不是航线图页
ITINERARY_DAY_SLIDE = re.compile(r"每日行程|DAY\s*\d|第\s*\d+\s*天", re.I)


def png_size(data: bytes):
    if data[:8] == b"\x89PNG\r\n\x1a\n" and len(data) >= 24:
        w, h = struct.unpack(">II", data[16:24])
        return w, h
    return 0, 0


def jpeg_size(data: bytes):
    i = 2
    while i < len(data) - 9:
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB):
            h = struct.unpack(">H", data[i + 5 : i + 7])[0]
            w = struct.unpack(">H", data[i + 7 : i + 9])[0]
            return w, h
        length = struct.unpack(">H", data[i + 2 : i + 4])[0]
        i += 2 + length
    return 0, 0


def image_dims(data: bytes):
    w, h = png_size(data)
    if w and h:
        return w, h
    return jpeg_size(data)


def slide_text_score(text: str) -> int:
    if NEGATIVE_SLIDE.search(text):
        return 0
    if "航线图" in text:
        return 120
    if re.search(r"Itinerary\s*map", text, re.I):
        return 110
    if "航次安排" in text or re.search(r"出发\s*/\s*到达", text):
        return 100
    if "行程图" in text:
        return 85
    if ITINERARY_DAY_SLIDE.search(text) and "航线图" not in text:
        return 0
    if re.search(r"航线", text) and "行程简介" not in text and "航线详情" not in text:
        return 40
    return 0


def image_route_score(data: bytes, slide_score: int = 0) -> int:
    if len(data) < 25_000:
        return 0
    w, h = image_dims(data)
    if w > 0 and h > 0:
        # 竖图一律视为非航线图（甲板图、客舱图、风景照）
        if h > w * 1.12:
            return 0
        min_w = 500 if slide_score >= 100 else 900
        min_h = 350 if slide_score >= 100 else 400
        if w < min_w or h < min_h:
            return 0
        aspect = w / max(h, 1)
        area = w * h
        # 航线图页经常带一张大背景风景图，真正的地图反而是中等尺寸。
        # 在明确「航线图 / Itinerary map」的页面里，优先保留地图常见比例，
        # 避免把横向风景照误判为 route-map。
        if slide_score >= 100:
            if 1.25 <= aspect <= 1.75 and area <= 1_200_000:
                return int(area * 8)
            if area > 1_800_000:
                return int(area * 0.08)
        if aspect >= 1.35:
            return int(area * min(aspect, 4.0))
        if aspect >= 1.15:
            return int(area * 0.75)
        return int(area * 0.2)
    return len(data) // 4


def find_route_media(ppt_path: str):
    with zipfile.ZipFile(ppt_path) as z:
        slides = sorted(
            [n for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml", n)],
            key=lambda x: int(re.search(r"slide(\d+)", x).group(1)),
        )
        best_total = -1
        best_media = None

        for sn in slides:
            num = int(re.search(r"slide(\d+)", sn).group(1))
            xml = z.read(sn).decode("utf-8", "ignore")
            text = " ".join(re.findall(r"<a:t>([^<]*)</a:t>", xml))
            slide_score = slide_text_score(text)
            if slide_score <= 0:
                continue

            rel_path = f"ppt/slides/_rels/slide{num}.xml.rels"
            if rel_path not in z.namelist():
                continue

            rels = z.read(rel_path).decode("utf-8", "ignore")
            rid_to_media = {}
            for m in re.finditer(r'Id="(rId\d+)"[^>]*Target="([^"]+)"', rels):
                target = m.group(2)
                if "media/" in target and not target.lower().endswith(".wdp"):
                    rid_to_media[m.group(1)] = "ppt/" + target.replace("../", "")

            for rid in re.findall(r'r:embed="(rId\d+)"', xml):
                media = rid_to_media.get(rid)
                if not media or media not in z.namelist():
                    continue
                data = z.read(media)
                img_score = image_route_score(data, slide_score)
                if img_score <= 0:
                    continue
                total = slide_score * 10**10 + img_score
                if total > best_total:
                    best_total = total
                    best_media = (media, data)

        if best_media:
            return best_media

        # 回退：全 deck 中最宽横向大图（仍排除小图）
        best_wide = None
        best_wide_score = 0
        for name in z.namelist():
            if not name.startswith("ppt/media/"):
                continue
            if name.lower().endswith(".wdp"):
                continue
            if not re.search(r"\.(png|jpe?g|webp)$", name, re.I):
                continue
            data = z.read(name)
            w, h = image_dims(data)
            if w < 900 or w <= h * 1.2:
                continue
            if len(data) < 60_000:
                continue
            s = w * h
            if s > best_wide_score:
                best_wide_score = s
                best_wide = (name, data)
        return best_wide


def extract_named_media(ppt_path: Path, media_path: str, out: Path):
    media_path = media_path.lstrip("/")
    with zipfile.ZipFile(ppt_path) as z:
        if media_path not in z.namelist():
            raise FileNotFoundError(media_path)
        data = z.read(media_path)
    ext = Path(media_path).suffix.lower() or ".png"
    if out.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp"):
        out = out.with_suffix(ext)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(data)
    return out, media_path, data


def main() -> int:
    if len(sys.argv) < 3:
        print("usage: extract-pptx-route-map.py <input.pptx> <output-path> [ppt/media/image.png]", file=sys.stderr)
        return 2
    src = Path(sys.argv[1])
    out = Path(sys.argv[2])
    if not src.is_file():
        print(f"missing: {src}", file=sys.stderr)
        return 1
    if len(sys.argv) >= 4:
        try:
            out, media_path, data = extract_named_media(src, sys.argv[3], out)
        except FileNotFoundError:
            print(f"missing preferred route image: {src}::{sys.argv[3]}", file=sys.stderr)
            return 1
        w, h = image_dims(data)
        print(f"{out} ({w}x{h} from {media_path})")
        return 0
    found = find_route_media(str(src))
    if not found:
        print(f"no route image: {src}", file=sys.stderr)
        return 1
    media_path, data = found
    ext = Path(media_path).suffix.lower() or ".png"
    if out.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp"):
        out = out.with_suffix(ext)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(data)
    w, h = image_dims(data)
    print(f"{out} ({w}x{h} from {media_path})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
