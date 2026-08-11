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

  const activeSession = store.sessions.find(
    (s) => s.id === store.activeSessionId && s.status === "in-progress",
  );

  return (
    <div className="wo-page space-y-4">
      <div className="wo-page__intro wo-page__intro--desktop">
        <SectionTitle
          title="Dashboard"
          subtitle="Your local training hub — plans, sessions, and PRs stay in this browser."
        />
      </div>

      <section className="wo-hero-cta">
        <div className="wo-hero-cta__copy">
          <p className="wo-hero-cta__kicker">
            {activeSession ? "Session in progress" : stats.planName}
          </p>
          <h2 className="wo-hero-cta__title">
            {activeSession ? "Continue training" : "Ready to train?"}
          </h2>
          <p className="wo-hero-cta__sub">
            {activeSession
              ? activeSession.name
              : "Open Today to start a day from your plan or a quick session."}
          </p>
        </div>
        <Button variant="primary" className="wo-hero-cta__btn" onClick={() => setTab("today")}>
          {activeSession ? "Resume workout" : "Start workout"}
        </Button>
      </section>

      <div className="wo-stat-grid">
        <StatCard label="Workouts" value={stats.workouts} />
        <StatCard label="Streak" value={`${stats.streak}d`} hint="Training days" />
        <StatCard label="This week" value={stats.week} hint="Sessions" />
        <StatCard label="Volume" value={stats.volume} hint={store.preferences.units} />
        <StatCard label="Adherence" value={`${stats.adherence}%`} />
        <StatCard label="PRs" value={stats.prs} />
      </div>

      <Panel className="wo-panel--flush-mobile">
        <SectionTitle title="Quick actions" />
        <div className="wo-chip-row">
          <Button onClick={() => setTab("coach")}>Get a plan</Button>
          <Button onClick={() => setTab("plans")}>Edit plans</Button>
          <Button onClick={() => setTab("exercises")}>Browse moves</Button>
          <Button onClick={() => setTab("progress")}>View stats</Button>
          {canFreeze ? (
            <Button onClick={() => dispatch({ type: "USE_STREAK_FREEZE" })}>
              Streak freeze
            </Button>
          ) : null}
        </div>
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
          <ul className="wo-stack">
            {recent.map((session) => (
              <li key={session.id}>
                <button
                  type="button"
                  className="wo-list-row"
                  onClick={() => setTab("progress")}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{session.name}</div>
                    <div className="wo-muted text-xs">
                      {new Date(session.endedAt ?? session.startedAt).toLocaleString()}
                    </div>
                  </div>
                  <Badge>{Math.round(sessionVolume(session))} vol</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {store.prs.length > 0 ? (
        <Panel>
          <SectionTitle title="Latest PRs" />
          <ul className="wo-stack">
            {store.prs
              .slice()
              .sort((a, b) => b.achievedAt - a.achievedAt)
              .slice(0, 5)
              .map((pr) => (
                <li key={pr.id} className="wo-list-row">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {EXERCISE_BY_ID[pr.exerciseId]?.name ?? pr.exerciseId}
                    </div>
                    <div className="wo-muted text-xs">
                      {pr.kind} · {new Date(pr.achievedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge>{pr.value}</Badge>
                </li>
              ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
