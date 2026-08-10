import type {
  BodyMeasurement,
  HubTab,
  QuestionnaireAnswers,
  Reminder,
  WorkoutPlan,
  WorkoutPreferences,
  WorkoutSession,
  WorkoutStore,
} from "../types";
import {
  createEmptyStore,
  newId,
  readWorkoutStore,
  writeWorkoutStore,
} from "../../../utils/workout-storage";
import { detectPrsForSession } from "../../../utils/workout-analytics";

export type WorkoutAction =
  | { type: "HYDRATE"; store: WorkoutStore }
  | { type: "SET_TAB"; tab: HubTab }
  | { type: "SET_PREFERENCES"; preferences: Partial<WorkoutPreferences> }
  | { type: "SAVE_QUESTIONNAIRE"; answers: QuestionnaireAnswers }
  | { type: "UPSERT_PLAN"; plan: WorkoutPlan }
  | { type: "DELETE_PLAN"; planId: string }
  | { type: "SET_ACTIVE_PLAN"; planId: string | null }
  | { type: "UPSERT_SESSION"; session: WorkoutSession }
  | { type: "SET_ACTIVE_SESSION"; sessionId: string | null }
  | { type: "COMPLETE_SESSION"; session: WorkoutSession }
  | { type: "ADD_MEASUREMENT"; measurement: BodyMeasurement }
  | { type: "DELETE_MEASUREMENT"; id: string }
  | { type: "TOGGLE_FAVORITE"; exerciseId: string }
  | { type: "VIEW_EXERCISE"; exerciseId: string }
  | { type: "CLEAR_EXERCISE" }
  | { type: "UPSERT_REMINDER"; reminder: Reminder }
  | { type: "DELETE_REMINDER"; id: string }
  | { type: "UNLOCK_ACHIEVEMENT"; achievementId: string }
  | { type: "USE_STREAK_FREEZE" }
  | { type: "REPLACE_STORE"; store: WorkoutStore }
  | { type: "RESET" };

export type WorkoutUiState = {
  store: WorkoutStore;
  tab: HubTab;
  selectedExerciseId: string | null;
  ready: boolean;
  saveError: string | null;
};

export const initialUiState: WorkoutUiState = {
  store: createEmptyStore(),
  tab: "dashboard",
  selectedExerciseId: null,
  ready: false,
  saveError: null,
};

export function workoutReducer(
  state: WorkoutUiState,
  action: WorkoutAction,
): WorkoutUiState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, store: action.store, ready: true, saveError: null };
    case "SET_TAB":
      return { ...state, tab: action.tab };
    case "SET_PREFERENCES":
      return {
        ...state,
        store: {
          ...state.store,
          preferences: { ...state.store.preferences, ...action.preferences },
        },
      };
    case "SAVE_QUESTIONNAIRE":
      return {
        ...state,
        store: { ...state.store, questionnaire: action.answers },
      };
    case "UPSERT_PLAN": {
      const plans = state.store.plans.filter((p) => p.id !== action.plan.id);
      plans.push(action.plan);
      return {
        ...state,
        store: {
          ...state.store,
          plans,
          activePlanId: state.store.activePlanId ?? action.plan.id,
        },
      };
    }
    case "DELETE_PLAN": {
      const plans = state.store.plans.filter((p) => p.id !== action.planId);
      return {
        ...state,
        store: {
          ...state.store,
          plans,
          activePlanId:
            state.store.activePlanId === action.planId
              ? plans[0]?.id ?? null
              : state.store.activePlanId,
        },
      };
    }
    case "SET_ACTIVE_PLAN":
      return {
        ...state,
        store: { ...state.store, activePlanId: action.planId },
      };
    case "UPSERT_SESSION": {
      const sessions = state.store.sessions.filter((s) => s.id !== action.session.id);
      sessions.push(action.session);
      return {
        ...state,
        store: {
          ...state.store,
          sessions,
          activeSessionId:
            action.session.status === "in-progress" ||
            action.session.status === "paused"
              ? action.session.id
              : state.store.activeSessionId === action.session.id
                ? null
                : state.store.activeSessionId,
        },
      };
    }
    case "SET_ACTIVE_SESSION":
      return {
        ...state,
        store: { ...state.store, activeSessionId: action.sessionId },
      };
    case "COMPLETE_SESSION": {
      const prs = detectPrsForSession(action.session, state.store.prs);
      const sessions = state.store.sessions.filter((s) => s.id !== action.session.id);
      sessions.push(action.session);
      const achievementIds = new Set(state.store.achievements.map((a) => a.id));
      const achievements = [...state.store.achievements];
      if (sessions.filter((s) => s.status === "completed").length === 1) {
        if (!achievementIds.has("first-workout")) {
          achievements.push({ id: "first-workout", unlockedAt: Date.now() });
        }
      }
      if (prs.length > 0 && !achievementIds.has("first-pr")) {
        achievements.push({ id: "first-pr", unlockedAt: Date.now() });
      }
      return {
        ...state,
        store: {
          ...state.store,
          sessions,
          prs: [...state.store.prs, ...prs],
          achievements,
          activeSessionId: null,
        },
      };
    }
    case "ADD_MEASUREMENT":
      return {
        ...state,
        store: {
          ...state.store,
          measurements: [...state.store.measurements, action.measurement],
        },
      };
    case "DELETE_MEASUREMENT":
      return {
        ...state,
        store: {
          ...state.store,
          measurements: state.store.measurements.filter((m) => m.id !== action.id),
        },
      };
    case "TOGGLE_FAVORITE": {
      const has = state.store.favorites.includes(action.exerciseId);
      return {
        ...state,
        store: {
          ...state.store,
          favorites: has
            ? state.store.favorites.filter((id) => id !== action.exerciseId)
            : [...state.store.favorites, action.exerciseId],
        },
        selectedExerciseId: action.exerciseId,
      };
    }
    case "VIEW_EXERCISE": {
      const recent = [
        action.exerciseId,
        ...state.store.recentlyViewed.filter((id) => id !== action.exerciseId),
      ].slice(0, 20);
      return {
        ...state,
        selectedExerciseId: action.exerciseId,
        store: { ...state.store, recentlyViewed: recent },
      };
    }
    case "CLEAR_EXERCISE":
      return { ...state, selectedExerciseId: null };
    case "UPSERT_REMINDER": {
      const reminders = state.store.reminders.filter((r) => r.id !== action.reminder.id);
      reminders.push(action.reminder);
      return { ...state, store: { ...state.store, reminders } };
    }
    case "DELETE_REMINDER":
      return {
        ...state,
        store: {
          ...state.store,
          reminders: state.store.reminders.filter((r) => r.id !== action.id),
        },
      };
    case "UNLOCK_ACHIEVEMENT": {
      if (state.store.achievements.some((a) => a.id === action.achievementId)) {
        return state;
      }
      return {
        ...state,
        store: {
          ...state.store,
          achievements: [
            ...state.store.achievements,
            { id: action.achievementId, unlockedAt: Date.now() },
          ],
        },
      };
    }
    case "USE_STREAK_FREEZE":
      return {
        ...state,
        store: { ...state.store, streakFreezeUsedAt: Date.now() },
      };
    case "REPLACE_STORE":
      return { ...state, store: action.store, saveError: null };
    case "RESET":
      return { ...state, store: createEmptyStore(), selectedExerciseId: null };
    default:
      return state;
  }
}

export function persistStore(store: WorkoutStore) {
  return writeWorkoutStore(store);
}

export function loadStore() {
  return readWorkoutStore();
}

export function createPlanShell(
  partial: Partial<WorkoutPlan> & Pick<WorkoutPlan, "name" | "goal">,
): WorkoutPlan {
  const now = Date.now();
  return {
    id: newId("plan"),
    description: "",
    source: "custom",
    templateId: null,
    daysPerWeek: 3,
    estimatedMinutes: 45,
    experience: "beginner",
    equipment: ["bodyweight"],
    days: [],
    archived: false,
    createdAt: now,
    updatedAt: now,
    deloadEveryWeeks: null,
    ...partial,
  };
}
