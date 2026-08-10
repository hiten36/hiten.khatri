#!/usr/bin/env python3
"""Fast concurrent mapping of exercises -> FitnessProgramer GIFs."""

from __future__ import annotations

import json
import concurrent.futures
import urllib.request
from pathlib import Path

# Import ALIASES from the main mapper module by reading it
ns: dict = {}
src = Path("scripts/map-exercise-gifs.py").read_text(encoding="utf-8")
# Execute only until YEARS assignment
chunk = src.split("\nYEARS =", 1)[0]
exec(chunk, ns)
ALIASES: dict[str, list[str]] = ns["ALIASES"]

YEARS = [
    "2021/02",
    "2021/04",
    "2021/05",
    "2021/06",
    "2021/08",
    "2021/10",
    "2022/02",
    "2022/04",
    "2022/10",
    "2023/02",
    "2023/06",
    "2024/01",
]
BASE = "https://fitnessprogramer.com/wp-content/uploads"


def probe(url: str) -> str | None:
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0",
                "Accept": "image/gif,*/*",
                "Range": "bytes=0-32",
            },
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            ctype = (resp.headers.get("content-type") or "").lower()
            if resp.status in (200, 206) and "image" in ctype:
                return url
    except Exception:
        return None
    return None


def resolve_one(eid: str, slugs: list[str]) -> tuple[str, str | None]:
    urls: list[str] = []
    for slug in slugs:
        for year in YEARS:
            urls.append(f"{BASE}/{year}/{slug}.gif")
    # Try sequentially per exercise but across exercises in parallel
    for url in urls:
        hit = probe(url)
        if hit:
            return eid, hit
    return eid, None


def main() -> None:
    mapping: dict[str, str] = {}
    missing: list[str] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        futures = [
            pool.submit(resolve_one, eid, slugs) for eid, slugs in ALIASES.items()
        ]
        for fut in concurrent.futures.as_completed(futures):
            eid, url = fut.result()
            if url:
                mapping[eid] = url
                print(f"OK {eid} -> {url}")
            else:
                missing.append(eid)
                print(f"MISS {eid}")

    out = Path("src/data/exercise-gifs.ts")
    lines = [
        "/** Form demonstration GIFs mapped per exercise. Educational use. */",
        "export const EXERCISE_GIF_BY_ID: Record<string, string> = {",
    ]
    for eid, url in sorted(mapping.items()):
        lines.append(f'  "{eid}": "{url}",')
    lines.append("};")
    lines.append("")
    lines.append("export function getExerciseGifUrl(exerciseId: string): string | null {")
    lines.append("  return EXERCISE_GIF_BY_ID[exerciseId] ?? null;")
    lines.append("}")
    lines.append("")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")

    report = {"mapped": len(mapping), "missing": sorted(missing), "total": len(ALIASES)}
    Path("scripts/gif-map-report.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
