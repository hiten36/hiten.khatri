import type {
  BuiltInTemplate,
  Equipment,
  PlanDay,
  PlanExercise,
  PrescribedSet,
} from "../components/workout/types";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function sets(
  count: number,
  reps: number | string,
  rest = 90,
  type: PrescribedSet["type"] = "normal",
): PrescribedSet[] {
  return Array.from({ length: count }, (_, i) => ({
    id: uid("set"),
    type: i === 0 && type === "normal" ? "normal" : type,
    targetReps: reps,
    targetWeight: null,
    targetRpe: null,
    targetRir: 2,
    targetSeconds: null,
    restSeconds: rest,
    tempo: null,
  }));
}

function ex(exerciseId: string, order: number, setList: PrescribedSet[]): PlanExercise {
  return {
    id: uid("pe"),
    exerciseId,
    order,
    sets: setList,
  };
}

function day(
  name: string,
  order: number,
  exercises: PlanExercise[],
  focus?: string,
  isRestDay = false,
): Omit<PlanDay, "id"> {
  return { name, order, focus, isRestDay, exercises };
}

const gym: Equipment[] = [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "bench",
  "pull-up-bar",
];
const home: Equipment[] = ["bodyweight", "dumbbell", "band", "kettlebell"];

export const WORKOUT_TEMPLATES: BuiltInTemplate[] = [
  {
    id: "beginner-full-body",
    name: "Beginner Full Body",
    description: "Three weekly full-body sessions to build a foundation with simple compound lifts.",
    goal: "general-fitness",
    experience: "beginner",
    daysPerWeek: 3,
    estimatedMinutes: 45,
    equipment: gym,
    style: "full-body",
    tags: ["beginner", "full-body", "foundation"],
    days: [
      day("Full Body A", 0, [
        ex("goblet-squat", 0, sets(3, 10, 90)),
        ex("dumbbell-bench-press", 1, sets(3, 10, 90)),
        ex("dumbbell-row", 2, sets(3, 10, 90)),
        ex("dumbbell-shoulder-press", 3, sets(3, 10, 75)),
        ex("plank", 4, sets(3, "30s", 60, "timed")),
      ], "Full body"),
      day("Full Body B", 1, [
        ex("romanian-deadlift", 0, sets(3, 8, 120)),
        ex("lat-pulldown", 1, sets(3, 10, 90)),
        ex("walking-lunge", 2, sets(3, 10, 90)),
        ex("tricep-pushdown", 3, sets(2, 12, 60)),
        ex("dead-bug", 4, sets(3, 8, 45)),
      ], "Full body"),
      day("Full Body C", 2, [
        ex("leg-press", 0, sets(3, 12, 90)),
        ex("machine-chest-press", 1, sets(3, 10, 90)),
        ex("seated-cable-row", 2, sets(3, 10, 90)),
        ex("lateral-raise", 3, sets(3, 12, 60)),
        ex("calf-raise", 4, sets(3, 12, 45)),
      ], "Full body"),
    ],
  },
  {
    id: "strength-upper-lower",
    name: "Strength Upper / Lower",
    description: "Four-day strength focus with progressive compound lifts and supporting accessories.",
    goal: "strength",
    experience: "intermediate",
    daysPerWeek: 4,
    estimatedMinutes: 60,
    equipment: gym,
    style: "upper-lower",
    tags: ["strength", "upper-lower"],
    days: [
      day("Upper Strength", 0, [
        ex("bench-press", 0, sets(5, 5, 180)),
        ex("barbell-row", 1, sets(4, 6, 150)),
        ex("overhead-press", 2, sets(4, 6, 150)),
        ex("pull-up", 3, sets(3, 6, 120)),
        ex("face-pull", 4, sets(3, 15, 60)),
      ], "Upper"),
      day("Lower Strength", 1, [
        ex("back-squat", 0, sets(5, 5, 180)),
        ex("romanian-deadlift", 1, sets(4, 6, 150)),
        ex("leg-press", 2, sets(3, 8, 120)),
        ex("hanging-leg-raise", 3, sets(3, 10, 60)),
        ex("calf-raise", 4, sets(3, 10, 60)),
      ], "Lower"),
      day("Upper Volume", 2, [
        ex("dumbbell-bench-press", 0, sets(4, 8, 120)),
        ex("lat-pulldown", 1, sets(4, 8, 90)),
        ex("dumbbell-shoulder-press", 2, sets(3, 8, 90)),
        ex("dumbbell-curl", 3, sets(3, 10, 60)),
        ex("tricep-pushdown", 4, sets(3, 10, 60)),
      ], "Upper"),
      day("Lower Volume", 3, [
        ex("front-squat", 0, sets(4, 6, 150)),
        ex("hip-thrust", 1, sets(4, 8, 120)),
        ex("bulgarian-split-squat", 2, sets(3, 8, 90)),
        ex("leg-curl", 3, sets(3, 10, 60)),
        ex("plank", 4, sets(3, "45s", 45, "timed")),
      ], "Lower"),
    ],
  },
  {
    id: "hypertrophy-ppl",
    name: "Hypertrophy Push / Pull / Legs",
    description: "Classic six-day (or three-day) muscle-building split with higher volume.",
    goal: "hypertrophy",
    experience: "intermediate",
    daysPerWeek: 6,
    estimatedMinutes: 70,
    equipment: gym,
    style: "push-pull-legs",
    tags: ["hypertrophy", "ppl"],
    days: [
      day("Push", 0, [
        ex("bench-press", 0, sets(4, 8, 120)),
        ex("incline-dumbbell-press", 1, sets(3, 10, 90)),
        ex("overhead-press", 2, sets(3, 8, 90)),
        ex("lateral-raise", 3, sets(4, 12, 60)),
        ex("tricep-pushdown", 4, sets(3, 12, 60)),
      ], "Push"),
      day("Pull", 1, [
        ex("pull-up", 0, sets(4, 8, 120)),
        ex("barbell-row", 1, sets(4, 8, 90)),
        ex("seated-cable-row", 2, sets(3, 10, 75)),
        ex("face-pull", 3, sets(3, 15, 60)),
        ex("barbell-curl", 4, sets(3, 10, 60)),
      ], "Pull"),
      day("Legs", 2, [
        ex("back-squat", 0, sets(4, 8, 150)),
        ex("romanian-deadlift", 1, sets(3, 10, 120)),
        ex("leg-press", 2, sets(3, 12, 90)),
        ex("leg-curl", 3, sets(3, 12, 60)),
        ex("calf-raise", 4, sets(4, 12, 45)),
      ], "Legs"),
      day("Push 2", 3, [
        ex("dumbbell-bench-press", 0, sets(4, 10, 90)),
        ex("cable-fly", 1, sets(3, 12, 60)),
        ex("arnold-press", 2, sets(3, 10, 75)),
        ex("cable-lateral-raise", 3, sets(3, 15, 45)),
        ex("overhead-tricep-extension", 4, sets(3, 12, 60)),
      ], "Push"),
      day("Pull 2", 4, [
        ex("lat-pulldown", 0, sets(4, 10, 90)),
        ex("dumbbell-row", 1, sets(3, 10, 75)),
        ex("straight-arm-pulldown", 2, sets(3, 12, 60)),
        ex("rear-delt-fly", 3, sets(3, 15, 45)),
        ex("hammer-curl", 4, sets(3, 12, 60)),
      ], "Pull"),
      day("Legs 2", 5, [
        ex("front-squat", 0, sets(4, 8, 120)),
        ex("hip-thrust", 1, sets(4, 10, 90)),
        ex("walking-lunge", 2, sets(3, 10, 75)),
        ex("leg-extension", 3, sets(3, 12, 60)),
        ex("seated-calf-raise", 4, sets(3, 15, 45)),
      ], "Legs"),
    ],
  },
  {
    id: "fat-loss-circuit",
    name: "Fat-Loss Circuit Conditioner",
    description: "Short full-body circuits with denser work to raise calorie burn.",
    goal: "fat-loss",
    experience: "beginner",
    daysPerWeek: 4,
    estimatedMinutes: 35,
    equipment: home,
    style: "circuit",
    tags: ["fat-loss", "circuit", "home-friendly"],
    days: [
      day("Circuit A", 0, [
        ex("goblet-squat", 0, sets(3, 12, 30)),
        ex("push-up", 1, sets(3, 10, 30)),
        ex("dumbbell-row", 2, sets(3, 12, 30)),
        ex("mountain-climber", 3, sets(3, "30s", 30, "timed")),
        ex("plank", 4, sets(3, "30s", 45, "timed")),
      ], "Full body circuit"),
      day("Circuit B", 1, [
        ex("kettlebell-swing", 0, sets(4, 15, 45)),
        ex("reverse-lunge", 1, sets(3, 10, 30)),
        ex("dumbbell-shoulder-press", 2, sets(3, 10, 30)),
        ex("burpee", 3, sets(3, 8, 45)),
        ex("russian-twist", 4, sets(3, 16, 30)),
      ], "Full body circuit"),
      day("Conditioning", 2, [
        ex("jump-rope", 0, sets(4, "60s", 30, "timed")),
        ex("walking-lunge", 1, sets(3, 12, 30)),
        ex("band-row", 2, sets(3, 15, 30)),
        ex("high-knees", 3, sets(3, "30s", 30, "timed")),
        ex("dead-bug", 4, sets(3, 10, 30)),
      ], "Conditioning"),
      day("Active Recovery", 3, [
        ex("worlds-greatest-stretch", 0, sets(2, 6, 20)),
        ex("cat-cow", 1, sets(2, 10, 15)),
        ex("hip-flexor-stretch", 2, sets(2, "45s", 15, "timed")),
        ex("glute-bridge", 3, sets(2, 12, 30)),
        ex("bird-dog", 4, sets(2, 8, 20)),
      ], "Recovery"),
    ],
  },
  {
    id: "endurance-engine",
    name: "Endurance Engine",
    description: "Blend of cardio sessions and light strength to build work capacity.",
    goal: "endurance",
    experience: "beginner",
    daysPerWeek: 4,
    estimatedMinutes: 40,
    equipment: ["cardio-machine", "bodyweight", "dumbbell"],
    style: "full-body",
    tags: ["endurance", "cardio"],
    days: [
      day("Easy Cardio", 0, [
        ex("running", 0, sets(1, "30m", 0, "timed")),
        ex("plank", 1, sets(3, "30s", 30, "timed")),
      ], "Cardio"),
      day("Strength Endurance", 1, [
        ex("goblet-squat", 0, sets(3, 15, 45)),
        ex("push-up", 1, sets(3, 12, 45)),
        ex("band-row", 2, sets(3, 15, 45)),
        ex("wall-sit", 3, sets(3, "40s", 45, "timed")),
      ], "Strength endurance"),
      day("Intervals", 2, [
        ex("cycling", 0, sets(1, "25m", 0, "timed")),
        ex("jumping-jack", 1, sets(4, "30s", 30, "timed")),
      ], "Intervals"),
      day("Row & Core", 3, [
        ex("rowing", 0, sets(1, "20m", 0, "timed")),
        ex("dead-bug", 1, sets(3, 10, 30)),
        ex("side-plank", 2, sets(3, "25s", 30, "timed")),
      ], "Cardio + core"),
    ],
  },
  {
    id: "mobility-reset",
    name: "Mobility Reset",
    description: "Daily-friendly mobility and control work for hips, spine, and shoulders.",
    goal: "mobility",
    experience: "beginner",
    daysPerWeek: 5,
    estimatedMinutes: 25,
    equipment: ["bodyweight", "band"],
    style: "home",
    tags: ["mobility", "recovery"],
    days: [
      day("Hips & Ankles", 0, [
        ex("hip-flexor-stretch", 0, sets(2, "60s", 15, "timed")),
        ex("pigeon-pose", 1, sets(2, "60s", 15, "timed")),
        ex("ankle-mobility", 2, sets(2, 10, 15)),
        ex("glute-bridge", 3, sets(2, 12, 30)),
      ], "Lower mobility"),
      day("Spine & Shoulders", 1, [
        ex("cat-cow", 0, sets(2, 12, 15)),
        ex("thoracic-rotation", 1, sets(2, 8, 15)),
        ex("shoulder-dislocate", 2, sets(2, 10, 20)),
        ex("band-pull-apart", 3, sets(2, 15, 30)),
      ], "Upper mobility"),
      day("Flow", 2, [
        ex("worlds-greatest-stretch", 0, sets(2, 6, 20)),
        ex("inchworm", 1, sets(2, 6, 20)),
        ex("bird-dog", 2, sets(2, 8, 20)),
        ex("couch-stretch", 3, sets(2, "45s", 15, "timed")),
      ], "Flow"),
      day("Control", 3, [
        ex("dead-bug", 0, sets(3, 8, 30)),
        ex("side-plank", 1, sets(2, "30s", 30, "timed")),
        ex("fire-hydrant", 2, sets(2, 12, 20)),
        ex("superman", 3, sets(2, "20s", 20, "timed")),
      ], "Control"),
      day("Easy Reset", 4, [
        ex("cat-cow", 0, sets(2, 10, 15)),
        ex("hip-flexor-stretch", 1, sets(2, "45s", 15, "timed")),
        ex("shoulder-dislocate", 2, sets(2, 8, 20)),
        ex("plank", 3, sets(2, "30s", 30, "timed")),
      ], "Reset"),
    ],
  },
  {
    id: "home-no-equipment",
    name: "Home Bodyweight Builder",
    description: "No-gym plan using bodyweight patterns for strength and conditioning.",
    goal: "general-fitness",
    experience: "beginner",
    daysPerWeek: 3,
    estimatedMinutes: 30,
    equipment: ["bodyweight"],
    style: "home",
    tags: ["home", "bodyweight"],
    days: [
      day("Push Focus", 0, [
        ex("push-up", 0, sets(4, 10, 60)),
        ex("diamond-push-up", 1, sets(3, 8, 60)),
        ex("tricep-dip", 2, sets(3, 8, 60)),
        ex("plank", 3, sets(3, "40s", 45, "timed")),
      ], "Push"),
      day("Pull & Hinge", 1, [
        ex("inverted-row", 0, sets(4, 8, 75)),
        ex("glute-bridge", 1, sets(3, 15, 45)),
        ex("superman", 2, sets(3, "25s", 30, "timed")),
        ex("dead-bug", 3, sets(3, 10, 30)),
      ], "Pull"),
      day("Legs & Conditioning", 2, [
        ex("goblet-squat", 0, sets(3, 15, 45)),
        ex("reverse-lunge", 1, sets(3, 10, 45)),
        ex("wall-sit", 2, sets(3, "40s", 45, "timed")),
        ex("burpee", 3, sets(3, 8, 60)),
      ], "Legs"),
    ],
  },
  {
    id: "upper-lower-hypertrophy",
    name: "Upper / Lower Hypertrophy",
    description: "Balanced four-day split for muscle growth with moderate volume.",
    goal: "hypertrophy",
    experience: "beginner",
    daysPerWeek: 4,
    estimatedMinutes: 55,
    equipment: gym,
    style: "upper-lower",
    tags: ["hypertrophy", "upper-lower"],
    days: [
      day("Upper A", 0, [
        ex("dumbbell-bench-press", 0, sets(4, 10, 90)),
        ex("lat-pulldown", 1, sets(4, 10, 90)),
        ex("dumbbell-shoulder-press", 2, sets(3, 10, 75)),
        ex("dumbbell-curl", 3, sets(3, 12, 60)),
        ex("tricep-pushdown", 4, sets(3, 12, 60)),
      ], "Upper"),
      day("Lower A", 1, [
        ex("back-squat", 0, sets(4, 8, 120)),
        ex("romanian-deadlift", 1, sets(3, 10, 90)),
        ex("leg-press", 2, sets(3, 12, 75)),
        ex("calf-raise", 3, sets(3, 12, 45)),
        ex("plank", 4, sets(3, "40s", 40, "timed")),
      ], "Lower"),
      day("Upper B", 2, [
        ex("incline-dumbbell-press", 0, sets(4, 10, 90)),
        ex("seated-cable-row", 1, sets(4, 10, 90)),
        ex("lateral-raise", 2, sets(3, 15, 45)),
        ex("face-pull", 3, sets(3, 15, 45)),
        ex("hammer-curl", 4, sets(3, 12, 60)),
      ], "Upper"),
      day("Lower B", 3, [
        ex("hip-thrust", 0, sets(4, 10, 90)),
        ex("bulgarian-split-squat", 1, sets(3, 10, 75)),
        ex("leg-curl", 2, sets(3, 12, 60)),
        ex("leg-extension", 3, sets(3, 12, 60)),
        ex("hanging-leg-raise", 4, sets(3, 10, 45)),
      ], "Lower"),
    ],
  },
];

export const TEMPLATE_BY_ID = Object.fromEntries(
  WORKOUT_TEMPLATES.map((template) => [template.id, template]),
) as Record<string, BuiltInTemplate>;
