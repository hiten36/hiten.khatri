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
    <div className="space-y-4">
      <SectionTitle
        title="Today"
        subtitle="Log sets, run rest timers, and resume in-progress sessions after refresh."
      />

      {summary ? (
        <Panel>
          <p className="font-medium">{summary}</p>
          <Button className="mt-3" onClick={() => setSummary(null)}>
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
              <h3 className="mb-2 font-semibold">{plan.name}</h3>
              <div className="grid gap-2 md:grid-cols-2">
                {plan.days
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      className="wo-list-row text-left"
                      disabled={!!day.isRestDay}
                      onClick={() => startDay(day)}
                    >
                      <div>
                        <div className="font-medium">{day.name}</div>
                        <div className="wo-muted text-xs">
                          {day.isRestDay
                            ? "Rest day"
                            : `${day.exercises.length} exercises`}
                        </div>
                      </div>
                      <Badge>{day.isRestDay ? "Rest" : "Start"}</Badge>
                    </button>
                  ))}
              </div>
              <Button
                className="mt-3"
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
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{session.name}</h3>
                <p className="wo-muted text-sm">
                  {session.status} · {formatMs(elapsed)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {restLeft > 0 ? <Badge>Rest {restLeft}s</Badge> : null}
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
                  Rest timer
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
                  Abandon
                </Button>
              </div>
            </div>
          </Panel>

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
            return (
              <Panel key={exercise.id}>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold">{meta?.name ?? exercise.exerciseId}</h4>
                    {prev ? (
                      <p className="wo-muted text-xs">
                        Last:{" "}
                        {prev.sets
                          .filter((s) => s.completed)
                          .map((s) => `${s.weight ?? 0}×${s.reps ?? 0}`)
                          .join(", ") || "—"}
                      </p>
                    ) : null}
                    {suggestion ? (
                      <p className="text-xs text-orange-400">{suggestion.note}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const working = exercise.sets.find((s) => s.weight)?.weight ?? 40;
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
                      Add warm-ups
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
                  <div className="space-y-2">
                    {exercise.sets.map((set, idx) => (
                      <div
                        key={set.id}
                        className="wo-set-row wo-set-row--session"
                      >
                        <div className="wo-muted self-center text-xs">
                          #{idx + 1} {set.type}
                        </div>
                        <Input
                          type="number"
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
                          placeholder="Weight"
                        />
                        <Input
                          type="number"
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
                          placeholder="Reps"
                        />
                        {state.store.preferences.showRpe ? (
                          <Input
                            type="number"
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
                        ) : (
                          <div />
                        )}
                        <Button
                          variant={set.completed ? "primary" : "secondary"}
                          onClick={() => completeSet(exercise, set)}
                        >
                          {set.completed ? "Done" : "Complete"}
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
                          Skip set
                        </Button>
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
