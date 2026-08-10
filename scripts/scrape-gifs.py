#!/usr/bin/env python3
from __future__ import annotations

import concurrent.futures
import json
import re
import urllib.request

ALTS: dict[str, list[str]] = {
    "burpee": ["burpee"],
    "box-jump": ["box-jump"],
    "bird-dog": ["bird-dog"],
    "clean-and-press": ["dumbbell-clean-and-press", "clean-and-press"],
    "decline-bench-press": ["decline-barbell-bench-press", "decline-bench-press"],
    "cable-curl": ["standing-biceps-cable-curl", "cable-bicep-curl", "cable-curl"],
    "front-squat": ["front-squat", "barbell-front-squat"],
    "battle-ropes": ["battle-ropes", "battling-ropes"],
    "back-squat": ["barbell-squat", "squat"],
    "inchworm": ["inchworm"],
    "cat-cow": ["cat-cow-stretch", "cat-camel"],
    "farmers-carry": ["farmers-walk", "farmer-walk"],
    "cable-woodchop": ["cable-wood-chop", "standing-cable-wood-chop"],
    "jumping-jack": ["jumping-jack"],
    "glute-bridge": ["glute-bridge", "hip-bridge"],
    "hollow-body-hold": ["hollow-hold", "hollow-body-hold"],
    "hanging-leg-raise": ["hanging-leg-raise", "hanging-knee-raise"],
    "kettlebell-swing": ["kettlebell-swing", "two-arm-kettlebell-swing"],
    "mountain-climber": ["mountain-climber"],
    "glute-kickback": ["cable-kickback", "donkey-kick"],
    "medicine-ball-slam": ["medicine-ball-slam", "slam-ball"],
    "leg-extension": ["leg-extension"],
    "pallof-press": ["pallof-press", "cable-pallof-press"],
    "plank": ["plank", "front-plank"],
    "pigeon-pose": ["pigeon-hip-stretch", "pigeon-pose"],
    "side-plank": ["side-plank"],
    "leg-press": ["leg-press", "sled-45-degree-leg-press"],
    "sissy-squat": ["sissy-squat"],
    "reverse-lunge": ["dumbbell-reverse-lunge", "reverse-lunge"],
    "reverse-fly-machine": ["machine-reverse-fly", "rear-delt-machine-fly"],
    "shoulder-dislocate": ["band-pull-apart"],
    "smith-machine-squat": ["smith-machine-squat"],
    "thruster": ["barbell-thruster", "dumbbell-thruster"],
    "running": ["treadmill", "treadmill-running"],
    "thoracic-rotation": ["thread-the-needle"],
    "wall-sit": ["wall-sit"],
    "skull-crusher": ["lying-triceps-extension", "barbell-skull-crusher", "skull-crusher"],
    "tricep-dip": ["triceps-dip", "bench-dip", "parallel-bar-dip"],
    "worlds-greatest-stretch": ["spiderman-exercise", "worlds-greatest-stretch"],
}

GIF_RE = re.compile(
    r"https://fitnessprogramer\.com/wp-content/uploads/\d{4}/\d{2}/[^\"']+\.gif"
)


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
    payload = {"found": found, "miss": sorted(miss)}
    Path = __import__("pathlib").Path
    Path("scripts/gif-scrape.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps({"found": len(found), "miss": len(miss)}, indent=2))


if __name__ == "__main__":
    main()
