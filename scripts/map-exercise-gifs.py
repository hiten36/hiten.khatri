#!/usr/bin/env python3
"""Map local exercises to FitnessProgramer GIF URLs and verify them."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from pathlib import Path

# Our exercise id -> candidate FitnessProgramer slug(s) / absolute gif urls
ALIASES: dict[str, list[str]] = {
    "bench-press": ["Barbell-Bench-Press"],
    "incline-bench-press": ["Incline-Barbell-Bench-Press", "Barbell-Incline-Bench-Press"],
    "decline-bench-press": ["Decline-Barbell-Bench-Press", "Barbell-Decline-Bench-Press"],
    "dumbbell-bench-press": ["Dumbbell-Press", "Dumbbell-Bench-Press"],
    "incline-dumbbell-press": ["Incline-Dumbbell-Press", "Dumbbell-Incline-Bench-Press"],
    "dumbbell-fly": ["Dumbbell-Fly", "Dumbbell-Chest-Fly"],
    "cable-fly": ["Cable-Pec-Fly", "Cable-Fly", "Standing-Cable-Fly"],
    "push-up": ["Push-Up", "Push-up"],
    "diamond-push-up": ["Diamond-Push-up", "Diamond-Push-Up"],
    "chest-dip": ["Chest-Dip", "Parallel-Bar-Dip", "Triceps-Dip"],
    "pec-deck": ["Pec-Deck-Fly", "Butterfly", "Machine-Fly"],
    "machine-chest-press": ["Leverage-Chest-Press", "Machine-Chest-Press", "Chest-Press-Machine"],
    "deadlift": ["Barbell-Deadlift", "Deadlift"],
    "romanian-deadlift": ["Romanian-Deadlift", "Barbell-Romanian-Deadlift"],
    "sumo-deadlift": ["Sumo-Deadlift", "Barbell-Sumo-Deadlift"],
    "trap-bar-deadlift": ["Trap-Bar-Deadlift", "Hex-Bar-Deadlift"],
    "pull-up": ["Pull-up", "Pull-Up"],
    "chin-up": ["Chin-Up", "Chin-up"],
    "lat-pulldown": ["Lat-Pulldown", "Cable-Lat-Pulldown"],
    "seated-cable-row": ["Seated-Cable-Row", "Cable-Seated-Row"],
    "barbell-row": ["Barbell-Bent-Over-Row", "Bent-Over-Barbell-Row", "Barbell-Row"],
    "dumbbell-row": ["Dumbbell-Row", "Kneeling-Single-Arm-Dumbbell-Row"],
    "t-bar-row": ["T-Bar-Row", "Lying-T-Bar-Row"],
    "face-pull": ["Face-Pull", "Cable-Face-Pull"],
    "inverted-row": ["Inverted-Row", "Bodyweight-Inverted-Row"],
    "straight-arm-pulldown": ["Straight-Arm-Lat-Pulldown", "Straight-Arm-Pulldown"],
    "overhead-press": ["Barbell-Standing-Military-Press", "Overhead-Press", "Military-Press"],
    "dumbbell-shoulder-press": ["Dumbbell-Shoulder-Press", "Seated-Dumbbell-Shoulder-Press"],
    "arnold-press": ["Arnold-Press", "Dumbbell-Arnold-Press"],
    "lateral-raise": ["Dumbbell-Lateral-Raise", "Lateral-Raise"],
    "front-raise": ["Dumbbell-Front-Raise", "Front-Raise"],
    "rear-delt-fly": ["Dumbbell-Rear-Delt-Fly", "Rear-Delt-Raise", "Bent-Over-Lateral-Raise"],
    "upright-row": ["Barbell-Upright-Row", "Upright-Row"],
    "cable-lateral-raise": ["Cable-Lateral-Raise"],
    "machine-shoulder-press": ["Leverage-Shoulder-Press", "Machine-Shoulder-Press", "Shoulder-Press-Machine"],
    "barbell-curl": ["Barbell-Curl", "Standing-Barbell-Curl"],
    "dumbbell-curl": ["Dumbbell-Curl", "Standing-Dumbbell-Curl"],
    "hammer-curl": ["Hammer-Curl", "Dumbbell-Hammer-Curl"],
    "preacher-curl": ["Preacher-Curl", "Barbell-Preacher-Curl", "EZ-Bar-Preacher-Curl"],
    "concentration-curl": ["Concentration-Curl", "Dumbbell-Concentration-Curl"],
    "cable-curl": ["Cable-Curl", "Standing-Biceps-Cable-Curl"],
    "tricep-pushdown": ["Triceps-Pushdown", "Cable-Pushdown", "Pushdown"],
    "skull-crusher": ["Barbell-Skull-Crusher", "Lying-Triceps-Extension", "Skull-Crusher"],
    "overhead-tricep-extension": ["Dumbbell-Tricep-Extension", "Seated-Dumbbell-Triceps-Extension", "Overhead-Triceps-Extension"],
    "close-grip-bench": ["Close-Grip-Bench-Press", "Close-Grip-Barbell-Bench-Press"],
    "tricep-dip": ["Triceps-Dip", "Bench-Dip", "Parallel-Bar-Dip"],
    "wrist-curl": ["Dumbbell-Wrist-Curl", "Wrist-Curl", "Barbell-Wrist-Curl"],
    "reverse-wrist-curl": ["Dumbbell-Reverse-Wrist-Curl", "Reverse-Wrist-Curl"],
    "back-squat": ["Barbell-Squat", "Barbell-Back-Squat", "Full-Squat"],
    "front-squat": ["Front-Squat", "Barbell-Front-Squat"],
    "goblet-squat": ["Goblet-Squat", "Dumbbell-Goblet-Squat"],
    "leg-press": ["Leg-Press", "Sled-45-Leg-Press"],
    "bulgarian-split-squat": ["Bulgarian-Split-Squat", "Dumbbell-Bulgarian-Split-Squat"],
    "walking-lunge": ["Dumbbell-Walking-Lunge", "Walking-Lunge", "Walking-Dumbbell-Lunge"],
    "reverse-lunge": ["Dumbbell-Reverse-Lunge", "Reverse-Lunge"],
    "leg-extension": ["Leg-Extension", "Lever-Leg-Extension"],
    "leg-curl": ["Lying-Leg-Curl", "Leg-Curl"],
    "seated-leg-curl": ["Seated-Leg-Curl"],
    "hip-thrust": ["Barbell-Hip-Thrust", "Hip-Thrust"],
    "glute-bridge": ["Glute-Bridge", "Bodyweight-Glute-Bridge"],
    "good-morning": ["Good-Morning", "Barbell-Good-Morning"],
    "nordic-curl": ["Nordic-Hamstring-Curl", "Nordic-Curl"],
    "calf-raise": ["Standing-Calf-Raise", "Calf-Raise", "Lever-Standing-Calf-Raise"],
    "seated-calf-raise": ["Seated-Calf-Raise", "Lever-Seated-Calf-Raise"],
    "step-up": ["Dumbbell-Step-Up", "Step-Up", "Barbell-Step-Up"],
    "hack-squat": ["Hack-Squat", "Sled-Hack-Squat"],
    "sissy-squat": ["Sissy-Squat"],
    "plank": ["Plank", "Front-Plank"],
    "side-plank": ["Side-Plank"],
    "crunch": ["Crunch", "Abdominal-Crunches"],
    "cable-crunch": ["Cable-Crunch"],
    "hanging-leg-raise": ["Hanging-Leg-Raise"],
    "lying-leg-raise": ["Lying-Leg-Raise", "Floor-Leg-Raise"],
    "russian-twist": ["Russian-Twist", "Weighted-Russian-Twist"],
    "ab-wheel-rollout": ["Ab-Wheel-Rollout", "Rollout"],
    "dead-bug": ["Dead-Bug"],
    "bird-dog": ["Bird-Dog"],
    "mountain-climber": ["Mountain-Climber"],
    "hollow-body-hold": ["Hollow-Hold", "Hollow-Body-Hold"],
    "kettlebell-swing": ["Kettlebell-Swing", "Two-Arm-Kettlebell-Swing"],
    "farmers-carry": ["Farmers-Walk", "Farmers-Carry", "Dumbbell-Farmers-Walk"],
    "clean-and-press": ["Dumbbell-Clean-and-Press", "Clean-and-Press"],
    "thruster": ["Barbell-Thruster", "Thruster", "Dumbbell-Thruster"],
    "burpee": ["Burpee"],
    "box-jump": ["Box-Jump"],
    "medicine-ball-slam": ["Medicine-Ball-Slam", "Ball-Slam"],
    "battle-ropes": ["Battle-Ropes", "Battling-Ropes"],
    "running": ["Treadmill-Running", "Run", "Jogging"],
    "cycling": ["Recumbent-Bike", "Stationary-Bike-Run", "Bike"],
    "rowing": ["Rowing", "Rowing-Machine", "Cable-Seated-Row"],
    "jump-rope": ["Jump-Rope", "Skipping-Rope"],
    "elliptical": ["Elliptical-Machine", "Walk-Wave-Machine"],
    "stair-climber": ["Walking-on-Stepmill", "Stair-Climber", "Step-Mill"],
    "worlds-greatest-stretch": ["Worlds-Greatest-Stretch", "World-Greatest-Stretch", "Spiderman-Exercise"],
    "cat-cow": ["Cat-Cow-Stretch", "Cat-Stretch", "Cow-Stretch"],
    "hip-flexor-stretch": ["Kneeling-Hip-Flexor-Stretch", "Hip-Flexor-Stretch"],
    "pigeon-pose": ["Pigeon-Hip-Stretch", "Pigeon-Pose"],
    "thoracic-rotation": ["Thread-The-Needle", "Lying-Side-Stretch"],
    "ankle-mobility": ["Ankle-Circles", "Calf-Stretch"],
    "shoulder-dislocate": ["Band-Pull-Apart", "Shoulder-Stretch"],
    "couch-stretch": ["Kneeling-Hip-Flexor-Stretch", "Quad-Stretch"],
    "band-pull-apart": ["Band-Pull-Apart", "Resistance-Band-Pull-Apart"],
    "band-squat": ["Band-Squat", "Resistance-Band-Squat", "Goblet-Squat"],
    "band-row": ["Band-Seated-Row", "Resistance-Band-Seated-Row", "Seated-Cable-Row"],
    "band-chest-press": ["Band-Push-Up", "Resistance-Band-Chest-Press", "Push-Up"],
    "band-deadlift": ["Band-Deadlift", "Resistance-Band-Deadlift", "Romanian-Deadlift"],
    "wall-sit": ["Wall-Sit"],
    "glute-kickback": ["Cable-Kickback", "Glute-Kickback", "Donkey-Kick"],
    "donkey-kick": ["Donkey-Kick", "Quadruped-Leg-Kickback"],
    "fire-hydrant": ["Fire-Hydrant", "Fire-Hydrants"],
    "superman": ["Superman", "Superman-Hold"],
    "inchworm": ["Inchworm"],
    "jumping-jack": ["Jumping-Jack"],
    "high-knees": ["High-Knee-Skips", "High-Knees", "Run"],
    "butt-kicks": ["Butt-Kicks", "Jogging"],
    "pallof-press": ["Pallof-Press", "Cable-Pallof-Press"],
    "landmine-press": ["Landmine-Press", "Barbell-Landmine-Press"],
    "cable-woodchop": ["Cable-Wood-Chop", "Woodchoppers"],
    "smith-machine-squat": ["Smith-Machine-Squat", "Barbell-Squat"],
    "ez-bar-curl": ["EZ-Bar-Curl", "Barbell-Curl"],
    "reverse-fly-machine": ["Machine-Reverse-Fly", "Rear-Delt-Machine-Fly", "Dumbbell-Rear-Delt-Fly"],
}

YEARS = ["2021/02", "2021/04", "2021/05", "2021/06", "2021/08", "2021/10", "2022/02", "2022/04", "2022/10", "2023/02", "2023/06", "2024/01"]
BASE = "https://fitnessprogramer.com/wp-content/uploads"


def probe(url: str) -> bool:
    req = urllib.request.Request(
        url,
        method="HEAD",
        headers={"User-Agent": "Mozilla/5.0", "Accept": "image/gif,*/*"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            ctype = (resp.headers.get("content-type") or "").lower()
            return resp.status == 200 and "image" in ctype
    except Exception:
        # some hosts reject HEAD — try GET range
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "image/gif,*/*",
                    "Range": "bytes=0-64",
                },
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                ctype = (resp.headers.get("content-type") or "").lower()
                return resp.status in (200, 206) and "image" in ctype
        except Exception:
            return False


def candidates_for(slug: str) -> list[str]:
    urls = []
    for year in YEARS:
        urls.append(f"{BASE}/{year}/{slug}.gif")
    return urls


def main() -> None:
    mapping: dict[str, str] = {}
    missing: list[str] = []

    for eid, slugs in ALIASES.items():
        found = None
        for slug in slugs:
            for url in candidates_for(slug):
                ok = probe(url)
                print(("OK " if ok else "no "), url)
                if ok:
                    found = url
                    break
                time.sleep(0.05)
            if found:
                break
            time.sleep(0.05)
        if found:
            mapping[eid] = found
        else:
            missing.append(eid)
        time.sleep(0.1)

    out = Path("src/data/exercise-gifs.ts")
    lines = [
        "/** Auto-mapped form GIFs (FitnessProgramer). Educational use. */",
        "export const EXERCISE_GIF_BY_ID: Record<string, string> = {",
    ]
    for eid, url in sorted(mapping.items()):
        lines.append(f'  "{eid}": "{url}",')
    lines.append("};")
    lines.append("")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")

    report = {
        "mapped": len(mapping),
        "missing": missing,
        "total": len(ALIASES),
    }
    Path("scripts/gif-map-report.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
