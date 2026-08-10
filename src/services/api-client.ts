import type {
  Environment,
  EnvironmentVariable,
  ExecuteResponse,
  HttpRequestDraft,
  KeyValueItem,
  ProxyExecutePayload,
} from "../components/api-client/types";

const VAR_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

export function buildVariableMap(
  environment: Environment | null | undefined,
  collectionVariables: KeyValueItem[] = [],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of collectionVariables) {
    if (item.enabled && item.key) map.set(item.key, item.value);
  }
  for (const item of environment?.variables ?? []) {
    if (item.enabled && item.key) map.set(item.key, item.value);
  }
  return map;
}

export function substituteVariables(
  input: string,
  variables: Map<string, string>,
): { value: string; unresolved: string[] } {
  const unresolved: string[] = [];
  const value = input.replace(VAR_PATTERN, (_, key: string) => {
    if (!variables.has(key)) {
      unresolved.push(key);
      return `{{${key}}}`;
    }
    return variables.get(key) ?? "";
  });
  return { value, unresolved: [...new Set(unresolved)] };
}

export function findUnresolvedVariables(
  draft: HttpRequestDraft,
  variables: Map<string, string>,
): string[] {
  const unresolved = new Set<string>();
  const collect = (value: string) => {
    const result = substituteVariables(value, variables);
    result.unresolved.forEach((item) => unresolved.add(item));
  };

  collect(draft.url);
  draft.params.forEach((item) => {
    if (!item.enabled) return;
    collect(item.key);
    collect(item.value);
  });
  draft.headers.forEach((item) => {
    if (!item.enabled) return;
    collect(item.key);
    collect(item.value);
  });
  if (draft.auth.type === "bearer") collect(draft.auth.bearerToken ?? "");
  if (draft.auth.type === "basic") {
    collect(draft.auth.basicUsername ?? "");
    collect(draft.auth.basicPassword ?? "");
  }
  if (draft.auth.type === "apikey") {
    collect(draft.auth.apiKeyName ?? "");
    collect(draft.auth.apiKeyValue ?? "");
  }
  if (draft.body.mode === "json") collect(draft.body.json ?? "");
  if (draft.body.mode === "text") collect(draft.body.text ?? "");
  if (draft.body.mode === "urlencoded") {
    draft.body.urlencoded.forEach((item) => {
      if (!item.enabled) return;
      collect(item.key);
      collect(item.value);
    });
  }
  if (draft.body.mode === "multipart") {
    draft.body.multipart.forEach((item) => {
      if (!item.enabled) return;
      collect(item.key);
      collect(item.value);
    });
  }

  return [...unresolved];
}

function applySubstitutionToDraft(
  draft: HttpRequestDraft,
  variables: Map<string, string>,
): HttpRequestDraft {
  const sub = (value: string) => substituteVariables(value, variables).value;
  return {
    ...draft,
    url: sub(draft.url),
    params: draft.params.map((item) => ({
      ...item,
      key: sub(item.key),
      value: sub(item.value),
    })),
    headers: draft.headers.map((item) => ({
      ...item,
      key: sub(item.key),
      value: sub(item.value),
    })),
    auth: {
      ...draft.auth,
      bearerToken: sub(draft.auth.bearerToken ?? ""),
      basicUsername: sub(draft.auth.basicUsername ?? ""),
      basicPassword: sub(draft.auth.basicPassword ?? ""),
      apiKeyName: sub(draft.auth.apiKeyName ?? ""),
      apiKeyValue: sub(draft.auth.apiKeyValue ?? ""),
    },
    body: {
      ...draft.body,
      json: sub(draft.body.json ?? ""),
      text: sub(draft.body.text ?? ""),
      urlencoded: draft.body.urlencoded.map((item) => ({
        ...item,
        key: sub(item.key),
        value: sub(item.value),
      })),
      multipart: draft.body.multipart.map((item) => ({
        ...item,
        key: sub(item.key),
        value: sub(item.value),
      })),
    },
  };
}

function enabledPairs(items: KeyValueItem[]): Array<[string, string]> {
  return items
    .filter((item) => item.enabled && item.key.trim())
    .map((item) => [item.key.trim(), item.value]);
}

export function buildProxyPayload(
  draft: HttpRequestDraft,
  variables: Map<string, string>,
): { payload: ProxyExecutePayload; resolvedUrl: string; unresolved: string[] } {
  const unresolved = findUnresolvedVariables(draft, variables);
  const resolved = applySubstitutionToDraft(draft, variables);

  const url = new URL(resolved.url.includes("://") ? resolved.url : `https://${resolved.url}`);
  for (const [key, value] of enabledPairs(resolved.params)) {
    url.searchParams.append(key, value);
  }

  const headers: Record<string, string> = {};
  for (const [key, value] of enabledPairs(resolved.headers)) {
    headers[key] = value;
  }

  if (resolved.auth.type === "bearer" && resolved.auth.bearerToken) {
    headers.Authorization = `Bearer ${resolved.auth.bearerToken}`;
  } else if (resolved.auth.type === "basic") {
    const token = btoa(
      `${resolved.auth.basicUsername ?? ""}:${resolved.auth.basicPassword ?? ""}`,
    );
    headers.Authorization = `Basic ${token}`;
  } else if (resolved.auth.type === "apikey") {
    const name = resolved.auth.apiKeyName || "X-Api-Key";
    const value = resolved.auth.apiKeyValue ?? "";
    if ((resolved.auth.apiKeyIn ?? "header") === "query") {
      url.searchParams.set(name, value);
    } else {
      headers[name] = value;
    }
  }

  let body: string | null = null;
  if (!["GET", "HEAD"].includes(resolved.method)) {
    if (resolved.body.mode === "json") {
      body = resolved.body.json ?? "";
      if (!Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
        headers["Content-Type"] = "application/json";
      }
    } else if (resolved.body.mode === "text") {
      body = resolved.body.text ?? "";
      if (!Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
        headers["Content-Type"] = "text/plain";
      }
    } else if (resolved.body.mode === "urlencoded") {
      const params = new URLSearchParams();
      for (const [key, value] of enabledPairs(resolved.body.urlencoded)) {
        params.append(key, value);
      }
      body = params.toString();
      if (!Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
      }
    } else if (resolved.body.mode === "multipart") {
      // Represent multipart as JSON payload description; proxy receives urlencoded-like pairs as text fallback.
      // For browser FormData with files, client can attach later; v1 sends text fields via multipart/form-data boundary-less JSON.
      const params = new URLSearchParams();
      for (const [key, value] of enabledPairs(resolved.body.multipart)) {
        params.append(key, value);
      }
      body = params.toString();
      if (!Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
      }
    }
  }

  return {
    unresolved,
    resolvedUrl: url.toString(),
    payload: {
      method: resolved.method,
      url: url.toString(),
      headers,
      body,
      bodyEncoding: "utf8",
      followRedirects: resolved.settings.followRedirects,
      timeoutMs: resolved.settings.timeoutMs,
    },
  };
}

export async function executeRequest(
  draft: HttpRequestDraft,
  options: {
    environment?: Environment | null;
    collectionVariables?: KeyValueItem[];
    signal?: AbortSignal;
  } = {},
): Promise<ExecuteResponse> {
  const variables = buildVariableMap(
    options.environment,
    options.collectionVariables ?? [],
  );

  let built;
  try {
    built = buildProxyPayload(draft, variables);
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: "Invalid URL",
      headers: [],
      mimeType: "text/plain",
      bodyText: error instanceof Error ? error.message : "Invalid request URL",
      bodyEncoding: "utf8",
      truncated: false,
      durationMs: 0,
      sizeBytes: 0,
      error: "Invalid URL",
    };
  }

  const response = await fetch("/api-client/execute", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(built.payload),
    signal: options.signal,
  });

  const data = (await response.json()) as ExecuteResponse & { error?: string };
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      statusText: response.statusText,
      headers: [],
      mimeType: "application/json",
      bodyText: data.error ?? "Request failed",
      bodyEncoding: "utf8",
      truncated: false,
      durationMs: data.durationMs ?? 0,
      sizeBytes: 0,
      error: data.error ?? "Request failed",
    };
  }

  return data;
}

export async function importCollectionFromUrl(
  url: string,
  options: { postmanApiKey?: string; signal?: AbortSignal } = {},
): Promise<{ collection: unknown; warnings: string[]; sourceUrl?: string }> {
  const response = await fetch("/api-client/import-url", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      url,
      postmanApiKey: options.postmanApiKey,
    }),
    signal: options.signal,
  });

  const data = (await response.json()) as {
    ok?: boolean;
    error?: string;
    collection?: unknown;
    warnings?: string[];
    sourceUrl?: string;
  };

  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? "Failed to import collection URL.");
  }

  return {
    collection: data.collection,
    warnings: data.warnings ?? [],
    sourceUrl: data.sourceUrl,
  };
}

export function toCurl(draft: HttpRequestDraft, environment?: Environment | null): string {
  const variables = buildVariableMap(environment);
  const { payload } = buildProxyPayload(draft, variables);
  const parts = [`curl --request ${payload.method}`, `--url '${payload.url.replace(/'/g, `'\\''`)}'`];
  for (const [key, value] of Object.entries(payload.headers)) {
    parts.push(`--header '${key}: ${value.replace(/'/g, `'\\''`)}'`);
  }
  if (payload.body) {
    parts.push(`--data '${payload.body.replace(/'/g, `'\\''`)}'`);
  }
  return parts.join(" \\\n  ");
}

export function maskSecretVariables(
  variables: EnvironmentVariable[],
): EnvironmentVariable[] {
  return variables.map((item) =>
    item.secret
      ? {
          ...item,
          value: item.value ? "••••••••" : "",
        }
      : item,
  );
}
