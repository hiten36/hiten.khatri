#!/usr/bin/env python3
"""Download exercise media into public/workout-gifs for reliable same-origin loading."""

from __future__ import annotations

import concurrent.futures
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src" / "data" / "exercise-gifs.ts"
OUT_DIR = ROOT / "public" / "workout-gifs"
OUT_TS = ROOT / "src" / "data" / "exercise-gifs.ts"

ENTRIES = dict(re.findall(r'"([^"]+)":\s*"(https://[^"]+)"', SRC.read_text(encoding="utf-8")))


def download_one(eid: str, url: str) -> tuple[str, str | None, str]:
    ext = ".png" if url.lower().endswith(".png") else ".gif"
    dest = OUT_DIR / f"{eid}{ext}"
    if dest.exists() and dest.stat().st_size > 1000:
        return eid, f"/workout-gifs/{eid}{ext}", "cached"
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0",
                "Accept": "image/*,*/*",
                "Referer": "https://fitnessprogramer.com/",
            },
        )
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = resp.read()
        if len(data) < 500:
            return eid, None, f"too-small:{len(data)}"
        dest.write_bytes(data)
        return eid, f"/workout-gifs/{eid}{ext}", f"ok:{len(data)}"
    except Exception as exc:
        return eid, None, f"err:{type(exc).__name__}"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    local: dict[str, str] = {}
    failed: list[str] = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        futures = [pool.submit(download_one, eid, url) for eid, url in ENTRIES.items()]
        for fut in concurrent.futures.as_completed(futures):
            eid, path, status = fut.result()
            print(eid, status, path or "")
            if path:
                local[eid] = path
            else:
                failed.append(eid)

    lines = [
        "/** Local form demonstration media (same-origin). */",
        "export const EXERCISE_GIF_BY_ID: Record<string, string> = {",
    ]
    for eid in sorted(local):
        lines.append(f'  "{eid}": "{local[eid]}",')
    lines.append("};")
    lines.append("")
    lines.append("export function getExerciseGifUrl(exerciseId: string): string | null {")
    lines.append("  return EXERCISE_GIF_BY_ID[exerciseId] ?? null;")
    lines.append("}")
    lines.append("")
    OUT_TS.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("downloaded", len(local), "failed", failed)


if __name__ == "__main__":
    main()
