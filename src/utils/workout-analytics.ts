import { EXERCISE_BY_ID } from "../data/exercises";
import type {
  MuscleGroup,
  PersonalRecord,
  WorkoutSession,
} from "../components/workout/types";

export function estimate1rm(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function setVolume(weight: number | null, reps: number | null): number {
  if (!weight || !reps) return 0;
  return weight * reps;
}

export function sessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (sum, exercise) =>
      sum +
      exercise.sets.reduce(
        (inner, set) =>
          inner + (set.completed ? setVolume(set.weight, set.reps) : 0),
        0,
      ),
    0,
  );
}

export function completedSessions(sessions: WorkoutSession[]) {
  return sessions.filter((session) => session.status === "completed");
}

export function weeklyFrequency(
  sessions: WorkoutSession[],
  now = Date.now(),
): number {
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return completedSessions(sessions).filter(
    (session) => (session.endedAt ?? session.startedAt) >= weekAgo,
  ).length;
}

export function computeStreak(
  sessions: WorkoutSession[],
  now = Date.now(),
  freezeUsedAt: number | null = null,
): number {
  const days = new Set(
    completedSessions(sessions).map((session) => {
      const d = new Date(session.endedAt ?? session.startedAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }),
  );

  let streak = 0;
  const cursor = new Date(now);
  for (let i = 0; i < 365; i += 1) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (days.has(key)) {
      streak += 1;
    } else if (
      i === 0 &&
      freezeUsedAt &&
      now - freezeUsedAt < 36 * 60 * 60 * 1000
    ) {
      // allow a recent freeze without breaking
    } else if (i === 0) {
      // today not trained yet — keep checking yesterday
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function detectPrsForSession(
  session: WorkoutSession,
  existing: PersonalRecord[],
): PersonalRecord[] {
  const found: PersonalRecord[] = [];
  for (const exercise of session.exercises) {
    if (exercise.skipped) continue;
    for (const set of exercise.sets) {
      if (!set.completed || set.skipped) continue;
      const weight = set.weight ?? 0;
      const reps = set.reps ?? 0;
      const volume = setVolume(set.weight, set.reps);
      const e1rm = estimate1rm(weight, reps);

      const candidates: Array<{
        kind: PersonalRecord["kind"];
        value: number;
        secondaryValue?: number;
      }> = [];

      if (weight > 0) {
        candidates.push({ kind: "weight", value: weight, secondaryValue: reps });
      }
      if (reps > 0) {
        candidates.push({ kind: "reps", value: reps, secondaryValue: weight });
      }
      if (volume > 0) candidates.push({ kind: "volume", value: volume });
      if (e1rm > 0) candidates.push({ kind: "estimated1rm", value: e1rm });
      if ((set.seconds ?? 0) > 0) {
        candidates.push({ kind: "duration", value: set.seconds ?? 0 });
      }

      for (const candidate of candidates) {
        const prior = existing
          .concat(found)
          .filter(
            (pr) =>
              pr.exerciseId === exercise.exerciseId && pr.kind === candidate.kind,
          )
          .sort((a, b) => b.value - a.value)[0];
        if (!prior || candidate.value > prior.value) {
          found.push({
            id: `pr_${crypto.randomUUID()}`,
            exerciseId: exercise.exerciseId,
            kind: candidate.kind,
            value: candidate.value,
            secondaryValue: candidate.secondaryValue ?? null,
            sessionId: session.id,
            achievedAt: set.completedAt ?? session.endedAt ?? Date.now(),
          });
        }
      }
    }
  }
  return found;
}

export function muscleBalance(
  sessions: WorkoutSession[],
): Record<MuscleGroup, number> {
  const balance = {} as Record<MuscleGroup, number>;
  for (const session of completedSessions(sessions)) {
    for (const exerciseLog of session.exercises) {
      const exercise = EXERCISE_BY_ID[exerciseLog.exerciseId];
      if (!exercise) continue;
      const volume = exerciseLog.sets.reduce(
        (sum, set) => sum + (set.completed ? setVolume(set.weight, set.reps) : 0),
        0,
      );
      const fallback = exerciseLog.sets.filter((set) => set.completed).length;
      const value = volume || fallback;
      for (const muscle of exercise.primaryMuscles) {
        balance[muscle] = (balance[muscle] ?? 0) + value;
      }
    }
  }
  return balance;
}

export function volumeTrend(
  sessions: WorkoutSession[],
  days = 28,
): Array<{ date: string; volume: number }> {
  const map = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, 0);
  }
  for (const session of completedSessions(sessions)) {
    const key = new Date(session.endedAt ?? session.startedAt)
      .toISOString()
      .slice(0, 10);
    if (!map.has(key)) continue;
    map.set(key, (map.get(key) ?? 0) + sessionVolume(session));
  }
  return Array.from(map.entries()).map(([date, volume]) => ({ date, volume }));
}

export function adherencePercent(
  sessions: WorkoutSession[],
  plannedPerWeek: number,
  weeks = 4,
): number {
  if (plannedPerWeek <= 0) return 0;
  const since = Date.now() - weeks * 7 * 24 * 60 * 60 * 1000;
  const done = completedSessions(sessions).filter(
    (session) => (session.endedAt ?? session.startedAt) >= since,
  ).length;
  const expected = plannedPerWeek * weeks;
  return Math.min(100, Math.round((done / expected) * 100));
}

export function plateMath(
  targetKg: number,
  barKg: number,
  plates: number[],
): { perSide: number[]; total: number; remainder: number } {
  let remaining = Math.max(0, (targetKg - barKg) / 2);
  const sorted = [...plates].sort((a, b) => b - a);
  const perSide: number[] = [];
  for (const plate of sorted) {
    while (remaining + 1e-9 >= plate) {
      perSide.push(plate);
      remaining -= plate;
    }
  }
  const total = barKg + perSide.reduce((a, b) => a + b, 0) * 2;
  return { perSide, total, remainder: Math.round(remaining * 100) / 100 };
}

export function warmupSets(workingWeight: number): Array<{ weight: number; reps: number }> {
  if (workingWeight <= 0) return [{ weight: 0, reps: 8 }];
  return [
    { weight: Math.round(workingWeight * 0.4), reps: 8 },
    { weight: Math.round(workingWeight * 0.6), reps: 5 },
    { weight: Math.round(workingWeight * 0.8), reps: 3 },
  ];
}

export function suggestProgression(
  lastSets: Array<{ reps: number | null; weight: number | null; completed: boolean }>,
  targetReps: number,
  increment: number,
): { weight: number; note: string } | null {
  const completed = lastSets.filter((set) => set.completed && set.weight && set.reps);
  if (completed.length === 0) return null;
  const allHit = completed.every((set) => (set.reps ?? 0) >= targetReps);
  const avgWeight =
    completed.reduce((sum, set) => sum + (set.weight ?? 0), 0) / completed.length;
  if (allHit) {
    return {
      weight: Math.round((avgWeight + increment) * 10) / 10,
      note: `Hit all targets — try +${increment} next time`,
    };
  }
  return {
    weight: Math.round(avgWeight * 10) / 10,
    note: "Keep the same load and chase the rep target",
  };
}
