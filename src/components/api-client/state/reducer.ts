import type {
  ApiClientPreferences,
  ApiClientStore,
  Collection,
  Environment,
  ExecuteResponse,
  HistoryEntry,
  HttpRequestDraft,
  OpenTab,
  SavedRequest,
  SidebarTab,
} from "../types";
import {
  HISTORY_BODY_PREVIEW_LIMIT,
  HISTORY_LIMIT,
} from "../types";
import {
  createEmptyStore,
  createRequestDraft,
  duplicateCollection,
  newId,
  readApiClientStore,
  writeApiClientStore,
} from "../../../utils/api-client-db";

export type ApiClientAction =
  | { type: "HYDRATE"; store: ApiClientStore }
  | { type: "SET_PREFERENCES"; patch: Partial<ApiClientPreferences> }
  | { type: "SET_SIDEBAR_TAB"; tab: SidebarTab }
  | { type: "SET_ACTIVE_TAB"; tabId: string }
  | { type: "OPEN_TAB"; tab?: OpenTab; activate?: boolean }
  | { type: "CLOSE_TAB"; tabId: string }
  | { type: "UPDATE_ACTIVE_DRAFT"; patch: Partial<HttpRequestDraft> }
  | { type: "REPLACE_ACTIVE_DRAFT"; draft: HttpRequestDraft; dirty?: boolean }
  | { type: "MARK_ACTIVE_CLEAN"; originRequestId?: string | null }
  | { type: "UPSERT_COLLECTION"; collection: Collection }
  | { type: "DELETE_COLLECTION"; collectionId: string }
  | { type: "DUPLICATE_COLLECTION"; collectionId: string }
  | { type: "SAVE_REQUEST_TO_COLLECTION"; collectionId: string; folderId?: string | null; request?: HttpRequestDraft }
  | { type: "DELETE_REQUEST"; collectionId: string; requestId: string }
  | { type: "UPSERT_ENVIRONMENT"; environment: Environment }
  | { type: "DELETE_ENVIRONMENT"; environmentId: string }
  | { type: "SET_ACTIVE_ENVIRONMENT"; environmentId: string | null }
  | { type: "PUSH_HISTORY"; entry: HistoryEntry }
  | { type: "CLEAR_HISTORY" }
  | { type: "IMPORT_COLLECTIONS"; collections: Collection[]; mode: "replace" | "merge" | "copy" }
  | { type: "RESET_WORKSPACE" };

export function createHistoryEntry(
  draft: HttpRequestDraft,
  response: ExecuteResponse,
  resolvedUrl?: string,
): HistoryEntry {
  return {
    id: newId("hist"),
    method: draft.method,
    url: resolvedUrl ?? draft.url,
    status: response.status,
    statusText: response.statusText,
    durationMs: response.durationMs,
    sizeBytes: response.sizeBytes,
    createdAt: Date.now(),
    requestSnapshot: structuredClone(draft),
    bodyPreview: (response.bodyText ?? "").slice(0, HISTORY_BODY_PREVIEW_LIMIT),
    mimeType: response.mimeType,
  };
}

export function apiClientReducer(
  state: ApiClientStore,
  action: ApiClientAction,
): ApiClientStore {
  switch (action.type) {
    case "HYDRATE":
      return action.store;

    case "SET_PREFERENCES":
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.patch,
          layout: {
            ...state.preferences.layout,
            ...(action.patch.layout ?? {}),
          },
        },
      };

    case "SET_SIDEBAR_TAB":
      return {
        ...state,
        preferences: { ...state.preferences, sidebarTab: action.tab },
      };

    case "SET_ACTIVE_TAB":
      return { ...state, activeTabId: action.tabId };

    case "OPEN_TAB": {
      const tab =
        action.tab ??
        ({
          id: newId("tab"),
          draft: createRequestDraft(),
          dirty: true,
          originRequestId: null,
        } satisfies OpenTab);
      return {
        ...state,
        tabs: [...state.tabs, tab],
        activeTabId: action.activate === false ? state.activeTabId : tab.id,
      };
    }

    case "CLOSE_TAB": {
      const tabs = state.tabs.filter((tab) => tab.id !== action.tabId);
      if (!tabs.length) {
        const empty = createEmptyStore();
        return {
          ...state,
          tabs: empty.tabs,
          activeTabId: empty.activeTabId,
        };
      }
      const activeTabId =
        state.activeTabId === action.tabId
          ? tabs[tabs.length - 1]!.id
          : state.activeTabId;
      return { ...state, tabs, activeTabId };
    }

    case "UPDATE_ACTIVE_DRAFT": {
      if (!state.activeTabId) return state;
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.id === state.activeTabId
            ? {
                ...tab,
                dirty: true,
                draft: {
                  ...tab.draft,
                  ...action.patch,
                  updatedAt: Date.now(),
                },
              }
            : tab,
        ),
      };
    }

    case "REPLACE_ACTIVE_DRAFT": {
      if (!state.activeTabId) return state;
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.id === state.activeTabId
            ? {
                ...tab,
                dirty: action.dirty ?? true,
                draft: { ...action.draft, updatedAt: Date.now() },
              }
            : tab,
        ),
      };
    }

    case "MARK_ACTIVE_CLEAN": {
      if (!state.activeTabId) return state;
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.id === state.activeTabId
            ? {
                ...tab,
                dirty: false,
                originRequestId:
                  action.originRequestId !== undefined
                    ? action.originRequestId
                    : tab.originRequestId,
              }
            : tab,
        ),
      };
    }

    case "UPSERT_COLLECTION": {
      const exists = state.collections.some((item) => item.id === action.collection.id);
      return {
        ...state,
        collections: exists
          ? state.collections.map((item) =>
              item.id === action.collection.id ? action.collection : item,
            )
          : [...state.collections, action.collection],
      };
    }

    case "DELETE_COLLECTION":
      return {
        ...state,
        collections: state.collections.filter((item) => item.id !== action.collectionId),
      };

    case "DUPLICATE_COLLECTION": {
      const source = state.collections.find((item) => item.id === action.collectionId);
      if (!source) return state;
      return {
        ...state,
        collections: [...state.collections, duplicateCollection(source)],
      };
    }

    case "SAVE_REQUEST_TO_COLLECTION": {
      const draft = action.request
        ?? state.tabs.find((tab) => tab.id === state.activeTabId)?.draft;
      if (!draft) return state;

      const collections = state.collections.map((collection) => {
        if (collection.id !== action.collectionId) return collection;
        const existingIndex = collection.requests.findIndex(
          (request) => request.id === draft.id,
        );
        const saved: SavedRequest = {
          ...structuredClone(draft),
          collectionId: collection.id,
          folderId: action.folderId ?? draft.folderId ?? null,
          order:
            existingIndex >= 0
              ? collection.requests[existingIndex]!.order
              : collection.requests.length,
          updatedAt: Date.now(),
        };

        const requests =
          existingIndex >= 0
            ? collection.requests.map((request, index) =>
                index === existingIndex ? saved : request,
              )
            : [...collection.requests, saved];

        return {
          ...collection,
          requests,
          updatedAt: Date.now(),
        };
      });

      return {
        ...state,
        collections,
        tabs: state.tabs.map((tab) =>
          tab.id === state.activeTabId
            ? {
                ...tab,
                dirty: false,
                originRequestId: draft.id,
                draft: {
                  ...tab.draft,
                  collectionId: action.collectionId,
                  folderId: action.folderId ?? tab.draft.folderId ?? null,
                },
              }
            : tab,
        ),
      };
    }

    case "DELETE_REQUEST":
      return {
        ...state,
        collections: state.collections.map((collection) =>
          collection.id === action.collectionId
            ? {
                ...collection,
                requests: collection.requests.filter(
                  (request) => request.id !== action.requestId,
                ),
                updatedAt: Date.now(),
              }
            : collection,
        ),
      };

    case "UPSERT_ENVIRONMENT": {
      const exists = state.environments.some((item) => item.id === action.environment.id);
      return {
        ...state,
        environments: exists
          ? state.environments.map((item) =>
              item.id === action.environment.id ? action.environment : item,
            )
          : [...state.environments, action.environment],
      };
    }

    case "DELETE_ENVIRONMENT":
      return {
        ...state,
        environments: state.environments.filter(
          (item) => item.id !== action.environmentId,
        ),
        preferences: {
          ...state.preferences,
          activeEnvironmentId:
            state.preferences.activeEnvironmentId === action.environmentId
              ? null
              : state.preferences.activeEnvironmentId,
        },
      };

    case "SET_ACTIVE_ENVIRONMENT":
      return {
        ...state,
        preferences: {
          ...state.preferences,
          activeEnvironmentId: action.environmentId,
        },
      };

    case "PUSH_HISTORY":
      return {
        ...state,
        history: [action.entry, ...state.history].slice(0, HISTORY_LIMIT),
      };

    case "CLEAR_HISTORY":
      return { ...state, history: [] };

    case "IMPORT_COLLECTIONS": {
      if (action.mode === "replace") {
        return { ...state, collections: action.collections };
      }

      if (action.mode === "copy") {
        return {
          ...state,
          collections: [
            ...state.collections,
            ...action.collections.map((collection) => ({
              ...collection,
              name: state.collections.some((item) => item.name === collection.name)
                ? `${collection.name} Import`
                : collection.name,
            })),
          ],
        };
      }

      // merge by name
      const next = [...state.collections];
      for (const incoming of action.collections) {
        const index = next.findIndex((item) => item.name === incoming.name);
        if (index === -1) {
          next.push(incoming);
        } else {
          const current = next[index]!;
          next[index] = {
            ...current,
            folders: [...current.folders, ...incoming.folders],
            requests: [
              ...current.requests,
              ...incoming.requests.map((request, order) => ({
                ...request,
                collectionId: current.id,
                order: current.requests.length + order,
              })),
            ],
            updatedAt: Date.now(),
          };
        }
      }
      return { ...state, collections: next };
    }

    case "RESET_WORKSPACE":
      return createEmptyStore();

    default:
      return state;
  }
}

export async function loadInitialStore(): Promise<ApiClientStore> {
  return readApiClientStore();
}

export async function persistStore(store: ApiClientStore) {
  return writeApiClientStore(store);
}
