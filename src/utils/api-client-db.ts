import { nanoid } from "nanoid";
import type {
  ApiClientPreferences,
  ApiClientStore,
  AuthConfig,
  BodyConfig,
  Collection,
  Environment,
  HistoryEntry,
  HttpRequestDraft,
  KeyValueItem,
  OpenTab,
  RequestSettings,
  SavedRequest,
} from "../components/api-client/types";
import {
  API_CLIENT_STORE_VERSION,
  HISTORY_LIMIT,
} from "../components/api-client/types";

export const API_DB_NAME = "hiten-api-client";
export const API_DB_VERSION = 1;
export const API_STORE_KEY = "workspace";
export const POSTMAN_KEY_SESSION = "hiten.api.postmanKey.v1";

export function newId(prefix = "id"): string {
  return `${prefix}_${nanoid(10)}`;
}

export function createKeyValue(
  partial?: Partial<KeyValueItem>,
): KeyValueItem {
  return {
    id: partial?.id ?? newId("kv"),
    key: partial?.key ?? "",
    value: partial?.value ?? "",
    enabled: partial?.enabled ?? true,
    description: partial?.description ?? "",
  };
}

export function createAuth(partial?: Partial<AuthConfig>): AuthConfig {
  return {
    type: partial?.type ?? "none",
    bearerToken: partial?.bearerToken ?? "",
    basicUsername: partial?.basicUsername ?? "",
    basicPassword: partial?.basicPassword ?? "",
    apiKeyName: partial?.apiKeyName ?? "X-Api-Key",
    apiKeyValue: partial?.apiKeyValue ?? "",
    apiKeyIn: partial?.apiKeyIn ?? "header",
  };
}

export function createBody(partial?: Partial<BodyConfig>): BodyConfig {
  return {
    mode: partial?.mode ?? "none",
    json: partial?.json ?? "{\n  \n}",
    text: partial?.text ?? "",
    urlencoded: partial?.urlencoded?.length
      ? partial.urlencoded
      : [createKeyValue()],
    multipart: partial?.multipart?.length
      ? partial.multipart
      : [createKeyValue()],
  };
}

export function createSettings(
  partial?: Partial<RequestSettings>,
): RequestSettings {
  return {
    followRedirects: partial?.followRedirects ?? true,
    timeoutMs: partial?.timeoutMs ?? 30_000,
  };
}

export function createRequestDraft(
  partial?: Partial<HttpRequestDraft>,
): HttpRequestDraft {
  return {
    id: partial?.id ?? newId("req"),
    name: partial?.name ?? "Untitled Request",
    method: partial?.method ?? "GET",
    url: partial?.url ?? "https://",
    params: partial?.params?.length ? partial.params : [createKeyValue()],
    headers: partial?.headers?.length ? partial.headers : [createKeyValue()],
    auth: createAuth(partial?.auth),
    body: createBody(partial?.body),
    settings: createSettings(partial?.settings),
    collectionId: partial?.collectionId ?? null,
    folderId: partial?.folderId ?? null,
    updatedAt: partial?.updatedAt ?? Date.now(),
  };
}

export function createDefaultPreferences(): ApiClientPreferences {
  return {
    theme: "light",
    activeEnvironmentId: null,
    sidebarTab: "collections",
    sidebarCollapsed: false,
    requestEditorTab: "params",
    responseViewTab: "pretty",
    layout: {
      sidebar: 28,
      request: 58,
    },
  };
}

export function createEmptyStore(): ApiClientStore {
  const draft = createRequestDraft({
    name: "Get example",
    method: "GET",
    url: "https://httpbin.org/get",
  });
  const tab: OpenTab = {
    id: newId("tab"),
    draft,
    dirty: false,
    originRequestId: null,
  };
  const environmentId = newId("env");

  return {
    version: API_CLIENT_STORE_VERSION,
    collections: [],
    environments: [
      {
        id: environmentId,
        name: "Development",
        variables: [
          createKeyValue({ key: "baseUrl", value: "https://httpbin.org" }),
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    tabs: [tab],
    activeTabId: tab.id,
    history: [],
    preferences: {
      ...createDefaultPreferences(),
      activeEnvironmentId: environmentId,
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateStore(raw: unknown): ApiClientStore | null {
  if (!isObject(raw)) return null;
  if (typeof raw.version !== "number") return null;
  if (!Array.isArray(raw.collections)) return null;
  if (!Array.isArray(raw.environments)) return null;
  if (!Array.isArray(raw.tabs)) return null;
  if (!Array.isArray(raw.history)) return null;
  if (!isObject(raw.preferences)) return null;

  const base = createEmptyStore();
  return {
    ...base,
    version: API_CLIENT_STORE_VERSION,
    collections: raw.collections as Collection[],
    environments: raw.environments as Environment[],
    tabs: (raw.tabs as OpenTab[]).length
      ? (raw.tabs as OpenTab[])
      : base.tabs,
    activeTabId: (raw.activeTabId as string | null) ?? base.activeTabId,
    history: (raw.history as HistoryEntry[]).slice(0, HISTORY_LIMIT),
    preferences: {
      ...createDefaultPreferences(),
      ...(raw.preferences as Partial<ApiClientPreferences>),
      layout: {
        ...createDefaultPreferences().layout,
        ...((raw.preferences as Partial<ApiClientPreferences>).layout ?? {}),
      },
    },
  };
}

export function migrateStore(raw: unknown): ApiClientStore {
  const validated = validateStore(raw);
  if (validated) {
    if (!validated.tabs.length) {
      const empty = createEmptyStore();
      validated.tabs = empty.tabs;
      validated.activeTabId = empty.activeTabId;
    }
    return validated;
  }
  return createEmptyStore();
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }
    const request = indexedDB.open(API_DB_NAME, API_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(API_STORE_KEY)) {
        db.createObjectStore(API_STORE_KEY);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open DB"));
  });
}

export async function readApiClientStore(): Promise<ApiClientStore> {
  try {
    const db = await openDb();
    const store = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(API_STORE_KEY, "readonly");
      const req = tx.objectStore(API_STORE_KEY).get("main");
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error ?? new Error("Failed to read store"));
    });
    db.close();
    if (!store) return createEmptyStore();
    return migrateStore(store);
  } catch {
    return createEmptyStore();
  }
}

export async function writeApiClientStore(
  store: ApiClientStore,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(API_STORE_KEY, "readwrite");
      tx.objectStore(API_STORE_KEY).put(
        { ...store, version: API_CLIENT_STORE_VERSION },
        "main",
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Failed to write store"));
    });
    db.close();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === "QuotaExceededError"
        ? "Storage quota exceeded. Clear history or export and reset."
        : "Failed to save API client data.";
    return { ok: false, error: message };
  }
}

export function exportWorkspaceBackup(
  store: ApiClientStore,
  options?: { includeSecrets?: boolean },
): string {
  const includeSecrets = options?.includeSecrets ?? false;
  const sanitized: ApiClientStore = {
    ...store,
    environments: store.environments.map((env) => ({
      ...env,
      variables: env.variables.map((variable) => ({
        ...variable,
        value: !includeSecrets && variable.secret ? "" : variable.value,
      })),
    })),
  };

  return JSON.stringify(
    {
      ...sanitized,
      version: API_CLIENT_STORE_VERSION,
      exportedAt: Date.now(),
    },
    null,
    2,
  );
}

export function importWorkspaceBackup(json: string): ApiClientStore {
  const parsed = JSON.parse(json) as unknown;
  return migrateStore(parsed);
}

export function getSessionPostmanKey(): string {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(POSTMAN_KEY_SESSION) ?? "";
}

export function setSessionPostmanKey(value: string) {
  if (typeof sessionStorage === "undefined") return;
  if (!value) sessionStorage.removeItem(POSTMAN_KEY_SESSION);
  else sessionStorage.setItem(POSTMAN_KEY_SESSION, value);
}

export function duplicateCollection(collection: Collection): Collection {
  const folderIdMap = new Map<string, string>();
  const folders = collection.folders.map((folder) => {
    const id = newId("folder");
    folderIdMap.set(folder.id, id);
    return { ...folder, id };
  });
  const remappedFolders = folders.map((folder) => ({
    ...folder,
    parentId: folder.parentId ? (folderIdMap.get(folder.parentId) ?? null) : null,
  }));

  const requests: SavedRequest[] = collection.requests.map((request) => ({
    ...structuredClone(request),
    id: newId("req"),
    collectionId: "", // filled below
    folderId: request.folderId ? (folderIdMap.get(request.folderId) ?? null) : null,
    updatedAt: Date.now(),
  }));

  const id = newId("col");
  return {
    ...collection,
    id,
    name: `${collection.name} Copy`,
    folders: remappedFolders,
    requests: requests.map((request) => ({ ...request, collectionId: id })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
