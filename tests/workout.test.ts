import { describe, expect, test } from "bun:test";
import {
  estimate1rm,
  detectPrsForSession,
  plateMath,
  sessionVolume,
  suggestProgression,
} from "../src/utils/workout-analytics";
import { recommendPlan, scoreTemplates } from "../src/utils/workout-recommendation";
import {
  createEmptyStore,
  exportWorkoutStore,
  importWorkoutStore,
  migrateStore,
  validateStore,
} from "../src/utils/workout-storage";
import type { QuestionnaireAnswers, WorkoutSession } from "../src/components/workout/types";

const answers: QuestionnaireAnswers = {
  goal: "hypertrophy",
  experience: "intermediate",
  daysPerWeek: 6,
  sessionMinutes: 70,
  equipment: ["barbell", "dumbbell", "cable", "machine", "bench", "pull-up-bar"],
  preferredStyle: "push-pull-legs",
  mobilityNeeds: false,
  limitations: "",
  completedAt: Date.now(),
};

describe("workout recommendation", () => {
  test("ranks hypertrophy PPL highly for matching answers", () => {
    const ranked = scoreTemplates(answers);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].templateId).toBe("hypertrophy-ppl");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  test("recommendPlan returns top result", () => {
    const top = recommendPlan(answers);
    expect(top.templateId).toBe("hypertrophy-ppl");
    expect(top.reasons.length).toBeGreaterThan(0);
  });
});

describe("workout analytics", () => {
  test("estimates 1RM", () => {
    expect(estimate1rm(100, 1)).toBe(100);
    expect(estimate1rm(100, 5)).toBeGreaterThan(100);
  });

  test("plate math balances sides", () => {
    const result = plateMath(100, 20, [25, 20, 15, 10, 5, 2.5, 1.25]);
    expect(result.total).toBe(100);
    expect(result.perSide.reduce((a, b) => a + b, 0) * 2 + 20).toBe(100);
  });

  test("detects PRs and volume", () => {
    const session: WorkoutSession = {
      id: "s1",
      name: "Test",
      status: "completed",
      startedAt: Date.now(),
      endedAt: Date.now(),
      accumulatedMs: 1000,
      exercises: [
        {
          id: "e1",
          exerciseId: "bench-press",
          order: 0,
          skipped: false,
          sets: [
            {
              id: "set1",
              type: "normal",
              reps: 5,
              weight: 100,
              rpe: null,
              rir: null,
              seconds: null,
              completed: true,
              skipped: false,
              completedAt: Date.now(),
            },
          ],
        },
      ],
    };
    expect(sessionVolume(session)).toBe(500);
    const prs = detectPrsForSession(session, []);
    expect(prs.some((pr) => pr.kind === "weight")).toBe(true);
  });

  test("suggests progression when targets hit", () => {
    const suggestion = suggestProgression(
      [
        { reps: 10, weight: 40, completed: true },
        { reps: 10, weight: 40, completed: true },
      ],
      10,
      2.5,
    );
    expect(suggestion?.weight).toBe(42.5);
  });
});

describe("workout storage", () => {
  test("validates and migrates store shapes", () => {
    const empty = createEmptyStore();
    expect(validateStore(empty)?.version).toBe(1);
    expect(migrateStore({ version: 1, plans: [], sessions: [], prs: [], measurements: [], favorites: [], recentlyViewed: [], achievements: [], reminders: [], preferences: {} }).plans).toEqual([]);
    expect(validateStore({ nope: true })).toBeNull();
  });

  test("export/import round trip", () => {
    const store = createEmptyStore();
    store.favorites = ["bench-press"];
    const json = exportWorkoutStore(store);
    const imported = importWorkoutStore(json);
    expect(imported.favorites).toEqual(["bench-press"]);
  });
});
