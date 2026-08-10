import type {
  Achievement,
  BodyMeasurement,
  PersonalRecord,
  QuestionnaireAnswers,
  Reminder,
  WorkoutPlan,
  WorkoutPreferences,
  WorkoutSession,
  WorkoutStore,
} from "../components/workout/types";

export const WORKOUT_STORE_VERSION = 1;
export const WORKOUT_STORAGE_KEY = "hiten.workout.store.v1";

export const DEFAULT_PREFERENCES: WorkoutPreferences = {
  units: "kg",
  defaultRestSeconds: 90,
  loadIncrementKg: 2.5,
  showRpe: true,
  showRir: true,
  theme: "light",
  reducedMotion: false,
  plateBarWeightKg: 20,
  availablePlatesKg: [25, 20, 15, 10, 5, 2.5, 1.25],
};

export function createEmptyStore(): WorkoutStore {
  return {
    version: WORKOUT_STORE_VERSION,
    plans: [],
    activePlanId: null,
    sessions: [],
    activeSessionId: null,
    prs: [],
    measurements: [],
    questionnaire: null,
    favorites: [],
    recentlyViewed: [],
    achievements: [],
    reminders: [],
    preferences: { ...DEFAULT_PREFERENCES },
    streakFreezeUsedAt: null,
  };
}

const isBrowser = () => typeof window !== "undefined";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateStore(raw: unknown): WorkoutStore | null {
  if (!isObject(raw)) return null;
  if (typeof raw.version !== "number") return null;
  if (!Array.isArray(raw.plans) || !Array.isArray(raw.sessions)) return null;
  if (!Array.isArray(raw.prs) || !Array.isArray(raw.measurements)) return null;
  if (!Array.isArray(raw.favorites) || !Array.isArray(raw.recentlyViewed)) return null;
  if (!Array.isArray(raw.achievements) || !Array.isArray(raw.reminders)) return null;
  if (!isObject(raw.preferences)) return null;

  const base = createEmptyStore();
  return {
    ...base,
    ...raw,
    version: WORKOUT_STORE_VERSION,
    plans: raw.plans as WorkoutPlan[],
    sessions: raw.sessions as WorkoutSession[],
    prs: raw.prs as PersonalRecord[],
    measurements: raw.measurements as BodyMeasurement[],
    questionnaire: (raw.questionnaire as QuestionnaireAnswers | null) ?? null,
    favorites: raw.favorites as string[],
    recentlyViewed: raw.recentlyViewed as string[],
    achievements: raw.achievements as Achievement[],
    reminders: raw.reminders as Reminder[],
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...(raw.preferences as Partial<WorkoutPreferences>),
    },
    activePlanId: (raw.activePlanId as string | null) ?? null,
    activeSessionId: (raw.activeSessionId as string | null) ?? null,
    streakFreezeUsedAt: (raw.streakFreezeUsedAt as number | null) ?? null,
  };
}

export function migrateStore(raw: unknown): WorkoutStore {
  if (!isObject(raw)) return createEmptyStore();
  const validated = validateStore(raw);
  if (validated) return validated;
  return createEmptyStore();
}

export function readWorkoutStore(): WorkoutStore {
  if (!isBrowser()) return createEmptyStore();
  try {
    const raw = localStorage.getItem(WORKOUT_STORAGE_KEY);
    if (!raw) return createEmptyStore();
    return migrateStore(JSON.parse(raw));
  } catch {
    return createEmptyStore();
  }
}

export function writeWorkoutStore(store: WorkoutStore): { ok: boolean; error?: string } {
  if (!isBrowser()) return { ok: false, error: "Not in browser" };
  try {
    localStorage.setItem(
      WORKOUT_STORAGE_KEY,
      JSON.stringify({ ...store, version: WORKOUT_STORE_VERSION }),
    );
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === "QuotaExceededError"
        ? "Storage quota exceeded. Export and clear old sessions."
        : "Failed to save workout data.";
    return { ok: false, error: message };
  }
}

export function exportWorkoutStore(store: WorkoutStore): string {
  return JSON.stringify(
    {
      ...store,
      version: WORKOUT_STORE_VERSION,
      exportedAt: Date.now(),
    },
    null,
    2,
  );
}

export function importWorkoutStore(json: string): WorkoutStore {
  const parsed = JSON.parse(json) as unknown;
  const next = migrateStore(parsed);
  if (!next.plans && !next.sessions) {
    throw new Error("Invalid workout backup");
  }
  return next;
}

export function resetWorkoutStore(): WorkoutStore {
  const empty = createEmptyStore();
  writeWorkoutStore(empty);
  return empty;
}

export function newId(prefix = "id") {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function cloneTemplateDays(
  days: WorkoutPlan["days"],
): WorkoutPlan["days"] {
  return days.map((day, dayIndex) => ({
    ...day,
    id: newId("day"),
    order: dayIndex,
    exercises: day.exercises.map((exercise, exerciseIndex) => ({
      ...exercise,
      id: newId("pe"),
      order: exerciseIndex,
      sets: exercise.sets.map((set) => ({
        ...set,
        id: newId("set"),
      })),
    })),
  }));
}
