import type {
  AuthConfig,
  BodyConfig,
  HttpMethod,
  HttpRequestDraft,
  KeyValueItem,
} from "../components/api-client/types";
import {
  createAuth,
  createBody,
  createKeyValue,
  createRequestDraft,
  createSettings,
} from "./api-client-db";

export const TRY_HASH_PREFIX = "try=";

export interface TryRequestPayload {
  v: 1;
  name?: string;
  method: HttpMethod;
  url: string;
  headers?: Array<{ key: string; value: string; enabled?: boolean }>;
  params?: Array<{ key: string; value: string; enabled?: boolean }>;
  body?: {
    mode: BodyConfig["mode"];
    json?: string;
    text?: string;
  };
  auth?: Partial<AuthConfig>;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encodeTryPayload(payload: TryRequestPayload): string {
  const json = JSON.stringify(payload);
  return toBase64Url(new TextEncoder().encode(json));
}

export function decodeTryPayload(encoded: string): TryRequestPayload {
  const json = new TextDecoder().decode(fromBase64Url(encoded));
  const parsed = JSON.parse(json) as TryRequestPayload;
  if (!parsed || parsed.v !== 1 || !parsed.method || !parsed.url) {
    throw new Error("Invalid try payload.");
  }
  return parsed;
}

export function buildTryInApiClientHref(payload: TryRequestPayload): string {
  return `/api-client#${TRY_HASH_PREFIX}${encodeTryPayload(payload)}`;
}

function mapItems(
  items: Array<{ key: string; value: string; enabled?: boolean }> | undefined,
): KeyValueItem[] {
  if (!items?.length) return [createKeyValue()];
  return items.map((item) =>
    createKeyValue({
      key: item.key,
      value: item.value,
      enabled: item.enabled !== false,
    }),
  );
}

export function tryPayloadToDraft(payload: TryRequestPayload): HttpRequestDraft {
  return createRequestDraft({
    name: payload.name || `${payload.method} ${payload.url}`,
    method: payload.method,
    url: payload.url,
    params: mapItems(payload.params),
    headers: mapItems(payload.headers),
    auth: createAuth(payload.auth),
    body: createBody({
      mode: payload.body?.mode ?? "none",
      json: payload.body?.json,
      text: payload.body?.text,
    }),
    settings: createSettings(),
  });
}

export function readTryPayloadFromLocation(
  hash = typeof window !== "undefined" ? window.location.hash : "",
): TryRequestPayload | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw.startsWith(TRY_HASH_PREFIX)) return null;
  const encoded = raw.slice(TRY_HASH_PREFIX.length);
  if (!encoded) return null;
  try {
    return decodeTryPayload(decodeURIComponent(encoded));
  } catch {
    return null;
  }
}

export function clearTryHashFromLocation() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.hash.startsWith(`#${TRY_HASH_PREFIX}`)) return;
  url.hash = "";
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}
