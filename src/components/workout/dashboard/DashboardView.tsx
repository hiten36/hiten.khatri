import { useMemo } from "react";
import { EXERCISE_BY_ID } from "../../../data/exercises";
import {
  adherencePercent,
  computeStreak,
  sessionVolume,
  weeklyFrequency,
} from "../../../utils/workout-analytics";
import { useSetTab, useWorkout } from "../state/WorkoutContext";
import { Badge, Button, EmptyState, Panel, SectionTitle, StatCard } from "../shared/ui";

export function DashboardView() {
  const { state, dispatch } = useWorkout();
  const setTab = useSetTab();
  const { store } = state;

  const stats = useMemo(() => {
    const completed = store.sessions.filter((s) => s.status === "completed");
    const volume = completed.reduce((sum, s) => sum + sessionVolume(s), 0);
    const plan = store.plans.find((p) => p.id === store.activePlanId);
    return {
      workouts: completed.length,
      volume: Math.round(volume),
      streak: computeStreak(completed, Date.now(), store.streakFreezeUsedAt),
      week: weeklyFrequency(store.sessions),
      adherence: adherencePercent(
        store.sessions,
        plan?.daysPerWeek ?? store.questionnaire?.daysPerWeek ?? 3,
      ),
      prs: store.prs.length,
      planName: plan?.name ?? "No active plan",
    };
  }, [store]);

  const recent = [...store.sessions]
    .filter((s) => s.status === "completed")
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
    .slice(0, 5);

  const canFreeze =
    !store.streakFreezeUsedAt ||
    Date.now() - store.streakFreezeUsedAt > 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Dashboard"
        subtitle="Your local training hub — plans, sessions, and PRs stay in this browser."
        action={
          <Button variant="primary" onClick={() => setTab("today")}>
            Start workout
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Workouts" value={stats.workouts} />
        <StatCard label="Streak" value={`${stats.streak}d`} hint="Training days" />
        <StatCard label="This week" value={stats.week} hint="Sessions" />
        <StatCard label="Total volume" value={stats.volume} hint={store.preferences.units} />
        <StatCard label="Adherence" value={`${stats.adherence}%`} />
        <StatCard label="PRs" value={stats.prs} />
        <StatCard label="Active plan" value={stats.planName} />
        <StatCard label="Favorites" value={store.favorites.length} hint="Saved exercises" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <SectionTitle title="Quick actions" />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setTab("coach")}>Get a plan</Button>
            <Button onClick={() => setTab("plans")}>Edit plans</Button>
            <Button onClick={() => setTab("exercises")}>Browse exercises</Button>
            <Button onClick={() => setTab("progress")}>View progress</Button>
            {canFreeze ? (
              <Button onClick={() => dispatch({ type: "USE_STREAK_FREEZE" })}>
                Use streak freeze
              </Button>
            ) : null}
          </div>
          <p className="wo-muted mt-3 text-xs">
            Tip: use Coach if you want a recommended program from a short questionnaire.
          </p>
        </Panel>

        <Panel>
          <SectionTitle title="Recent sessions" />
          {recent.length === 0 ? (
            <EmptyState
              title="No sessions yet"
              body="Complete your first workout to unlock streaks, PRs, and charts."
              action={
                <Button variant="primary" onClick={() => setTab("today")}>
                  Go to Today
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {recent.map((session) => (
                <li key={session.id} className="wo-list-row">
                  <div>
                    <div className="font-medium">{session.name}</div>
                    <div className="wo-muted text-xs">
                      {new Date(session.endedAt ?? session.startedAt).toLocaleString()}
                    </div>
                  </div>
                  <Badge>{Math.round(sessionVolume(session))} vol</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {store.prs.length > 0 ? (
        <Panel>
          <SectionTitle title="Latest PRs" />
          <ul className="space-y-2">
            {store.prs
              .slice(-6)
              .reverse()
              .map((pr) => (
                <li key={pr.id} className="wo-list-row">
                  <div>
                    <div className="font-medium">
                      {EXERCISE_BY_ID[pr.exerciseId]?.name ?? pr.exerciseId}
                    </div>
                    <div className="wo-muted text-xs">
                      {pr.kind} · {new Date(pr.achievedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge>
                    {pr.value}
                    {pr.secondaryValue != null ? ` × ${pr.secondaryValue}` : ""}
                  </Badge>
                </li>
              ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
