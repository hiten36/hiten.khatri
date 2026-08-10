#!/usr/bin/env python3
from __future__ import annotations

import concurrent.futures
import json
import re
import urllib.request
from pathlib import Path

ALTS: dict[str, list[str]] = {
    "burpee": ["burpees", "burpee-jump", "full-burpee"],
    "box-jump": ["box-jump-onto-box", "jump-onto-box", "box-jumps"],
    "clean-and-press": [
        "dumbbell-clean",
        "barbell-clean-and-press",
        "kettlebell-clean-and-press",
    ],
    "battle-ropes": ["battle-rope", "alternating-battle-ropes", "battle-rope-waves"],
    "cat-cow": ["cat-camel", "cat-stretch", "cow-stretch"],
    "cable-woodchop": [
        "standing-cable-wood-chop",
        "cable-chop",
        "wood-chop",
        "high-cable-wood-chop",
    ],
    "side-plank": ["side-plank-hip-adduction", "elbow-side-plank", "side-bridge"],
    "kettlebell-swing": [
        "two-handed-kettlebell-swing",
        "russian-kettlebell-swing",
        "kettlebell-swings",
    ],
    "glute-kickback": [
        "cable-glute-kickback",
        "standing-glute-kickback",
        "donkey-kicks",
        "quadruped-leg-kickback",
    ],
    "hollow-body-hold": ["hollow-body", "hollow-rock", "dish-hold"],
    "hanging-leg-raise": [
        "hanging-straight-leg-raise",
        "captains-chair-leg-raise",
        "hanging-knee-raises",
        "hanging-leg-raises",
    ],
    "pigeon-pose": ["pigeon-stretch", "seated-glute-stretch", "figure-four-stretch"],
    "wall-sit": ["wall-squat", "wall-sits"],
    "medicine-ball-slam": ["slam-ball", "medicine-ball-slams", "ball-slams"],
    "pallof-press": [
        "half-kneeling-pallof-press",
        "standing-pallof-press",
        "cable-anti-rotation",
    ],
    "thoracic-rotation": [
        "open-book-stretch",
        "seated-twist",
        "lying-twist",
        "thread-needle",
    ],
    "worlds-greatest-stretch": [
        "spiderman",
        "spiderman-lunge",
        "world-greatest-stretch",
        "runners-lunge",
    ],
    "tricep-dip": [
        "bench-dip",
        "assisted-triceps-dip",
        "parallel-bar-dip",
        "triceps-dips",
    ],
    "skull-crusher": [
        "ez-bar-skullcrusher",
        "lying-ez-bar-triceps-extension",
        "dumbbell-skull-crusher",
        "lying-dumbbell-triceps-extension",
    ],
}

GIF_RE = re.compile(
    r"https://fitnessprogramer\.com/wp-content/uploads/\d{4}/\d{2}/[^\"']+\.gif"
)

# ExerciseDB static CDN fallbacks (verified free media IDs)
EDB_FALLBACKS: dict[str, str] = {
    # known working example from docs + close relatives by common IDs
}


def fetch_gif(page_slug: str) -> str | None:
    url = f"https://fitnessprogramer.com/exercise/{page_slug}/"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode("utf-8", "ignore")
        match = GIF_RE.search(html)
        return match.group(0) if match else None
    except Exception:
        return None


def resolve(eid: str) -> tuple[str, str | None, str | None]:
    for page in ALTS.get(eid, [eid]):
        gif = fetch_gif(page)
        if gif:
            return eid, gif, page
    return eid, None, None


def main() -> None:
    found: dict[str, str] = {}
    miss: list[str] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        futures = [pool.submit(resolve, eid) for eid in ALTS]
        for fut in concurrent.futures.as_completed(futures):
            eid, gif, page = fut.result()
            if gif:
                found[eid] = gif
                print(f"OK {eid} via {page} -> {gif}")
            else:
                miss.append(eid)
                print(f"MISS {eid}")
    Path("scripts/gif-scrape2.json").write_text(
        json.dumps({"found": found, "miss": sorted(miss)}, indent=2),
        encoding="utf-8",
    )
    print(json.dumps({"found": len(found), "miss": len(miss)}, indent=2))


if __name__ == "__main__":
    main()
