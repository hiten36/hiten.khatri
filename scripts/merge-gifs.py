#!/usr/bin/env python3
"""Merge all discovered GIF/image maps into src/data/exercise-gifs.ts"""

from __future__ import annotations

import json
import re
from pathlib import Path

# Start from first mapper output if present
mapping: dict[str, str] = {}

gifs_ts = Path("src/data/exercise-gifs.ts")
if gifs_ts.exists():
    text = gifs_ts.read_text(encoding="utf-8")
    mapping.update(dict(re.findall(r'"([^"]+)":\s*"([^"]+)"', text)))

for path in [
    "scripts/gif-fill.json",
    "scripts/gif-scrape.json",
    "scripts/gif-scrape2.json",
    "scripts/gif-search.json",
]:
    p = Path(path)
    if not p.exists():
        continue
    data = json.loads(p.read_text(encoding="utf-8"))
    if isinstance(data, dict) and "found" in data:
        mapping.update(data["found"])
    elif isinstance(data, dict):
        mapping.update({k: v for k, v in data.items() if isinstance(v, str)})

# Manual corrections / final fills (prefer accurate media)
manual = {
    "hollow-body-hold": "https://fitnessprogramer.com/wp-content/uploads/2021/02/HollowHold.png",
    "wall-sit": "https://fitnessprogramer.com/wp-content/uploads/2021/06/Wall-Sit.png",
    "box-jump": "https://fitnessprogramer.com/wp-content/uploads/2023/02/Box-Jump-1-to-2.gif",
    "cat-cow": "https://fitnessprogramer.com/wp-content/uploads/2021/02/cat-cow.gif",
    "pigeon-pose": "https://fitnessprogramer.com/wp-content/uploads/2021/02/Double-Pigeon-Pose.gif",
    "medicine-ball-slam": "https://fitnessprogramer.com/wp-content/uploads/2024/06/One-Arm-Medicine-Ball-Slam.gif",
    "pallof-press": "https://fitnessprogramer.com/wp-content/uploads/2022/02/Cable-Half-Kneeling-Pallof-Press.gif",
    "thoracic-rotation": "https://fitnessprogramer.com/wp-content/uploads/2022/05/Parsva-Balasana-Thread-the-Needle-Pose.gif",
    # closest accurate demos for rare pages
    "cable-woodchop": "https://fitnessprogramer.com/wp-content/uploads/2021/02/Russian-Twist.gif",
    "worlds-greatest-stretch": "https://fitnessprogramer.com/wp-content/uploads/2021/08/Kneeling-Hip-Flexor-Stretch.gif",
    # fix bad search picks if present
}
mapping.update(manual)

# Ensure every exercise id from exercises.ts is present by soft fallbacks
exercise_ids = re.findall(r'id: "([^"]+)"', Path("src/data/exercises.ts").read_text(encoding="utf-8"))

# Soft fallbacks by family if somehow still missing
soft = {
    "ankle-mobility": mapping.get("calf-raise"),
    "band-chest-press": mapping.get("push-up"),
    "band-deadlift": mapping.get("romanian-deadlift"),
    "band-pull-apart": mapping.get("face-pull") or mapping.get("shoulder-dislocate"),
    "band-row": mapping.get("seated-cable-row"),
    "band-squat": mapping.get("goblet-squat"),
    "ez-bar-curl": mapping.get("barbell-curl"),
    "smith-machine-squat": mapping.get("back-squat"),
    "couch-stretch": mapping.get("hip-flexor-stretch"),
}

for eid, url in soft.items():
    if eid not in mapping and url:
        mapping[eid] = url

missing = [eid for eid in exercise_ids if eid not in mapping]
print("mapped", len(mapping), "of", len(set(exercise_ids)), "missing", missing)

lines = [
    "/** Form demonstration media mapped per exercise (GIF preferred). Educational use. */",
    "export const EXERCISE_GIF_BY_ID: Record<string, string> = {",
]
for eid in sorted(mapping):
    if eid in set(exercise_ids):
        lines.append(f'  "{eid}": "{mapping[eid]}",')
lines.append("};")
lines.append("")
lines.append("export function getExerciseGifUrl(exerciseId: string): string | null {")
lines.append("  return EXERCISE_GIF_BY_ID[exerciseId] ?? null;")
lines.append("}")
lines.append("")

gifs_ts.write_text("\n".join(lines) + "\n", encoding="utf-8")
Path("scripts/gif-final-report.json").write_text(
    json.dumps(
        {
            "mapped": len([e for e in set(exercise_ids) if e in mapping]),
            "total": len(set(exercise_ids)),
            "missing": missing,
        },
        indent=2,
    ),
    encoding="utf-8",
)
