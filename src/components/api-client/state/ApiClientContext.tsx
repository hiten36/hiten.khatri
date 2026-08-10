import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type { ApiClientStore, OpenTab } from "../types";
import { createEmptyStore } from "../../../utils/api-client-db";
import {
  apiClientReducer,
  loadInitialStore,
  persistStore,
  type ApiClientAction,
} from "./reducer";

interface ApiClientContextValue {
  store: ApiClientStore;
  ready: boolean;
  dispatch: (action: ApiClientAction) => void;
  activeTab: OpenTab | null;
  saveError: string | null;
}

const ApiClientContext = createContext<ApiClientContextValue | null>(null);

export function ApiClientProvider({ children }: { children: ReactNode }) {
  const [store, dispatch] = useReducer(apiClientReducer, createEmptyStore());
  const [ready, setReady] = useReducer(() => true, false);
  const [saveError, setSaveError] = useReducer(
    (_: string | null, next: string | null) => next,
    null as string | null,
  );
  const hydrated = useRef(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadInitialStore().then((loaded) => {
      if (cancelled) return;
      dispatch({ type: "HYDRATE", store: loaded });
      hydrated.current = true;
      setReady();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void persistStore(store).then((result) => {
        setSaveError(result.ok ? null : result.error ?? "Failed to save");
      });
    }, 400);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [store]);

  const activeTab = useMemo(
    () => store.tabs.find((tab) => tab.id === store.activeTabId) ?? null,
    [store.tabs, store.activeTabId],
  );

  const value = useMemo(
    () => ({
      store,
      ready,
      dispatch,
      activeTab,
      saveError,
    }),
    [store, ready, activeTab, saveError],
  );

  return createElement(ApiClientContext.Provider, { value }, children);
}

export function useApiClient() {
  const ctx = useContext(ApiClientContext);
  if (!ctx) throw new Error("useApiClient must be used within ApiClientProvider");
  return ctx;
}

export function useActiveEnvironment() {
  const { store } = useApiClient();
  return (
    store.environments.find(
      (env) => env.id === store.preferences.activeEnvironmentId,
    ) ?? null
  );
}

export function useStableDispatch() {
  const { dispatch } = useApiClient();
  return useCallback((action: ApiClientAction) => dispatch(action), [dispatch]);
}
