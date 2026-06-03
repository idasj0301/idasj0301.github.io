#!/usr/bin/env python3
"""从 pptx 提取前 12 页文本，幻灯片之间用 ---SLIDE--- 分隔。"""
import re
import sys
import zipfile

def main():
    path = sys.argv[1]
    with zipfile.ZipFile(path) as z:
        slides = sorted(
            [n for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml", n)],
            key=lambda x: int(re.search(r"slide(\d+)", x).group(1)),
        )
        texts = []
        for s in slides[:12]:
            xml = z.read(s).decode("utf-8", "ignore")
            t = re.findall(r"<a:t>([^<]*)</a:t>", xml)
            texts.append(" ".join(t))
    print("---SLIDE---".join(texts))

if __name__ == "__main__":
    main()
