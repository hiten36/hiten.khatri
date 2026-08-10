import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  WORKOUT_STORAGE_KEY,
  readWorkoutStore,
} from "../../../utils/workout-storage";
import {
  initialUiState,
  persistStore,
  workoutReducer,
  type WorkoutAction,
  type WorkoutUiState,
} from "./workout-reducer";

type WorkoutContextValue = {
  state: WorkoutUiState;
  dispatch: Dispatch<WorkoutAction>;
};

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workoutReducer, initialUiState);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    dispatch({ type: "HYDRATE", store: readWorkoutStore() });
  }, []);

  useEffect(() => {
    if (!state.ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistStore(state.store);
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state.ready, state.store]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== WORKOUT_STORAGE_KEY || !event.newValue) return;
      try {
        dispatch({ type: "HYDRATE", store: readWorkoutStore() });
      } catch {
        // ignore corrupt external writes
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkout must be used within WorkoutProvider");
  return ctx;
}

export function useWorkoutStore() {
  return useWorkout().state.store;
}

export function useWorkoutDispatch() {
  return useWorkout().dispatch;
}

export function useSetTab() {
  const dispatch = useWorkoutDispatch();
  return useCallback(
    (tab: WorkoutUiState["tab"]) => dispatch({ type: "SET_TAB", tab }),
    [dispatch],
  );
}
