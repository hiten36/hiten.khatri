import { useEffect, useMemo, useState } from "react";
import { EXERCISES, MUSCLE_GROUPS } from "../../../data/exercises";
import { getExerciseGifUrl } from "../../../data/exercise-gifs";
import type { Difficulty, Equipment, MuscleGroup } from "../types";
import { useWorkout } from "../state/WorkoutContext";
import { cn } from "../../../utils/cn";
import { usePresence } from "../../../utils/use-presence";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Label,
  Panel,
  SectionTitle,
  Select,
} from "../shared/ui";
import { ExerciseScene } from "./ExerciseScene";

const PAGE_SIZE = 24;

export function ExercisesView() {
  const { state, dispatch } = useWorkout();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [sheetMs, setSheetMs] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 1099px)").matches
      ? 280
      : 0,
  );

  const selected =
    EXERCISES.find((e) => e.id === state.selectedExerciseId) ?? null;
  const { present, active } = usePresence(!!selected, sheetMs);
  const [display, setDisplay] = useState(selected);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1099px)");
    const sync = () => setSheetMs(mq.matches ? 280 : 0);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (selected) setDisplay(selected);
  }, [selected]);

  useEffect(() => {
    if (!present) return;
    const mq = window.matchMedia("(max-width: 1099px)");
    const prev = document.body.style.overflow;
    const syncOverflow = () => {
      document.body.style.overflow = mq.matches ? "hidden" : prev;
    };
    syncOverflow();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "CLEAR_EXERCISE" });
    };
    mq.addEventListener("change", syncOverflow);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      mq.removeEventListener("change", syncOverflow);
      window.removeEventListener("keydown", onKey);
    };
  }, [present, dispatch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter((exercise) => {
      if (favoritesOnly && !state.store.favorites.includes(exercise.id)) {
        return false;
      }
      if (muscle !== "all" && !exercise.primaryMuscles.includes(muscle)) {
        return false;
      }
      if (equipment !== "all" && !exercise.equipment.includes(equipment)) {
        return false;
      }
      if (difficulty !== "all" && exercise.difficulty !== difficulty) {
        return false;
      }
      if (!q) return true;
      return (
        exercise.name.toLowerCase().includes(q) ||
        exercise.tags?.some((t) => t.includes(q)) ||
        exercise.primaryMuscles.some((m) => m.includes(q))
      );
    });
  }, [query, muscle, equipment, difficulty, favoritesOnly, state.store.favorites]);

  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const compare = compareIds
    .map((id) => EXERCISES.find((e) => e.id === id))
    .filter(Boolean);

  return (
    <div className="wo-page space-y-4">
      <div className="wo-page__intro wo-page__intro--desktop">
        <SectionTitle
          title="Exercise Catalogue"
          subtitle={`${EXERCISES.length}+ movements with cues, substitutions, and form GIFs for every exercise.`}
        />
      </div>

      <Panel>
        <div className="wo-filters">
          <div className="wo-filters__search">
            <Label htmlFor="ex-q">Search</Label>
            <Input
              id="ex-q"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search moves…"
              enterKeyHint="search"
            />
          </div>
          <div>
            <Label htmlFor="ex-muscle">Body part</Label>
            <Select
              id="ex-muscle"
              value={muscle}
              onChange={(e) => {
                setMuscle(e.target.value as MuscleGroup | "all");
                setPage(0);
              }}
            >
              <option value="all">All</option>
              {MUSCLE_GROUPS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ex-diff">Difficulty</Label>
            <Select
              id="ex-diff"
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value as Difficulty | "all");
                setPage(0);
              }}
            >
              <option value="all">All</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="ex-eq">Equipment</Label>
            <Select
              id="ex-eq"
              value={equipment}
              onChange={(e) => {
                setEquipment(e.target.value as Equipment | "all");
                setPage(0);
              }}
            >
              <option value="all">All</option>
              {[
                "barbell",
                "dumbbell",
                "kettlebell",
                "cable",
                "machine",
                "bodyweight",
                "band",
                "pull-up-bar",
                "bench",
                "cardio-machine",
              ].map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </Select>
          </div>
          <div className="wo-filters__fav">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={favoritesOnly}
                onChange={(e) => {
                  setFavoritesOnly(e.target.checked);
                  setPage(0);
                }}
              />
              Favorites only
            </label>
          </div>
        </div>
      </Panel>

      <div className="wo-exercises-layout">
        <div className="space-y-3">
          <div className="wo-exercises-grid">
            {pageItems.map((exercise) => {
              const fav = state.store.favorites.includes(exercise.id);
              const thumb = getExerciseGifUrl(exercise.id);
              return (
                <button
                  key={exercise.id}
                  type="button"
                  className={`wo-exercise-card text-left ${
                    selected?.id === exercise.id ? "is-selected" : ""
                  }`}
                  onClick={() =>
                    dispatch({ type: "VIEW_EXERCISE", exerciseId: exercise.id })
                  }
                >
                  <div className="wo-exercise-card__media">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        className="wo-exercise-card__thumb"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="wo-exercise-card__thumb" aria-hidden />
                    )}
                    <div className="wo-exercise-card__body">
                      <div className="flex items-start justify-between gap-2">
                        <div className="wo-exercise-card__title">{exercise.name}</div>
                        <div className="flex shrink-0 items-center gap-1">
                          {fav ? <Badge>★</Badge> : null}
                        </div>
                      </div>
                      <div className="wo-muted mt-1 text-xs capitalize">
                        {exercise.primaryMuscles.join(", ")} · {exercise.difficulty}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {pageItems.length === 0 ? (
            <EmptyState title="No matches" body="Try clearing a filter." />
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <Button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>
            <span className="wo-muted text-xs">
              Page {page + 1} / {pageCount} · {filtered.length} exercises
            </span>
            <Button
              disabled={page + 1 >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "wo-exercises-detail",
            present ? "is-open" : "is-empty",
            active && "is-active",
          )}
        >
          <button
            type="button"
            className="wo-exercises-detail__backdrop"
            aria-label="Close exercise detail"
            onClick={() => dispatch({ type: "CLEAR_EXERCISE" })}
          />
          <Panel className="wo-exercises-detail__panel">
            <div className="wo-sheet-handle" aria-hidden />
            {!display || (!selected && !present) ? (
              <div className="wo-exercises-detail__desktop-empty">
                <EmptyState
                  title="Select an exercise"
                  body="Open any card to view form cues, mistakes, substitutions, and demos."
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="wo-exercises-detail__toolbar">
                  <Button
                    className="wo-exercises-detail__back"
                    onClick={() => dispatch({ type: "CLEAR_EXERCISE" })}
                  >
                    ← Back
                  </Button>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold sm:text-xl">{display.name}</h3>
                    <p className="wo-muted text-sm capitalize">
                      {display.movementPattern} · {display.equipment.join(", ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() =>
                        dispatch({
                          type: "TOGGLE_FAVORITE",
                          exerciseId: display.id,
                        })
                      }
                    >
                      {state.store.favorites.includes(display.id)
                        ? "Unfavorite"
                        : "Favorite"}
                    </Button>
                    <Button
                      onClick={() =>
                        setCompareIds((ids) =>
                          ids.includes(display.id)
                            ? ids
                            : [...ids.slice(-1), display.id],
                        )
                      }
                    >
                      Compare
                    </Button>
                  </div>
                </div>

                <ExerciseScene exercise={display} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <h4 className="mb-1 font-semibold">Setup</h4>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {display.setup.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold">Steps</h4>
                    <ol className="list-decimal space-y-1 pl-5 text-sm">
                      {display.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold">Form cues</h4>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {display.formCues.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold">Common mistakes</h4>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {display.commonMistakes.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <p className="text-sm">
                  <strong>Breathing:</strong> {display.breathing}
                </p>
                <p className="text-sm">
                  <strong>Tempo:</strong> {display.tempo}
                </p>

                <div className="flex flex-wrap gap-2">
                  {display.regressions.map((r) => (
                    <Badge key={r}>Regression: {r}</Badge>
                  ))}
                  {display.progressions.map((p) => (
                    <Badge key={p}>Progression: {p}</Badge>
                  ))}
                </div>

                <div>
                  <h4 className="mb-1 font-semibold">Substitutions</h4>
                  <p className="text-sm">{display.substitutions.join(" · ")}</p>
                </div>

                <div>
                  <h4 className="mb-1 font-semibold">Safety</h4>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {display.safetyNotes.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                  <p className="wo-muted mt-2 text-xs">
                    Educational guide only. Stop with sharp pain and consult a qualified professional when needed.
                  </p>
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>

      {compare.length > 0 ? (
        <Panel>
          <SectionTitle title="Compare" />
          <div className="grid gap-3 md:grid-cols-2">
            {compare.map((exercise) =>
              exercise ? (
                <div key={exercise.id} className="wo-exercise-card">
                  <div className="font-medium">{exercise.name}</div>
                  <p className="wo-muted text-xs capitalize">
                    {exercise.primaryMuscles.join(", ")} · {exercise.difficulty}
                  </p>
                  <p className="mt-2 text-sm">{exercise.formCues[0]}</p>
                </div>
              ) : null,
            )}
          </div>
        </Panel>
      ) : null}

      {state.store.recentlyViewed.length > 0 ? (
        <Panel>
          <SectionTitle title="Recently viewed" />
          <div className="flex flex-wrap gap-2">
            {state.store.recentlyViewed.slice(0, 10).map((id) => {
              const exercise = EXERCISES.find((e) => e.id === id);
              if (!exercise) return null;
              return (
                <Button
                  key={id}
                  onClick={() =>
                    dispatch({ type: "VIEW_EXERCISE", exerciseId: id })
                  }
                >
                  {exercise.name}
                </Button>
              );
            })}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
