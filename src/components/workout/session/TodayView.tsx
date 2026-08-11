import { useEffect, useMemo, useState } from "react";
import { EXERCISE_BY_ID } from "../../../data/exercises";
import {
  sessionVolume,
  suggestProgression,
  warmupSets,
} from "../../../utils/workout-analytics";
import { newId } from "../../../utils/workout-storage";
import type {
  LoggedSet,
  PlanDay,
  SessionExerciseLog,
  WorkoutSession,
} from "../types";
import { useWorkout } from "../state/WorkoutContext";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Label,
  Panel,
  SectionTitle,
  TextArea,
} from "../shared/ui";

function formatMs(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildSessionFromDay(day: PlanDay, planId: string): WorkoutSession {
  return {
    id: newId("session"),
    planId,
    planDayId: day.id,
    name: day.name,
    status: "in-progress",
    startedAt: Date.now(),
    endedAt: null,
    pausedAt: null,
    accumulatedMs: 0,
    exercises: day.exercises
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((pe, order) => ({
        id: newId("sel"),
        exerciseId: pe.exerciseId,
        planExerciseId: pe.id,
        order,
        skipped: false,
        sets: pe.sets.map((set) => ({
          id: newId("lset"),
          prescribedSetId: set.id,
          type: set.type,
          reps:
            typeof set.targetReps === "number"
              ? set.targetReps
              : Number.parseInt(String(set.targetReps ?? ""), 10) || null,
          weight: set.targetWeight ?? null,
          rpe: set.targetRpe ?? null,
          rir: set.targetRir ?? null,
          seconds: set.targetSeconds ?? null,
          completed: false,
          skipped: false,
        })),
      })),
  };
}

function emptySession(): WorkoutSession {
  return {
    id: newId("session"),
    planId: null,
    planDayId: null,
    name: "Quick Workout",
    status: "in-progress",
    startedAt: Date.now(),
    endedAt: null,
    pausedAt: null,
    accumulatedMs: 0,
    exercises: [],
  };
}

export function TodayView() {
  const { state, dispatch } = useWorkout();
  const plan = state.store.plans.find((p) => p.id === state.store.activePlanId);
  const active = state.store.sessions.find(
    (s) => s.id === state.store.activeSessionId,
  );

  const [session, setSession] = useState<WorkoutSession | null>(active ?? null);
  const [restLeft, setRestLeft] = useState(0);
  const [tick, setTick] = useState(Date.now());
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    setSession(active ?? null);
  }, [active]);

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (restLeft <= 0) return;
    const id = window.setInterval(() => setRestLeft((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(id);
  }, [restLeft]);

  const elapsed = useMemo(() => {
    if (!session) return 0;
    if (session.status === "paused") return session.accumulatedMs;
    if (session.status !== "in-progress") {
      return session.accumulatedMs;
    }
    return session.accumulatedMs + (tick - session.startedAt);
  }, [session, tick]);

  const persist = (next: WorkoutSession) => {
    setSession(next);
    dispatch({ type: "UPSERT_SESSION", session: next });
  };

  const startDay = (day: PlanDay) => {
    if (!plan) return;
    const next = buildSessionFromDay(day, plan.id);
    persist(next);
    dispatch({ type: "SET_ACTIVE_SESSION", sessionId: next.id });
    setSummary(null);
  };

  const updateSet = (
    exerciseId: string,
    setId: string,
    patch: Partial<LoggedSet>,
  ) => {
    if (!session) return;
    const next: WorkoutSession = {
      ...session,
      exercises: session.exercises.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
            },
      ),
    };
    persist(next);
  };

  const completeSet = (exercise: SessionExerciseLog, set: LoggedSet) => {
    updateSet(exercise.id, set.id, {
      completed: true,
      skipped: false,
      completedAt: Date.now(),
    });
    const rest =
      state.store.preferences.defaultRestSeconds ||
      90;
    setRestLeft(rest);
  };

  const finish = () => {
    if (!session) return;
    const next: WorkoutSession = {
      ...session,
      status: "completed",
      endedAt: Date.now(),
      accumulatedMs: elapsed,
      pausedAt: null,
    };
    dispatch({ type: "COMPLETE_SESSION", session: next });
    setSession(null);
    setSummary(
      `Finished ${next.name} · ${formatMs(elapsed)} · volume ${Math.round(
        sessionVolume(next),
      )}`,
    );
  };

  const previousFor = (exerciseId: string) => {
    const previous = [...state.store.sessions]
      .filter((s) => s.status === "completed")
      .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
      .flatMap((s) => s.exercises)
      .find((e) => e.exerciseId === exerciseId);
    return previous;
  };

  return (
    <div className="wo-page space-y-4">
      <div className="wo-page__intro wo-page__intro--desktop">
        <SectionTitle
          title="Today"
          subtitle="Log sets, run rest timers, and resume in-progress sessions after refresh."
        />
      </div>

      {summary ? (
        <Panel className="wo-session-summary">
          <p className="font-medium">{summary}</p>
          <Button className="mt-3 w-full sm:w-auto" onClick={() => setSummary(null)}>
            Dismiss
          </Button>
        </Panel>
      ) : null}

      {!session ? (
        <div className="space-y-4">
          {!plan ? (
            <EmptyState
              title="No active plan"
              body="Create or recommend a plan first, or start a quick empty session."
              action={
                <Button
                  variant="primary"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const next = emptySession();
                    persist(next);
                    dispatch({ type: "SET_ACTIVE_SESSION", sessionId: next.id });
                  }}
                >
                  Quick workout
                </Button>
              }
            />
          ) : (
            <Panel>
              <h3 className="mb-3 font-semibold">{plan.name}</h3>
              <div className="wo-day-grid">
                {plan.days
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      className="wo-day-card"
                      disabled={!!day.isRestDay}
                      onClick={() => startDay(day)}
                    >
                      <div className="min-w-0">
                        <div className="font-medium">{day.name}</div>
                        <div className="wo-muted text-xs">
                          {day.isRestDay
                            ? "Rest day"
                            : `${day.exercises.length} exercises`}
                        </div>
                      </div>
                      <span className="wo-day-card__cta">
                        {day.isRestDay ? "Rest" : "Start"}
                      </span>
                    </button>
                  ))}
              </div>
              <Button
                className="mt-3 w-full sm:w-auto"
                onClick={() => {
                  const next = emptySession();
                  persist(next);
                  dispatch({ type: "SET_ACTIVE_SESSION", sessionId: next.id });
                }}
              >
                Or start empty session
              </Button>
            </Panel>
          )}
        </div>
      ) : (
        <>
          <div className="wo-session-bar">
            <div className="wo-session-bar__meta">
              <h3 className="wo-session-bar__title">{session.name}</h3>
              <p className="wo-session-bar__timer">
                <span className="wo-session-bar__status">{session.status}</span>
                <span aria-hidden>·</span>
                <span className="wo-session-bar__clock">{formatMs(elapsed)}</span>
              </p>
            </div>
            {restLeft > 0 ? (
              <div className="wo-rest-pill" role="status">
                Rest {restLeft}s
              </div>
            ) : null}
            <div className="wo-session-bar__actions">
              <Button
                onClick={() => {
                  if (session.status === "paused") {
                    persist({
                      ...session,
                      status: "in-progress",
                      startedAt: Date.now(),
                      pausedAt: null,
                    });
                  } else {
                    persist({
                      ...session,
                      status: "paused",
                      pausedAt: Date.now(),
                      accumulatedMs: elapsed,
                    });
                  }
                }}
              >
                {session.status === "paused" ? "Resume" : "Pause"}
              </Button>
              <Button
                onClick={() => setRestLeft(state.store.preferences.defaultRestSeconds)}
              >
                Rest
              </Button>
              <Button variant="primary" onClick={finish}>
                Finish
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (!confirm("Abandon this session?")) return;
                  persist({
                    ...session,
                    status: "abandoned",
                    endedAt: Date.now(),
                    accumulatedMs: elapsed,
                  });
                  dispatch({ type: "SET_ACTIVE_SESSION", sessionId: null });
                  setSession(null);
                }}
              >
                Quit
              </Button>
            </div>
          </div>

          {session.exercises.map((exercise) => {
            const meta = EXERCISE_BY_ID[exercise.exerciseId];
            const prev = previousFor(exercise.exerciseId);
            const suggestion = suggestProgression(
              prev?.sets.map((s) => ({
                reps: s.reps,
                weight: s.weight,
                completed: s.completed,
              })) ?? [],
              8,
              state.store.preferences.loadIncrementKg,
            );
            const doneCount = exercise.sets.filter((s) => s.completed).length;
            return (
              <Panel key={exercise.id} className="wo-exercise-log">
                <div className="wo-exercise-log__head">
                  <div className="min-w-0">
                    <h4 className="font-semibold leading-snug">
                      {meta?.name ?? exercise.exerciseId}
                    </h4>
                    <p className="wo-muted text-xs">
                      {doneCount}/{exercise.sets.length} sets
                      {prev
                        ? ` · Last ${
                            prev.sets
                              .filter((s) => s.completed)
                              .map((s) => `${s.weight ?? 0}×${s.reps ?? 0}`)
                              .join(", ") || "—"
                          }`
                        : ""}
                    </p>
                    {suggestion ? (
                      <p className="mt-1 text-xs text-[var(--wo-accent)]">
                        {suggestion.note}
                      </p>
                    ) : null}
                  </div>
                  <div className="wo-exercise-log__tools">
                    <Button
                      onClick={() => {
                        const working =
                          exercise.sets.find((s) => s.weight)?.weight ?? 40;
                        const warm = warmupSets(working);
                        persist({
                          ...session,
                          exercises: session.exercises.map((ex) =>
                            ex.id !== exercise.id
                              ? ex
                              : {
                                  ...ex,
                                  sets: [
                                    ...warm.map((w) => ({
                                      id: newId("lset"),
                                      type: "warmup" as const,
                                      reps: w.reps,
                                      weight: w.weight,
                                      rpe: null,
                                      rir: null,
                                      seconds: null,
                                      completed: false,
                                      skipped: false,
                                    })),
                                    ...ex.sets,
                                  ],
                                },
                          ),
                        });
                      }}
                    >
                      Warm-ups
                    </Button>
                    <Button
                      onClick={() =>
                        persist({
                          ...session,
                          exercises: session.exercises.map((ex) =>
                            ex.id === exercise.id
                              ? { ...ex, skipped: !ex.skipped }
                              : ex,
                          ),
                        })
                      }
                    >
                      {exercise.skipped ? "Unskip" : "Skip"}
                    </Button>
                  </div>
                </div>

                {!exercise.skipped ? (
                  <div className="space-y-3">
                    {exercise.sets.map((set, idx) => (
                      <div
                        key={set.id}
                        className={cnSet(set.completed)}
                      >
                        <div className="wo-set-card__label">
                          Set {idx + 1}
                          <span className="wo-muted"> · {set.type}</span>
                        </div>
                        <div className="wo-set-card__fields">
                          <Input
                            type="number"
                            inputMode="decimal"
                            aria-label="Weight"
                            value={set.weight ?? ""}
                            onChange={(e) =>
                              updateSet(exercise.id, set.id, {
                                weight:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              })
                            }
                            placeholder="kg"
                          />
                          <Input
                            type="number"
                            inputMode="numeric"
                            aria-label="Reps"
                            value={set.reps ?? ""}
                            onChange={(e) =>
                              updateSet(exercise.id, set.id, {
                                reps:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              })
                            }
                            placeholder="reps"
                          />
                          {state.store.preferences.showRpe ? (
                            <Input
                              type="number"
                              inputMode="decimal"
                              aria-label="RPE"
                              value={set.rpe ?? ""}
                              onChange={(e) =>
                                updateSet(exercise.id, set.id, {
                                  rpe:
                                    e.target.value === ""
                                      ? null
                                      : Number(e.target.value),
                                })
                              }
                              placeholder="RPE"
                            />
                          ) : null}
                        </div>
                        <div className="wo-set-card__actions">
                          <Button
                            variant={set.completed ? "primary" : "secondary"}
                            className="wo-set-card__complete"
                            onClick={() => completeSet(exercise, set)}
                          >
                            {set.completed ? "Done ✓" : "Complete set"}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              updateSet(exercise.id, set.id, {
                                skipped: true,
                                completed: false,
                              })
                            }
                          >
                            Skip
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Label htmlFor={`note-${exercise.id}`}>Notes</Label>
                    <TextArea
                      id={`note-${exercise.id}`}
                      value={exercise.notes ?? ""}
                      onChange={(e) =>
                        persist({
                          ...session,
                          exercises: session.exercises.map((ex) =>
                            ex.id === exercise.id
                              ? { ...ex, notes: e.target.value }
                              : ex,
                          ),
                        })
                      }
                    />
                  </div>
                ) : (
                  <Badge>Skipped</Badge>
                )}
              </Panel>
            );
          })}
        </>
      )}
    </div>
  );
}

function cnSet(completed: boolean) {
  return `wo-set-card${completed ? " is-done" : ""}`;
}
