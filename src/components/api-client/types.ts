export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type AuthType = "none" | "bearer" | "basic" | "apikey";
export type ApiKeyIn = "header" | "query";
export type BodyMode = "none" | "json" | "text" | "urlencoded" | "multipart";
export type SidebarTab = "collections" | "environments" | "history";
export type RequestEditorTab = "params" | "authorization" | "headers" | "body" | "settings";
export type ResponseViewTab = "pretty" | "raw" | "preview" | "headers";
export type ApiTheme = "light" | "dark";
export type ImportConflictMode = "replace" | "merge" | "copy";

export interface KeyValueItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface AuthConfig {
  type: AuthType;
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyIn?: ApiKeyIn;
}

export interface BodyConfig {
  mode: BodyMode;
  json?: string;
  text?: string;
  urlencoded: KeyValueItem[];
  multipart: KeyValueItem[];
}

export interface RequestSettings {
  followRedirects: boolean;
  timeoutMs: number;
}

export interface HttpRequestDraft {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValueItem[];
  headers: KeyValueItem[];
  auth: AuthConfig;
  body: BodyConfig;
  settings: RequestSettings;
  collectionId?: string | null;
  folderId?: string | null;
  updatedAt: number;
}

export interface CollectionFolder {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
}

export interface SavedRequest extends HttpRequestDraft {
  collectionId: string;
  folderId: string | null;
  order: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  folders: CollectionFolder[];
  requests: SavedRequest[];
  variables: KeyValueItem[];
  createdAt: number;
  updatedAt: number;
}

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  secret?: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  createdAt: number;
  updatedAt: number;
}

export interface OpenTab {
  id: string;
  draft: HttpRequestDraft;
  dirty: boolean;
  originRequestId?: string | null;
}

export interface ResponseHeader {
  key: string;
  value: string;
}

export interface ExecuteResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: ResponseHeader[];
  mimeType: string;
  bodyText: string;
  bodyEncoding: "utf8" | "base64";
  truncated: boolean;
  durationMs: number;
  sizeBytes: number;
  finalUrl?: string;
  error?: string;
}

export interface HistoryEntry {
  id: string;
  method: HttpMethod;
  url: string;
  status: number;
  statusText: string;
  durationMs: number;
  sizeBytes: number;
  createdAt: number;
  requestSnapshot: HttpRequestDraft;
  bodyPreview: string;
  mimeType: string;
}

export interface ApiClientPreferences {
  theme: ApiTheme;
  activeEnvironmentId: string | null;
  sidebarTab: SidebarTab;
  sidebarCollapsed: boolean;
  requestEditorTab: RequestEditorTab;
  responseViewTab: ResponseViewTab;
  layout: {
    sidebar: number;
    request: number;
  };
}

export interface ApiClientStore {
  version: number;
  collections: Collection[];
  environments: Environment[];
  tabs: OpenTab[];
  activeTabId: string | null;
  history: HistoryEntry[];
  preferences: ApiClientPreferences;
}

export interface ImportPreviewItem {
  name: string;
  method?: HttpMethod;
  url?: string;
  kind: "collection" | "folder" | "request" | "environment";
}

export interface ImportPreview {
  name: string;
  itemCount: number;
  warnings: string[];
  items: ImportPreviewItem[];
  collection: Collection;
}

export interface ProxyExecutePayload {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string | null;
  bodyEncoding?: "utf8" | "base64";
  followRedirects?: boolean;
  timeoutMs?: number;
}

export const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

export const API_CLIENT_STORE_VERSION = 1;
export const HISTORY_LIMIT = 100;
export const HISTORY_BODY_PREVIEW_LIMIT = 4_000;
