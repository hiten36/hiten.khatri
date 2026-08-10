#!/usr/bin/env python3
"""Generate src/data/exercises.ts with 100+ curated exercises."""

from __future__ import annotations

CUES = {
    "push": (
        ["Brace your core", "Keep wrists stacked over elbows", "Control the eccentric"],
        ["Flaring elbows excessively", "Losing scapular control", "Bouncing at the bottom"],
        ["Stop if shoulder pain appears", "Use a spotter for heavy loads"],
        ["Knee push-up or machine press"],
        ["Deficit push-up or pause reps"],
    ),
    "pull": (
        ["Initiate with scapular retraction", "Keep ribs down", "Pull elbows toward hips"],
        ["Shrugging traps early", "Using momentum", "Rounding upper back"],
        ["Avoid yanking from a dead hang if shoulders are irritated"],
        ["Band row or assisted variation"],
        ["Paused reps or weighted variation"],
    ),
    "squat": (
        ["Brace before the descent", "Track knees over mid-foot", "Drive through mid-foot"],
        ["Heels rising", "Collapsing knees", "Excessive forward lean"],
        ["Keep spine neutral; reduce depth if mobility limits form"],
        ["Box squat or goblet squat"],
        ["Pause squat or front squat"],
    ),
    "hinge": (
        ["Push hips back", "Keep a soft knee bend", "Maintain a flat back"],
        ["Rounding lumbar spine", "Squatting the movement", "Looking up aggressively"],
        ["Prioritize hip hinge patterning before heavy loads"],
        ["Hip hinge drill with dowel"],
        ["Deficit RDL or paused deadlift"],
    ),
    "lunge": (
        ["Tall torso", "Front shin mostly vertical", "Soft landing"],
        ["Knee caving in", "Short choppy steps", "Losing balance"],
        ["Use support for balance when learning"],
        ["Static split squat"],
        ["Walking lunges with load"],
    ),
    "isolation": (
        ["Use a controlled tempo", "Keep tension on the target muscle", "Avoid swinging"],
        ["Using momentum", "Shortening range of motion", "Turning the torso"],
        ["Choose loads you can control for every rep"],
        ["Cable or machine variation"],
        ["Slow eccentrics or partials"],
    ),
    "core": (
        ["Brace as if bracing for a punch", "Keep a neutral spine", "Breathe without collapsing"],
        ["Holding breath the entire set", "Arching lower back", "Using hip flexors only"],
        ["Stop if lower-back discomfort increases"],
        ["Dead bug or shortened range"],
        ["Weighted or longer holds"],
    ),
    "rotation": (
        ["Rotate through the torso", "Keep hips mostly stable", "Move with control"],
        ["Twisting from the neck only", "Using momentum", "Rounding the spine"],
        ["Use light loads until coordination is solid"],
        ["Seated rotations"],
        ["Standing cable chops"],
    ),
    "carry": (
        ["Pack the shoulders", "Tall posture", "Short controlled steps"],
        ["Leaning to one side", "Shrugging hard", "Holding breath"],
        ["Start with short distances"],
        ["Suitcase carry with lighter load"],
        ["Longer carries or heavier implements"],
    ),
    "olympic": (
        ["Stay over the mid-foot", "Explode through hips", "Catch soft"],
        ["Pulling early with arms", "Losing balance forward", "Catching stiff"],
        ["Learn with light loads or PVC first"],
        ["Hang clean or landmine clean"],
        ["Full clean and jerk progressions"],
    ),
    "cardio": (
        ["Sustainable pace", "Relaxed shoulders", "Steady breathing"],
        ["Overstriding", "Holding breath", "Going out too hard"],
        ["Build volume gradually"],
        ["Walk intervals"],
        ["Tempo or interval blocks"],
    ),
    "mobility": (
        ["Move into mild tension only", "Breathe slowly", "Keep joints stacked"],
        ["Forcing end range", "Holding breath", "Compensating with other joints"],
        ["Never stretch into sharp pain"],
        ["Shorter hold times"],
        ["Loaded mobility variations"],
    ),
}

SETUP = {
    "push": ["Set your base and brace", "Position handles/bar over the working joints"],
    "pull": ["Set grip width", "Create tension before the first pull"],
    "squat": ["Set stance roughly shoulder-width", "Brace and own the rack position"],
    "hinge": ["Stand with the implement close", "Unlock hips and soft-bend the knees"],
    "lunge": ["Find a stable split stance", "Keep front foot planted"],
    "isolation": ["Set a stable posture", "Choose a load you can control"],
    "core": ["Find a neutral spine", "Brace before moving"],
    "rotation": ["Set a stable base", "Keep ribs stacked over pelvis"],
    "carry": ["Pick up the implements with a brace", "Stand tall before walking"],
    "olympic": ["Set start position carefully", "Keep the bar path close"],
    "cardio": ["Warm up for 3–5 minutes", "Dial in an easy starting pace"],
    "mobility": ["Move slowly into position", "Use support if balance is limited"],
}

STEPS = {
    "push": [
        "Lower with control through a full comfortable range",
        "Pause briefly without losing tension",
        "Press back to the start while staying braced",
    ],
    "pull": [
        "Pull the implement toward the torso",
        "Squeeze the working muscles at the end range",
        "Lower with control to a soft stretch",
    ],
    "squat": [
        "Sit the hips down and back under control",
        "Descend to your usable depth with heels down",
        "Drive up while keeping the torso braced",
    ],
    "hinge": [
        "Push the hips back while the torso leans",
        "Keep the implement close to the body",
        "Drive the hips forward to stand tall",
    ],
    "lunge": [
        "Step into a long stable stance",
        "Lower the back knee under control",
        "Push through the front mid-foot to return",
    ],
    "isolation": [
        "Move only at the target joint",
        "Pause briefly in the contracted position",
        "Return slowly without swinging",
    ],
    "core": [
        "Create tension before the first rep",
        "Move or hold while keeping the spine neutral",
        "Breathe without collapsing the brace",
    ],
    "rotation": [
        "Rotate through the mid-back and torso",
        "Pause briefly at the end range",
        "Return with control to center",
    ],
    "carry": [
        "Walk with short deliberate steps",
        "Keep the torso upright and quiet",
        "Set the implements down under control",
    ],
    "olympic": [
        "Drive through the floor and extend the hips",
        "Keep the bar close as it rises",
        "Catch and stand tall before resetting",
    ],
    "cardio": [
        "Settle into rhythm",
        "Maintain posture and cadence",
        "Finish with an easy cool-down",
    ],
    "mobility": [
        "Ease into the available range",
        "Hold or pulse gently while breathing",
        "Exit the position slowly",
    ],
}

RAW = [
    ("bench-press", "Barbell Bench Press", ["chest"], ["triceps", "shoulders"], ["barbell", "bench"], "intermediate", "push", ["strength", "hypertrophy"], "3d", "/models/exercises/bench-press.glb"),
    ("incline-bench-press", "Incline Barbell Bench Press", ["chest"], ["shoulders", "triceps"], ["barbell", "bench"], "intermediate", "push", ["hypertrophy", "strength"], "none", None),
    ("decline-bench-press", "Decline Barbell Bench Press", ["chest"], ["triceps"], ["barbell", "bench"], "intermediate", "push", ["hypertrophy"], "none", None),
    ("dumbbell-bench-press", "Dumbbell Bench Press", ["chest"], ["triceps", "shoulders"], ["dumbbell", "bench"], "beginner", "push", ["hypertrophy", "strength"], "none", None),
    ("incline-dumbbell-press", "Incline Dumbbell Press", ["chest"], ["shoulders", "triceps"], ["dumbbell", "bench"], "beginner", "push", ["hypertrophy"], "none", None),
    ("dumbbell-fly", "Dumbbell Fly", ["chest"], ["shoulders"], ["dumbbell", "bench"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("cable-fly", "Cable Fly", ["chest"], ["shoulders"], ["cable"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("push-up", "Push-Up", ["chest"], ["triceps", "shoulders", "abs"], ["bodyweight"], "beginner", "push", ["general-fitness", "endurance", "hypertrophy"], "3d", "/models/exercises/push-up.glb"),
    ("diamond-push-up", "Diamond Push-Up", ["triceps"], ["chest", "shoulders"], ["bodyweight"], "intermediate", "push", ["hypertrophy"], "none", None),
    ("chest-dip", "Chest Dip", ["chest"], ["triceps", "shoulders"], ["bodyweight"], "intermediate", "push", ["hypertrophy", "strength"], "none", None),
    ("pec-deck", "Pec Deck Machine", ["chest"], ["shoulders"], ["machine"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("machine-chest-press", "Machine Chest Press", ["chest"], ["triceps", "shoulders"], ["machine"], "beginner", "push", ["hypertrophy", "general-fitness"], "none", None),
    ("deadlift", "Conventional Deadlift", ["back", "hamstrings", "glutes"], ["quads", "forearms", "abs"], ["barbell"], "advanced", "hinge", ["strength"], "3d", "/models/exercises/deadlift.glb"),
    ("romanian-deadlift", "Romanian Deadlift", ["hamstrings", "glutes"], ["back"], ["barbell"], "intermediate", "hinge", ["hypertrophy", "strength"], "none", None),
    ("sumo-deadlift", "Sumo Deadlift", ["glutes", "quads", "back"], ["hamstrings"], ["barbell"], "intermediate", "hinge", ["strength"], "none", None),
    ("trap-bar-deadlift", "Trap Bar Deadlift", ["quads", "glutes", "back"], ["hamstrings"], ["trap-bar"], "beginner", "hinge", ["strength", "general-fitness"], "none", None),
    ("pull-up", "Pull-Up", ["back"], ["biceps", "forearms"], ["pull-up-bar", "bodyweight"], "intermediate", "pull", ["strength", "hypertrophy"], "3d", "/models/exercises/pull-up.glb"),
    ("chin-up", "Chin-Up", ["back", "biceps"], ["forearms"], ["pull-up-bar", "bodyweight"], "intermediate", "pull", ["hypertrophy", "strength"], "none", None),
    ("lat-pulldown", "Lat Pulldown", ["back"], ["biceps"], ["cable", "machine"], "beginner", "pull", ["hypertrophy"], "none", None),
    ("seated-cable-row", "Seated Cable Row", ["back"], ["biceps", "forearms"], ["cable"], "beginner", "pull", ["hypertrophy"], "none", None),
    ("barbell-row", "Barbell Bent-Over Row", ["back"], ["biceps", "hamstrings"], ["barbell"], "intermediate", "pull", ["strength", "hypertrophy"], "none", None),
    ("dumbbell-row", "Single-Arm Dumbbell Row", ["back"], ["biceps"], ["dumbbell", "bench"], "beginner", "pull", ["hypertrophy"], "none", None),
    ("t-bar-row", "T-Bar Row", ["back"], ["biceps"], ["barbell"], "intermediate", "pull", ["hypertrophy"], "none", None),
    ("face-pull", "Face Pull", ["shoulders", "back"], ["biceps"], ["cable"], "beginner", "pull", ["hypertrophy", "mobility"], "none", None),
    ("inverted-row", "Inverted Row", ["back"], ["biceps"], ["bodyweight"], "beginner", "pull", ["general-fitness", "hypertrophy"], "none", None),
    ("straight-arm-pulldown", "Straight-Arm Pulldown", ["back"], ["triceps"], ["cable"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("overhead-press", "Barbell Overhead Press", ["shoulders"], ["triceps", "abs"], ["barbell"], "intermediate", "push", ["strength", "hypertrophy"], "3d", "/models/exercises/ohp.glb"),
    ("dumbbell-shoulder-press", "Dumbbell Shoulder Press", ["shoulders"], ["triceps"], ["dumbbell"], "beginner", "push", ["hypertrophy"], "none", None),
    ("arnold-press", "Arnold Press", ["shoulders"], ["triceps"], ["dumbbell"], "intermediate", "push", ["hypertrophy"], "none", None),
    ("lateral-raise", "Dumbbell Lateral Raise", ["shoulders"], [], ["dumbbell"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("front-raise", "Dumbbell Front Raise", ["shoulders"], [], ["dumbbell"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("rear-delt-fly", "Rear Delt Fly", ["shoulders", "back"], [], ["dumbbell"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("upright-row", "Upright Row", ["shoulders"], ["biceps"], ["barbell"], "intermediate", "pull", ["hypertrophy"], "none", None),
    ("cable-lateral-raise", "Cable Lateral Raise", ["shoulders"], [], ["cable"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("machine-shoulder-press", "Machine Shoulder Press", ["shoulders"], ["triceps"], ["machine"], "beginner", "push", ["hypertrophy", "general-fitness"], "none", None),
    ("barbell-curl", "Barbell Curl", ["biceps"], ["forearms"], ["barbell"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("dumbbell-curl", "Dumbbell Curl", ["biceps"], ["forearms"], ["dumbbell"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("hammer-curl", "Hammer Curl", ["biceps", "forearms"], [], ["dumbbell"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("preacher-curl", "Preacher Curl", ["biceps"], [], ["ez-bar", "bench"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("concentration-curl", "Concentration Curl", ["biceps"], [], ["dumbbell"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("cable-curl", "Cable Curl", ["biceps"], [], ["cable"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("tricep-pushdown", "Tricep Pushdown", ["triceps"], [], ["cable"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("skull-crusher", "Skull Crusher", ["triceps"], [], ["ez-bar", "bench"], "intermediate", "isolation", ["hypertrophy"], "none", None),
    ("overhead-tricep-extension", "Overhead Tricep Extension", ["triceps"], [], ["dumbbell"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("close-grip-bench", "Close-Grip Bench Press", ["triceps"], ["chest", "shoulders"], ["barbell", "bench"], "intermediate", "push", ["strength", "hypertrophy"], "none", None),
    ("tricep-dip", "Tricep Dip", ["triceps"], ["chest", "shoulders"], ["bodyweight"], "intermediate", "push", ["hypertrophy", "strength"], "none", None),
    ("wrist-curl", "Wrist Curl", ["forearms"], [], ["dumbbell"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("reverse-wrist-curl", "Reverse Wrist Curl", ["forearms"], [], ["dumbbell"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("back-squat", "Barbell Back Squat", ["quads", "glutes"], ["hamstrings", "abs"], ["barbell"], "intermediate", "squat", ["strength", "hypertrophy"], "3d", "/models/exercises/squat.glb"),
    ("front-squat", "Barbell Front Squat", ["quads"], ["glutes", "abs"], ["barbell"], "advanced", "squat", ["strength", "hypertrophy"], "none", None),
    ("goblet-squat", "Goblet Squat", ["quads", "glutes"], ["abs"], ["dumbbell", "kettlebell"], "beginner", "squat", ["general-fitness", "hypertrophy"], "none", None),
    ("leg-press", "Leg Press", ["quads", "glutes"], ["hamstrings"], ["machine"], "beginner", "squat", ["hypertrophy", "strength"], "none", None),
    ("bulgarian-split-squat", "Bulgarian Split Squat", ["quads", "glutes"], ["hamstrings"], ["dumbbell", "bench"], "intermediate", "lunge", ["hypertrophy", "strength"], "none", None),
    ("walking-lunge", "Walking Lunge", ["quads", "glutes"], ["hamstrings"], ["dumbbell", "bodyweight"], "beginner", "lunge", ["hypertrophy", "general-fitness"], "none", None),
    ("reverse-lunge", "Reverse Lunge", ["quads", "glutes"], ["hamstrings"], ["dumbbell", "bodyweight"], "beginner", "lunge", ["hypertrophy"], "none", None),
    ("leg-extension", "Leg Extension", ["quads"], [], ["machine"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("leg-curl", "Lying Leg Curl", ["hamstrings"], [], ["machine"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("seated-leg-curl", "Seated Leg Curl", ["hamstrings"], [], ["machine"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("hip-thrust", "Barbell Hip Thrust", ["glutes"], ["hamstrings"], ["barbell", "bench"], "beginner", "hinge", ["hypertrophy", "strength"], "none", None),
    ("glute-bridge", "Glute Bridge", ["glutes"], ["hamstrings"], ["bodyweight"], "beginner", "hinge", ["general-fitness", "mobility"], "none", None),
    ("good-morning", "Good Morning", ["hamstrings", "back"], ["glutes"], ["barbell"], "intermediate", "hinge", ["strength", "hypertrophy"], "none", None),
    ("nordic-curl", "Nordic Hamstring Curl", ["hamstrings"], [], ["bodyweight"], "advanced", "isolation", ["strength", "hypertrophy"], "none", None),
    ("calf-raise", "Standing Calf Raise", ["calves"], [], ["machine", "bodyweight"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("seated-calf-raise", "Seated Calf Raise", ["calves"], [], ["machine"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("step-up", "Dumbbell Step-Up", ["quads", "glutes"], ["hamstrings"], ["dumbbell", "bench"], "beginner", "lunge", ["hypertrophy", "general-fitness"], "none", None),
    ("hack-squat", "Hack Squat", ["quads"], ["glutes"], ["machine"], "intermediate", "squat", ["hypertrophy"], "none", None),
    ("sissy-squat", "Sissy Squat", ["quads"], [], ["bodyweight"], "advanced", "squat", ["hypertrophy"], "none", None),
    ("plank", "Plank", ["abs"], ["shoulders"], ["bodyweight"], "beginner", "core", ["general-fitness", "endurance"], "none", None),
    ("side-plank", "Side Plank", ["obliques", "abs"], ["shoulders"], ["bodyweight"], "beginner", "core", ["general-fitness"], "none", None),
    ("crunch", "Crunch", ["abs"], [], ["bodyweight"], "beginner", "core", ["hypertrophy", "general-fitness"], "none", None),
    ("cable-crunch", "Cable Crunch", ["abs"], [], ["cable"], "beginner", "core", ["hypertrophy"], "none", None),
    ("hanging-leg-raise", "Hanging Leg Raise", ["abs"], ["hips"], ["pull-up-bar", "bodyweight"], "intermediate", "core", ["hypertrophy", "strength"], "none", None),
    ("lying-leg-raise", "Lying Leg Raise", ["abs", "hips"], [], ["bodyweight"], "beginner", "core", ["general-fitness"], "none", None),
    ("russian-twist", "Russian Twist", ["obliques", "abs"], [], ["bodyweight", "medicine-ball"], "beginner", "rotation", ["general-fitness"], "none", None),
    ("ab-wheel-rollout", "Ab Wheel Rollout", ["abs"], ["shoulders", "back"], ["other"], "advanced", "core", ["strength", "hypertrophy"], "none", None),
    ("dead-bug", "Dead Bug", ["abs"], ["hips"], ["bodyweight"], "beginner", "core", ["mobility", "general-fitness"], "none", None),
    ("bird-dog", "Bird Dog", ["abs", "back"], ["glutes"], ["bodyweight"], "beginner", "core", ["mobility", "general-fitness"], "none", None),
    ("mountain-climber", "Mountain Climber", ["abs", "cardio"], ["shoulders"], ["bodyweight"], "beginner", "cardio", ["fat-loss", "endurance"], "none", None),
    ("hollow-body-hold", "Hollow Body Hold", ["abs"], [], ["bodyweight"], "intermediate", "core", ["strength", "endurance"], "none", None),
    ("kettlebell-swing", "Kettlebell Swing", ["glutes", "hamstrings"], ["back", "shoulders"], ["kettlebell"], "intermediate", "hinge", ["fat-loss", "strength", "endurance"], "none", None),
    ("farmers-carry", "Farmer's Carry", ["forearms", "full-body"], ["abs"], ["dumbbell", "kettlebell"], "beginner", "carry", ["strength", "general-fitness"], "none", None),
    ("clean-and-press", "Dumbbell Clean and Press", ["full-body"], ["shoulders", "glutes"], ["dumbbell"], "intermediate", "olympic", ["strength", "fat-loss"], "none", None),
    ("thruster", "Barbell Thruster", ["quads", "shoulders"], ["glutes", "triceps"], ["barbell"], "intermediate", "squat", ["fat-loss", "endurance"], "none", None),
    ("burpee", "Burpee", ["full-body", "cardio"], [], ["bodyweight"], "beginner", "cardio", ["fat-loss", "endurance"], "none", None),
    ("box-jump", "Box Jump", ["quads", "glutes"], ["calves"], ["bodyweight", "other"], "intermediate", "squat", ["strength", "fat-loss"], "none", None),
    ("medicine-ball-slam", "Medicine Ball Slam", ["full-body"], ["abs", "shoulders"], ["medicine-ball"], "beginner", "core", ["fat-loss"], "none", None),
    ("battle-ropes", "Battle Ropes", ["shoulders", "cardio"], ["abs", "forearms"], ["other"], "beginner", "cardio", ["fat-loss", "endurance"], "none", None),
    ("running", "Running / Jogging", ["cardio"], ["quads", "calves"], ["cardio-machine", "bodyweight"], "beginner", "cardio", ["endurance", "fat-loss"], "none", None),
    ("cycling", "Cycling", ["cardio", "quads"], ["hamstrings", "calves"], ["cardio-machine"], "beginner", "cardio", ["endurance", "fat-loss"], "none", None),
    ("rowing", "Rowing Machine", ["cardio", "back"], ["quads", "biceps"], ["cardio-machine"], "beginner", "cardio", ["endurance", "fat-loss"], "none", None),
    ("jump-rope", "Jump Rope", ["cardio", "calves"], ["shoulders"], ["other"], "beginner", "cardio", ["endurance", "fat-loss"], "none", None),
    ("elliptical", "Elliptical", ["cardio"], ["quads", "glutes"], ["cardio-machine"], "beginner", "cardio", ["endurance", "fat-loss"], "none", None),
    ("stair-climber", "Stair Climber", ["cardio", "glutes", "quads"], ["calves"], ["cardio-machine"], "beginner", "cardio", ["endurance", "fat-loss"], "none", None),
    ("worlds-greatest-stretch", "World's Greatest Stretch", ["hips", "back"], ["shoulders"], ["bodyweight"], "beginner", "mobility", ["mobility", "general-fitness"], "none", None),
    ("cat-cow", "Cat-Cow", ["back"], ["abs"], ["bodyweight"], "beginner", "mobility", ["mobility"], "none", None),
    ("hip-flexor-stretch", "Hip Flexor Stretch", ["hips"], ["quads"], ["bodyweight"], "beginner", "mobility", ["mobility"], "none", None),
    ("pigeon-pose", "Pigeon Pose", ["hips", "glutes"], [], ["bodyweight"], "beginner", "mobility", ["mobility"], "none", None),
    ("thoracic-rotation", "Thoracic Spine Rotation", ["back"], ["shoulders"], ["bodyweight"], "beginner", "mobility", ["mobility"], "none", None),
    ("ankle-mobility", "Ankle Mobility Drill", ["calves"], ["hips"], ["bodyweight"], "beginner", "mobility", ["mobility"], "none", None),
    ("shoulder-dislocate", "Band Shoulder Dislocate", ["shoulders"], ["back"], ["band"], "beginner", "mobility", ["mobility"], "none", None),
    ("couch-stretch", "Couch Stretch", ["hips", "quads"], [], ["bodyweight"], "beginner", "mobility", ["mobility"], "none", None),
    ("band-pull-apart", "Band Pull-Apart", ["shoulders", "back"], [], ["band"], "beginner", "pull", ["hypertrophy", "mobility"], "none", None),
    ("band-squat", "Band Squat", ["quads", "glutes"], [], ["band"], "beginner", "squat", ["general-fitness"], "none", None),
    ("band-row", "Band Row", ["back"], ["biceps"], ["band"], "beginner", "pull", ["general-fitness", "hypertrophy"], "none", None),
    ("band-chest-press", "Band Chest Press", ["chest"], ["triceps"], ["band"], "beginner", "push", ["general-fitness"], "none", None),
    ("band-deadlift", "Band Deadlift", ["glutes", "hamstrings"], ["back"], ["band"], "beginner", "hinge", ["general-fitness"], "none", None),
    ("wall-sit", "Wall Sit", ["quads"], ["glutes"], ["bodyweight"], "beginner", "squat", ["endurance", "general-fitness"], "none", None),
    ("glute-kickback", "Glute Kickback", ["glutes"], ["hamstrings"], ["band", "cable"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("donkey-kick", "Donkey Kick", ["glutes"], ["hamstrings"], ["bodyweight"], "beginner", "isolation", ["hypertrophy", "general-fitness"], "none", None),
    ("fire-hydrant", "Fire Hydrant", ["glutes", "hips"], [], ["bodyweight"], "beginner", "isolation", ["hypertrophy", "mobility"], "none", None),
    ("superman", "Superman Hold", ["back", "glutes"], [], ["bodyweight"], "beginner", "core", ["general-fitness", "mobility"], "none", None),
    ("inchworm", "Inchworm", ["full-body", "hamstrings"], ["shoulders", "abs"], ["bodyweight"], "beginner", "mobility", ["mobility", "general-fitness"], "none", None),
    ("jumping-jack", "Jumping Jack", ["cardio"], ["shoulders", "calves"], ["bodyweight"], "beginner", "cardio", ["fat-loss", "endurance"], "none", None),
    ("high-knees", "High Knees", ["cardio", "hips"], ["quads"], ["bodyweight"], "beginner", "cardio", ["fat-loss", "endurance"], "none", None),
    ("butt-kicks", "Butt Kicks", ["cardio", "hamstrings"], ["calves"], ["bodyweight"], "beginner", "cardio", ["endurance", "fat-loss"], "none", None),
    ("pallof-press", "Pallof Press", ["abs", "obliques"], ["shoulders"], ["cable", "band"], "beginner", "core", ["strength", "general-fitness"], "none", None),
    ("landmine-press", "Landmine Press", ["shoulders", "chest"], ["triceps", "abs"], ["barbell"], "intermediate", "push", ["hypertrophy", "strength"], "none", None),
    ("cable-woodchop", "Cable Woodchop", ["obliques", "abs"], ["shoulders"], ["cable"], "beginner", "rotation", ["general-fitness", "hypertrophy"], "none", None),
    ("smith-machine-squat", "Smith Machine Squat", ["quads", "glutes"], ["hamstrings"], ["smith-machine"], "beginner", "squat", ["hypertrophy"], "none", None),
    ("ez-bar-curl", "EZ-Bar Curl", ["biceps"], ["forearms"], ["ez-bar"], "beginner", "isolation", ["hypertrophy"], "none", None),
    ("reverse-fly-machine", "Reverse Fly Machine", ["shoulders", "back"], [], ["machine"], "beginner", "isolation", ["hypertrophy"], "none", None),
]


def js_arr(items: list[str]) -> str:
    return "[" + ", ".join(f'"{x}"' for x in items) + "]"


def main() -> None:
    lines: list[str] = []
    lines.append('import type { Exercise } from "../components/workout/types";')
    lines.append("")
    lines.append("export const EXERCISES: Exercise[] = [")

    for row in RAW:
        eid, name, primary, secondary, equipment, difficulty, pattern, goals, demo_kind, model = row
        cues, mistakes, safety, regs, progs = CUES[pattern]
        setup = SETUP[pattern]
        steps = STEPS[pattern]
        breathing = "Inhale on the eccentric or setup; exhale through the effort."
        tempo = "3-1-1" if pattern not in {"cardio", "mobility", "carry"} else "controlled"
        demo = (
            f'{{ kind: "3d", modelPath: "{model}", animationName: "demo" }}'
            if demo_kind == "3d"
            else '{ kind: "none" }'
        )
        subs = [s for s in [regs[0] if regs else "", "Machine or cable alternative"] if s]
        lines.append("  {")
        lines.append(f'    id: "{eid}",')
        lines.append(f'    name: "{name}",')
        lines.append(f"    primaryMuscles: {js_arr(primary)},")
        lines.append(f"    secondaryMuscles: {js_arr(secondary)},")
        lines.append(f"    equipment: {js_arr(equipment)},")
        lines.append(f'    difficulty: "{difficulty}",')
        lines.append(f'    movementPattern: "{pattern}",')
        lines.append(f"    goals: {js_arr(goals)},")
        lines.append(f"    setup: {js_arr(setup)},")
        lines.append(f"    steps: {js_arr(steps)},")
        lines.append(f'    breathing: "{breathing}",')
        lines.append(f'    tempo: "{tempo}",')
        lines.append(f"    formCues: {js_arr(cues)},")
        lines.append(f"    commonMistakes: {js_arr(mistakes)},")
        lines.append(f"    safetyNotes: {js_arr(safety)},")
        lines.append(f"    regressions: {js_arr(regs)},")
        lines.append(f"    progressions: {js_arr(progs)},")
        lines.append(f"    substitutions: {js_arr(subs)},")
        lines.append(f"    demo: {demo},")
        lines.append(f'    tags: ["{primary[0]}", "{pattern}"],')
        lines.append("  },")

    lines.append("];")
    lines.append("")
    lines.append("export const EXERCISE_BY_ID = Object.fromEntries(")
    lines.append("  EXERCISES.map((exercise) => [exercise.id, exercise]),")
    lines.append(") as Record<string, Exercise>;")
    lines.append("")
    lines.append("export const MUSCLE_GROUPS = [")
    muscles = sorted({m for row in RAW for m in row[2] + row[3]})
    for m in muscles:
        lines.append(f'  "{m}",')
    lines.append("] as const;")
    lines.append("")
    print(f"Generated {len(RAW)} exercises")
    out = "src/data/exercises.ts"
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
