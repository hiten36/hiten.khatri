#!/usr/bin/env python3
import re
import urllib.request

PAGES = [
    "hollow-hold",
    "wall-sit",
    "box-jump-1-to-2",
    "cable-kneeling-wood-chop",
    "standing-cable-wood-chop",
    "high-pulley-wood-chop",
    "wood-chop",
    "spiderman-exercise",
    "spiderman-push-up",
    "worlds-greatest-stretch",
    "kneeling-hip-flexor-stretch",
    "cable-twist",
    "standing-cable-twist",
    "prone-abdominal-hollowing",
]


def gif(page: str) -> None:
    url = f"https://fitnessprogramer.com/exercise/{page}/"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        html = resp.read().decode("utf-8", "ignore")
    match = re.search(
        r"https://fitnessprogramer\.com/wp-content/uploads/\d{4}/\d{2}/[^\"']+\.gif",
        html,
    )
    print(page, "->", match.group(0) if match else None)


for page in PAGES:
    try:
        gif(page)
    except Exception as exc:
        print(page, "ERR", type(exc).__name__)
