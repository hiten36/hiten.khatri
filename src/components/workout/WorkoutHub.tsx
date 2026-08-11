import {
  Activity,
  ArrowLeft,
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  Moon,
  Sparkles,
  Sun,
  Timer,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { HubTab } from "./types";
import { WorkoutProvider, useSetTab, useWorkout } from "./state/WorkoutContext";
import { DashboardView } from "./dashboard/DashboardView";
import { PlansView } from "./plans/PlansView";
import { TodayView } from "./session/TodayView";
import { ProgressView } from "./progress/ProgressView";
import { ExercisesView } from "./exercises/ExercisesView";
import { CoachView } from "./coach/CoachView";
import { cn } from "../../utils/cn";
import {
  applyWoTheme,
  getStoredWoTheme,
  type WoTheme,
} from "../../utils/workout-theme";

const TABS: Array<{
  id: HubTab;
  label: string;
  short: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { id: "plans", label: "My Plans", short: "Plans", icon: ClipboardList },
  { id: "today", label: "Today", short: "Today", icon: Timer },
  { id: "progress", label: "Progress", short: "Stats", icon: Activity },
  { id: "exercises", label: "Exercises", short: "Moves", icon: Dumbbell },
  { id: "coach", label: "Coach", short: "Coach", icon: Sparkles },
];

const TAB_META: Record<HubTab, { title: string; blurb: string }> = {
  dashboard: { title: "Home", blurb: "Overview & quick start" },
  plans: { title: "Plans", blurb: "Build your program" },
  today: { title: "Today", blurb: "Train & log sets" },
  progress: { title: "Progress", blurb: "PRs & trends" },
  exercises: { title: "Exercises", blurb: "Form & catalogue" },
  coach: { title: "Coach", blurb: "Get a recommended plan" },
};

function HubShell() {
  const { state, dispatch } = useWorkout();
  const setTab = useSetTab();
  const [hashReady, setHashReady] = useState(false);
  const [theme, setTheme] = useState<WoTheme>("light");

  useEffect(() => {
    const initial = getStoredWoTheme();
    setTheme(initial);
    applyWoTheme(initial);
    return () => {
      delete document.documentElement.dataset.woTheme;
    };
  }, []);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "") as HubTab;
      if (TABS.some((t) => t.id === hash)) setTab(hash);
    };
    applyHash();
    setHashReady(true);
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [setTab]);

  useEffect(() => {
    if (!hashReady) return;
    if (window.location.hash.replace("#", "") !== state.tab) {
      window.history.replaceState(null, "", `#${state.tab}`);
    }
  }, [state.tab, hashReady]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [state.tab]);

  const goTab = (id: HubTab) => {
    if (id !== "exercises") dispatch({ type: "CLEAR_EXERCISE" });
    setTab(id);
  };

  const toggleTheme = () => {
    const next: WoTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyWoTheme(next);
    dispatch({ type: "SET_PREFERENCES", preferences: { theme: next } });
  };

  const meta = TAB_META[state.tab];
  const activeSession = state.store.sessions.find(
    (s) => s.id === state.store.activeSessionId && s.status === "in-progress",
  );

  if (!state.ready) {
    return (
      <div className="wo-hub wo-hub--loading">
        <div className="wo-hub__loader">Loading…</div>
      </div>
    );
  }

  return (
    <div className="wo-hub" data-theme={theme} data-tab={state.tab}>
      <header className="wo-topbar">
        <a href="/" className="wo-topbar__icon-btn" aria-label="Back to portfolio">
          <ArrowLeft className="h-5 w-5" />
        </a>
        <div className="wo-topbar__titles">
          <h1 className="wo-topbar__title">{meta.title}</h1>
          <p className="wo-topbar__blurb">{meta.blurb}</p>
        </div>
        <button
          type="button"
          className="wo-theme-toggle"
          onClick={toggleTheme}
          aria-label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          <span className="wo-theme-toggle__icons" aria-hidden>
            <Sun className="icon-sun" />
            <Moon className="icon-moon" />
          </span>
          <span className="wo-theme-toggle__thumb" />
        </button>
      </header>

      <div className="wo-hub__shell">
        <div className="wo-hub__body">
          <nav className="wo-side-nav" aria-label="Workout sections">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={cn("wo-nav-item", state.tab === tab.id && "is-active")}
                  onClick={() => goTab(tab.id)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <main className="wo-hub__main" id="wo-main">
            {state.tab === "dashboard" ? <DashboardView /> : null}
            {state.tab === "plans" ? <PlansView /> : null}
            {state.tab === "today" ? <TodayView /> : null}
            {state.tab === "progress" ? <ProgressView /> : null}
            {state.tab === "exercises" ? <ExercisesView /> : null}
            {state.tab === "coach" ? <CoachView /> : null}
          </main>
        </div>
      </div>

      <nav className="wo-bottom-nav" aria-label="Workout mobile sections">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isToday = tab.id === "today";
          return (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "wo-bottom-nav__item",
                isToday && "wo-bottom-nav__item--primary",
                state.tab === tab.id && "is-active",
              )}
              onClick={() => goTab(tab.id)}
            >
              <span className="wo-bottom-nav__icon-wrap">
                <Icon className="wo-bottom-nav__icon" />
                {isToday && activeSession ? (
                  <span className="wo-bottom-nav__dot" aria-hidden />
                ) : null}
              </span>
              <span>{tab.short}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default function WorkoutHub() {
  return (
    <WorkoutProvider>
      <HubShell />
    </WorkoutProvider>
  );
}
