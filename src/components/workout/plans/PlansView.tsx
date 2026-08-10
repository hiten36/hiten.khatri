import { useMemo, useState } from "react";
import { EXERCISES, EXERCISE_BY_ID } from "../../../data/exercises";
import { WORKOUT_TEMPLATES } from "../../../data/workout-templates";
import { cloneTemplateDays, newId } from "../../../utils/workout-storage";
import type {
  PlanDay,
  PlanExercise,
  PrescribedSet,
  TrainingGoal,
  WorkoutPlan,
} from "../types";
import { createPlanShell } from "../state/workout-reducer";
import { useWorkout } from "../state/WorkoutContext";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Label,
  Panel,
  SectionTitle,
  Select,
  TextArea,
} from "../shared/ui";

function blankSet(): PrescribedSet {
  return {
    id: newId("set"),
    type: "normal",
    targetReps: 10,
    targetWeight: null,
    targetRpe: null,
    targetRir: 2,
    targetSeconds: null,
    restSeconds: 90,
    tempo: null,
  };
}

function blankExercise(exerciseId: string, order: number): PlanExercise {
  return {
    id: newId("pe"),
    exerciseId,
    order,
    sets: [blankSet(), blankSet(), blankSet()],
  };
}

function blankDay(order: number): PlanDay {
  return {
    id: newId("day"),
    name: `Day ${order + 1}`,
    order,
    exercises: [],
    isRestDay: false,
  };
}

export function PlansView() {
  const { state, dispatch } = useWorkout();
  const plans = state.store.plans.filter((p) => !p.archived);
  const [activeId, setActiveId] = useState<string | null>(
    state.store.activePlanId ?? plans[0]?.id ?? null,
  );
  const [search, setSearch] = useState("");

  const plan = plans.find((p) => p.id === activeId) ?? null;

  const exerciseOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return EXERCISES.filter((e) =>
      !q ? true : e.name.toLowerCase().includes(q) || e.id.includes(q),
    ).slice(0, 20);
  }, [search]);

  const updatePlan = (next: WorkoutPlan) => {
    dispatch({
      type: "UPSERT_PLAN",
      plan: { ...next, updatedAt: Date.now() },
    });
  };

  const createBlank = () => {
    const next = createPlanShell({
      name: "Custom Plan",
      goal: "general-fitness",
      days: [blankDay(0), blankDay(1), blankDay(2)],
      daysPerWeek: 3,
    });
    dispatch({ type: "UPSERT_PLAN", plan: next });
    dispatch({ type: "SET_ACTIVE_PLAN", planId: next.id });
    setActiveId(next.id);
  };

  const importTemplate = (templateId: string) => {
    const template = WORKOUT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const days = cloneTemplateDays(
      template.days.map((d, i) => ({ ...d, id: newId("day"), order: i })),
    );
    const next = createPlanShell({
      name: template.name,
      description: template.description,
      goal: template.goal,
      source: "template",
      templateId: template.id,
      daysPerWeek: template.daysPerWeek,
      estimatedMinutes: template.estimatedMinutes,
      experience: template.experience,
      equipment: template.equipment,
      days,
    });
    dispatch({ type: "UPSERT_PLAN", plan: next });
    dispatch({ type: "SET_ACTIVE_PLAN", planId: next.id });
    setActiveId(next.id);
  };

  const moveExercise = (dayId: string, exerciseId: string, dir: -1 | 1) => {
    if (!plan) return;
    const days = plan.days.map((day) => {
      if (day.id !== dayId) return day;
      const list = [...day.exercises].sort((a, b) => a.order - b.order);
      const idx = list.findIndex((e) => e.id === exerciseId);
      const swap = idx + dir;
      if (idx < 0 || swap < 0 || swap >= list.length) return day;
      const tmp = list[idx];
      list[idx] = list[swap];
      list[swap] = tmp;
      return {
        ...day,
        exercises: list.map((e, order) => ({ ...e, order })),
      };
    });
    updatePlan({ ...plan, days });
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        title="My Plans"
        subtitle="Build day-wise programs, import templates, and set your active plan."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={createBlank}>
              New plan
            </Button>
            <Select
              aria-label="Import template"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) importTemplate(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">Import template…</option>
              {WORKOUT_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      <div className="wo-split-layout">
        <Panel className="wo-split-layout__aside h-fit">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide wo-muted">
            Plans
          </h3>
          {plans.length === 0 ? (
            <EmptyState
              title="No plans"
              body="Create a custom plan or import a built-in template."
            />
          ) : (
            <ul className="wo-plan-list">
              {plans.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`wo-nav-item w-full text-left ${
                      p.id === activeId ? "is-active" : ""
                    }`}
                    onClick={() => {
                      setActiveId(p.id);
                      dispatch({ type: "SET_ACTIVE_PLAN", planId: p.id });
                    }}
                  >
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="wo-muted text-[11px]">
                      {p.daysPerWeek}d · {p.goal}
                      {state.store.activePlanId === p.id ? " · active" : ""}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {!plan ? (
          <EmptyState
            title="Select a plan"
            body="Pick a plan from the sidebar or create a new one."
          />
        ) : (
          <div className="space-y-4">
            <Panel>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label htmlFor="plan-name">Name</Label>
                  <Input
                    id="plan-name"
                    value={plan.name}
                    onChange={(e) => updatePlan({ ...plan, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="plan-goal">Goal</Label>
                  <Select
                    id="plan-goal"
                    value={plan.goal}
                    onChange={(e) =>
                      updatePlan({
                        ...plan,
                        goal: e.target.value as TrainingGoal,
                      })
                    }
                  >
                    {(
                      [
                        "strength",
                        "hypertrophy",
                        "fat-loss",
                        "endurance",
                        "mobility",
                        "general-fitness",
                      ] as TrainingGoal[]
                    ).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="plan-days">Days / week</Label>
                  <Input
                    id="plan-days"
                    type="number"
                    min={1}
                    max={7}
                    value={plan.daysPerWeek}
                    onChange={(e) =>
                      updatePlan({
                        ...plan,
                        daysPerWeek: Number(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="plan-mins">Est. minutes</Label>
                  <Input
                    id="plan-mins"
                    type="number"
                    min={15}
                    value={plan.estimatedMinutes}
                    onChange={(e) =>
                      updatePlan({
                        ...plan,
                        estimatedMinutes: Number(e.target.value) || 30,
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="plan-notes">Notes</Label>
                  <TextArea
                    id="plan-notes"
                    value={plan.notes ?? ""}
                    onChange={(e) => updatePlan({ ...plan, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  onClick={() =>
                    dispatch({ type: "SET_ACTIVE_PLAN", planId: plan.id })
                  }
                >
                  Set active
                </Button>
                <Button
                  onClick={() => {
                    const copy = {
                      ...plan,
                      id: newId("plan"),
                      name: `${plan.name} (copy)`,
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                      days: cloneTemplateDays(plan.days),
                    };
                    dispatch({ type: "UPSERT_PLAN", plan: copy });
                    setActiveId(copy.id);
                  }}
                >
                  Duplicate
                </Button>
                <Button
                  onClick={() =>
                    updatePlan({
                      ...plan,
                      days: [...plan.days, blankDay(plan.days.length)],
                    })
                  }
                >
                  Add day
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (!confirm("Delete this plan?")) return;
                    dispatch({ type: "DELETE_PLAN", planId: plan.id });
                    setActiveId(null);
                  }}
                >
                  Delete
                </Button>
              </div>
            </Panel>

            {plan.days
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((day) => (
                <Panel key={day.id}>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Input
                      value={day.name}
                      onChange={(e) =>
                        updatePlan({
                          ...plan,
                          days: plan.days.map((d) =>
                            d.id === day.id ? { ...d, name: e.target.value } : d,
                          ),
                        })
                      }
                      aria-label="Day name"
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!day.isRestDay}
                        onChange={(e) =>
                          updatePlan({
                            ...plan,
                            days: plan.days.map((d) =>
                              d.id === day.id
                                ? { ...d, isRestDay: e.target.checked }
                                : d,
                            ),
                          })
                        }
                      />
                      Rest day
                    </label>
                    <Button
                      variant="danger"
                      onClick={() =>
                        updatePlan({
                          ...plan,
                          days: plan.days
                            .filter((d) => d.id !== day.id)
                            .map((d, order) => ({ ...d, order })),
                        })
                      }
                    >
                      Remove day
                    </Button>
                  </div>

                  {!day.isRestDay ? (
                    <>
                      <ul className="space-y-3">
                        {day.exercises
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((item) => (
                            <li key={item.id} className="wo-exercise-card">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="font-medium">
                                  {EXERCISE_BY_ID[item.exerciseId]?.name ??
                                    item.exerciseId}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    onClick={() =>
                                      moveExercise(day.id, item.id, -1)
                                    }
                                  >
                                    ↑
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      moveExercise(day.id, item.id, 1)
                                    }
                                  >
                                    ↓
                                  </Button>
                                  <Button
                                    variant="danger"
                                    onClick={() =>
                                      updatePlan({
                                        ...plan,
                                        days: plan.days.map((d) =>
                                          d.id === day.id
                                            ? {
                                                ...d,
                                                exercises: d.exercises
                                                  .filter((e) => e.id !== item.id)
                                                  .map((e, order) => ({
                                                    ...e,
                                                    order,
                                                  })),
                                              }
                                            : d,
                                        ),
                                      })
                                    }
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>
                              <div className="mt-2 space-y-2">
                                {item.sets.map((set, setIndex) => (
                                  <div
                                    key={set.id}
                                    className="wo-set-row"

                                  >
                                    <Input
                                      aria-label={`Set ${setIndex + 1} reps`}
                                      value={set.targetReps ?? ""}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        updatePlan({
                                          ...plan,
                                          days: plan.days.map((d) =>
                                            d.id !== day.id
                                              ? d
                                              : {
                                                  ...d,
                                                  exercises: d.exercises.map((ex) =>
                                                    ex.id !== item.id
                                                      ? ex
                                                      : {
                                                          ...ex,
                                                          sets: ex.sets.map((s) =>
                                                            s.id === set.id
                                                              ? {
                                                                  ...s,
                                                                  targetReps: value,
                                                                }
                                                              : s,
                                                          ),
                                                        },
                                                  ),
                                                },
                                          ),
                                        });
                                      }}
                                      placeholder="Reps"
                                    />
                                    <Input
                                      aria-label={`Set ${setIndex + 1} weight`}
                                      type="number"
                                      value={set.targetWeight ?? ""}
                                      onChange={(e) => {
                                        const value =
                                          e.target.value === ""
                                            ? null
                                            : Number(e.target.value);
                                        updatePlan({
                                          ...plan,
                                          days: plan.days.map((d) =>
                                            d.id !== day.id
                                              ? d
                                              : {
                                                  ...d,
                                                  exercises: d.exercises.map((ex) =>
                                                    ex.id !== item.id
                                                      ? ex
                                                      : {
                                                          ...ex,
                                                          sets: ex.sets.map((s) =>
                                                            s.id === set.id
                                                              ? {
                                                                  ...s,
                                                                  targetWeight: value,
                                                                }
                                                              : s,
                                                          ),
                                                        },
                                                  ),
                                                },
                                          ),
                                        });
                                      }}
                                      placeholder="Weight"
                                    />
                                    <Input
                                      aria-label={`Set ${setIndex + 1} rest`}
                                      type="number"
                                      value={set.restSeconds ?? ""}
                                      onChange={(e) => {
                                        const value =
                                          e.target.value === ""
                                            ? null
                                            : Number(e.target.value);
                                        updatePlan({
                                          ...plan,
                                          days: plan.days.map((d) =>
                                            d.id !== day.id
                                              ? d
                                              : {
                                                  ...d,
                                                  exercises: d.exercises.map((ex) =>
                                                    ex.id !== item.id
                                                      ? ex
                                                      : {
                                                          ...ex,
                                                          sets: ex.sets.map((s) =>
                                                            s.id === set.id
                                                              ? {
                                                                  ...s,
                                                                  restSeconds: value,
                                                                }
                                                              : s,
                                                          ),
                                                        },
                                                  ),
                                                },
                                          ),
                                        });
                                      }}
                                      placeholder="Rest s"
                                    />
                                    <Select
                                      value={set.type}
                                      onChange={(e) =>
                                        updatePlan({
                                          ...plan,
                                          days: plan.days.map((d) =>
                                            d.id !== day.id
                                              ? d
                                              : {
                                                  ...d,
                                                  exercises: d.exercises.map((ex) =>
                                                    ex.id !== item.id
                                                      ? ex
                                                      : {
                                                          ...ex,
                                                          sets: ex.sets.map((s) =>
                                                            s.id === set.id
                                                              ? {
                                                                  ...s,
                                                                  type: e.target
                                                                    .value as PrescribedSet["type"],
                                                                }
                                                              : s,
                                                          ),
                                                        },
                                                  ),
                                                },
                                          ),
                                        })
                                      }
                                    >
                                      <option value="normal">Normal</option>
                                      <option value="warmup">Warm-up</option>
                                      <option value="drop">Drop</option>
                                      <option value="amrap">AMRAP</option>
                                      <option value="timed">Timed</option>
                                    </Select>
                                    <Button
                                      variant="ghost"
                                      onClick={() =>
                                        updatePlan({
                                          ...plan,
                                          days: plan.days.map((d) =>
                                            d.id !== day.id
                                              ? d
                                              : {
                                                  ...d,
                                                  exercises: d.exercises.map((ex) =>
                                                    ex.id !== item.id
                                                      ? ex
                                                      : {
                                                          ...ex,
                                                          sets: ex.sets.filter(
                                                            (s) => s.id !== set.id,
                                                          ),
                                                        },
                                                  ),
                                                },
                                          ),
                                        })
                                      }
                                    >
                                      ✕ set
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  onClick={() =>
                                    updatePlan({
                                      ...plan,
                                      days: plan.days.map((d) =>
                                        d.id !== day.id
                                          ? d
                                          : {
                                              ...d,
                                              exercises: d.exercises.map((ex) =>
                                                ex.id !== item.id
                                                  ? ex
                                                  : {
                                                      ...ex,
                                                      sets: [...ex.sets, blankSet()],
                                                    },
                                              ),
                                            },
                                      ),
                                    })
                                  }
                                >
                                  Add set
                                </Button>
                              </div>
                            </li>
                          ))}
                      </ul>

                      <div className="mt-4 border-t border-[var(--wo-border)] pt-3">
                        <Label htmlFor={`add-${day.id}`}>Add exercise</Label>
                        <Input
                          id={`add-${day.id}`}
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search exercises…"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          {exerciseOptions.map((exercise) => (
                            <Button
                              key={exercise.id}
                              onClick={() => {
                                updatePlan({
                                  ...plan,
                                  days: plan.days.map((d) =>
                                    d.id !== day.id
                                      ? d
                                      : {
                                          ...d,
                                          exercises: [
                                            ...d.exercises,
                                            blankExercise(
                                              exercise.id,
                                              d.exercises.length,
                                            ),
                                          ],
                                        },
                                  ),
                                });
                                setSearch("");
                              }}
                            >
                              + {exercise.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <Badge>Rest day</Badge>
                  )}
                </Panel>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
