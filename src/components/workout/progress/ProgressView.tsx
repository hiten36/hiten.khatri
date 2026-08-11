import { useMemo, useState } from "react";
import { EXERCISE_BY_ID } from "../../../data/exercises";
import {
  estimate1rm,
  muscleBalance,
  plateMath,
  sessionVolume,
  volumeTrend,
  warmupSets,
} from "../../../utils/workout-analytics";
import { exportWorkoutStore, importWorkoutStore, newId, resetWorkoutStore } from "../../../utils/workout-storage";
import { useWorkout } from "../state/WorkoutContext";
import {
  Badge,
  Button,
  Input,
  Label,
  Panel,
  SectionTitle,
  Select,
  StatCard,
} from "../shared/ui";

function LineChart({
  data,
}: {
  data: Array<{ date: string; volume: number }>;
}) {
  const max = Math.max(...data.map((d) => d.volume), 1);
  const width = 560;
  const height = 160;
  const points = data
    .map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * (width - 20) + 10;
      const y = height - 20 - (d.volume / max) * (height - 40);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Volume trend">
      <polyline
        fill="none"
        stroke="#ea580c"
        strokeWidth="2.5"
        points={points}
      />
    </svg>
  );
}

function Heatmap({ sessions }: { sessions: { endedAt?: number | null; startedAt: number }[] }) {
  const days = 35;
  const map = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const s of sessions) {
    const key = new Date(s.endedAt ?? s.startedAt).toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return (
    <div className="flex flex-wrap gap-1" aria-label="Workout heatmap">
      {[...map.entries()].map(([date, count]) => (
        <div
          key={date}
          title={`${date}: ${count}`}
          className="h-4 w-4 rounded-sm"
          style={{
            background:
              count === 0
                ? "var(--wo-border)"
                : `color-mix(in srgb, #ea580c ${30 + count * 25}%, transparent)`,
          }}
        />
      ))}
    </div>
  );
}

const ACHIEVEMENT_META: Record<string, string> = {
  "first-workout": "First workout logged",
  "first-pr": "First personal record",
};

export function ProgressView() {
  const { state, dispatch } = useWorkout();
  const { store } = state;
  const [targetWeight, setTargetWeight] = useState(100);
  const [oneRmWeight, setOneRmWeight] = useState(80);
  const [oneRmReps, setOneRmReps] = useState(5);
  const [measureWeight, setMeasureWeight] = useState("");

  const completed = store.sessions.filter((s) => s.status === "completed");
  const trend = useMemo(() => volumeTrend(store.sessions), [store.sessions]);
  const balance = useMemo(() => muscleBalance(store.sessions), [store.sessions]);
  const plates = plateMath(
    targetWeight,
    store.preferences.plateBarWeightKg,
    store.preferences.availablePlatesKg,
  );
  const warm = warmupSets(targetWeight);

  const downloadBackup = () => {
    const blob = new Blob([exportWorkoutStore(store)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workout-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="wo-page space-y-4">
      <div className="wo-page__intro wo-page__intro--desktop">
        <SectionTitle
          title="Progress"
          subtitle="Charts, PRs, measurements, calculators, reminders, and local backups."
        />
      </div>

      <div className="wo-stat-grid">
        <StatCard
          label="Completed"
          value={completed.length}
        />
        <StatCard
          label="Volume (28d)"
          value={Math.round(trend.reduce((s, d) => s + d.volume, 0))}
        />
        <StatCard label="PRs" value={store.prs.length} />
        <StatCard
          label="Achievements"
          value={store.achievements.length}
        />
      </div>

      <Panel>
        <SectionTitle title="Volume trend" />
        <LineChart data={trend} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <SectionTitle title="Training heatmap" />
          <Heatmap sessions={completed} />
        </Panel>
        <Panel>
          <SectionTitle title="Muscle balance" />
          <ul className="space-y-1">
            {Object.entries(balance)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([muscle, value]) => (
                <li key={muscle} className="wo-list-row">
                  <span className="capitalize">{muscle}</span>
                  <Badge>{Math.round(value)}</Badge>
                </li>
              ))}
            {Object.keys(balance).length === 0 ? (
              <p className="wo-muted text-sm">Complete workouts to populate this.</p>
            ) : null}
          </ul>
        </Panel>
      </div>

      <Panel>
        <SectionTitle title="PR timeline" />
        <ul className="space-y-2">
          {[...store.prs]
            .sort((a, b) => b.achievedAt - a.achievedAt)
            .slice(0, 12)
            .map((pr) => (
              <li key={pr.id} className="wo-list-row">
                <div>
                  <div className="font-medium">
                    {EXERCISE_BY_ID[pr.exerciseId]?.name ?? pr.exerciseId}
                  </div>
                  <div className="wo-muted text-xs">
                    {pr.kind} · {new Date(pr.achievedAt).toLocaleString()}
                  </div>
                </div>
                <Badge>{pr.value}</Badge>
              </li>
            ))}
        </ul>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <SectionTitle title="Plate calculator" />
          <Label htmlFor="target-w">Target weight ({store.preferences.units})</Label>
          <Input
            id="target-w"
            type="number"
            value={targetWeight}
            onChange={(e) => setTargetWeight(Number(e.target.value) || 0)}
          />
          <p className="mt-2 text-sm">
            Per side: {plates.perSide.join(" + ") || "—"} · total {plates.total}
          </p>
        </Panel>
        <Panel>
          <SectionTitle title="Estimated 1RM" />
          <Label htmlFor="orm-w">Weight</Label>
          <Input
            id="orm-w"
            type="number"
            value={oneRmWeight}
            onChange={(e) => setOneRmWeight(Number(e.target.value) || 0)}
          />
          <Label htmlFor="orm-r">Reps</Label>
          <Input
            id="orm-r"
            type="number"
            value={oneRmReps}
            onChange={(e) => setOneRmReps(Number(e.target.value) || 0)}
          />
          <p className="mt-2 text-sm font-semibold">
            ≈ {estimate1rm(oneRmWeight, oneRmReps)} {store.preferences.units}
          </p>
        </Panel>
        <Panel>
          <SectionTitle title="Warm-up calculator" />
          <ul className="space-y-1 text-sm">
            {warm.map((w, i) => (
              <li key={i}>
                {w.weight} × {w.reps}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel>
        <SectionTitle title="Body measurements" />
        <div className="flex flex-wrap gap-2">
          <Input
            type="number"
            placeholder="Weight"
            value={measureWeight}
            onChange={(e) => setMeasureWeight(e.target.value)}
          />
          <Button
            variant="primary"
            onClick={() => {
              if (!measureWeight) return;
              dispatch({
                type: "ADD_MEASUREMENT",
                measurement: {
                  id: newId("meas"),
                  date: Date.now(),
                  weightKg: Number(measureWeight),
                },
              });
              setMeasureWeight("");
            }}
          >
            Add
          </Button>
        </div>
        <ul className="mt-3 space-y-1">
          {[...store.measurements]
            .sort((a, b) => b.date - a.date)
            .slice(0, 8)
            .map((m) => (
              <li key={m.id} className="wo-list-row">
                <span>
                  {new Date(m.date).toLocaleDateString()} · {m.weightKg} kg
                </span>
                <Button
                  variant="ghost"
                  onClick={() => dispatch({ type: "DELETE_MEASUREMENT", id: m.id })}
                >
                  Delete
                </Button>
              </li>
            ))}
        </ul>
      </Panel>

      <Panel>
        <SectionTitle title="Reminders & achievements" />
        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            onClick={() =>
              dispatch({
                type: "UPSERT_REMINDER",
                reminder: {
                  id: newId("rem"),
                  label: "Train today",
                  timeLocal: "18:00",
                  daysOfWeek: [1, 2, 3, 4, 5],
                  enabled: true,
                },
              })
            }
          >
            Add weekday 6pm reminder
          </Button>
        </div>
        <ul className="mb-4 space-y-1">
          {store.reminders.map((r) => (
            <li key={r.id} className="wo-list-row">
              <span>
                {r.label} · {r.timeLocal}
              </span>
              <Button
                variant="ghost"
                onClick={() => dispatch({ type: "DELETE_REMINDER", id: r.id })}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {store.achievements.map((a) => (
            <Badge key={a.id}>{ACHIEVEMENT_META[a.id] ?? a.id}</Badge>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Preferences & data" />
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor="units">Units</Label>
            <Select
              id="units"
              value={store.preferences.units}
              onChange={(e) =>
                dispatch({
                  type: "SET_PREFERENCES",
                  preferences: {
                    units: e.target.value as "kg" | "lb",
                  },
                })
              }
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="rest">Default rest (s)</Label>
            <Input
              id="rest"
              type="number"
              value={store.preferences.defaultRestSeconds}
              onChange={(e) =>
                dispatch({
                  type: "SET_PREFERENCES",
                  preferences: {
                    defaultRestSeconds: Number(e.target.value) || 90,
                  },
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="inc">Load increment</Label>
            <Input
              id="inc"
              type="number"
              value={store.preferences.loadIncrementKg}
              onChange={(e) =>
                dispatch({
                  type: "SET_PREFERENCES",
                  preferences: {
                    loadIncrementKg: Number(e.target.value) || 2.5,
                  },
                })
              }
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={downloadBackup}>Export JSON</Button>
          <label className="wo-btn wo-btn--secondary cursor-pointer">
            Import JSON
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const text = await file.text();
                  const next = importWorkoutStore(text);
                  dispatch({ type: "REPLACE_STORE", store: next });
                } catch {
                  alert("Invalid backup file");
                }
              }}
            />
          </label>
          <Button
            variant="danger"
            onClick={() => {
              if (!confirm("Reset all local workout data?")) return;
              dispatch({ type: "REPLACE_STORE", store: resetWorkoutStore() });
            }}
          >
            Reset data
          </Button>
        </div>
        <p className="wo-muted mt-3 text-xs">
          Clearing site data in your browser will delete these local records. Total session volume sample:{" "}
          {Math.round(completed.reduce((s, x) => s + sessionVolume(x), 0))}.
        </p>
      </Panel>
    </div>
  );
}
