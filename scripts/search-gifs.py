#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

REMAINING = [
    "hollow-body-hold",
    "box-jump",
    "cat-cow",
    "pigeon-pose",
    "wall-sit",
    "medicine-ball-slam",
    "pallof-press",
    "cable-woodchop",
    "thoracic-rotation",
    "worlds-greatest-stretch",
]

QUERIES = {
    "hollow-body-hold": ["hollow hold", "hollow body"],
    "box-jump": ["box jump"],
    "cat-cow": ["cat cow", "cat camel"],
    "pigeon-pose": ["pigeon", "hip stretch"],
    "wall-sit": ["wall sit", "wall squat"],
    "medicine-ball-slam": ["medicine ball slam", "slam ball"],
    "pallof-press": ["pallof"],
    "cable-woodchop": ["wood chop", "woodchop"],
    "thoracic-rotation": ["thread the needle", "open book"],
    "worlds-greatest-stretch": ["spiderman", "world greatest stretch"],
}

GIF_RE = re.compile(
    r"https://fitnessprogramer\.com/wp-content/uploads/\d{4}/\d{2}/[^\"']+\.gif"
)
HREF_RE = re.compile(r'href="(https://fitnessprogramer\.com/exercise/[^"]+/)"')


def get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read().decode("utf-8", "ignore")


def main() -> None:
    found: dict[str, str] = {}
    for eid in REMAINING:
        for q in QUERIES[eid]:
            search = f"https://fitnessprogramer.com/?s={urllib.parse.quote(q)}"
            try:
                html = get(search)
            except Exception as exc:
                print("search fail", eid, q, exc)
                continue
            pages = HREF_RE.findall(html)
            print(eid, q, "pages", pages[:5])
            for page in pages[:8]:
                try:
                    page_html = get(page)
                except Exception:
                    continue
                match = GIF_RE.search(page_html)
                if match:
                    found[eid] = match.group(0)
                    print("OK", eid, "->", found[eid], "from", page)
                    break
            if eid in found:
                break
        if eid not in found:
            print("MISS", eid)
    Path("scripts/gif-search.json").write_text(
        json.dumps(found, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
