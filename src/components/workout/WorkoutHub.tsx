import {
  Activity,
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

  const toggleTheme = () => {
    const next: WoTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyWoTheme(next);
    dispatch({ type: "SET_PREFERENCES", preferences: { theme: next } });
  };

  if (!state.ready) {
    return (
      <div className="wo-hub flex min-h-[60vh] items-center justify-center text-sm text-[var(--wo-text-soft)]">
        Loading workout hub…
      </div>
    );
  }

  return (
    <div className="wo-hub" data-theme={theme}>
      <div className="wo-hub__shell">
        <header className="wo-hub__header">
          <div className="wo-hub__header-copy">
            <p className="wo-hub__eyebrow">Local training OS</p>
            <h1 className="wo-hub__title">Workout Hub</h1>
            <p className="wo-hub__subtitle">
              Plans, sessions, PRs, and form guides — saved in your browser.
            </p>
          </div>
          <div className="wo-hub__header-actions">
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
            <a href="/" className="wo-btn wo-btn--secondary wo-hub__back">
              ← Portfolio
            </a>
          </div>
        </header>

        <div className="wo-hub__body">
          <nav className="wo-side-nav" aria-label="Workout sections">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={cn("wo-nav-item", state.tab === tab.id && "is-active")}
                  onClick={() => {
                    if (tab.id !== "exercises") {
                      dispatch({ type: "CLEAR_EXERCISE" });
                    }
                    setTab(tab.id);
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <main className="wo-hub__main">
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
          return (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "wo-bottom-nav__item",
                state.tab === tab.id && "is-active",
              )}
              onClick={() => {
                if (tab.id !== "exercises") {
                  dispatch({ type: "CLEAR_EXERCISE" });
                }
                setTab(tab.id);
              }}
            >
              <Icon className="h-4 w-4" />
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
