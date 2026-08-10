import parseCurl from "parse-curl";
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

export function looksLikeCurl(input: string): boolean {
  const trimmed = input.trim();
  return /^curl(\s|$)/i.test(trimmed) || /^curl\.exe(\s|$)/i.test(trimmed);
}

function normalizeCurl(input: string): string {
  let text = input.trim().replace(/\r\n/g, "\n");
  // Join bash line continuations
  text = text.replace(/\\\n/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  if (/^curl\.exe\b/i.test(text)) {
    text = text.replace(/^curl\.exe\b/i, "curl");
  }
  if (!/^curl\s/i.test(text) && /^curl"/i.test(text)) {
    text = text.replace(/^curl/i, "curl ");
  }
  if (!text.toLowerCase().startsWith("curl ")) {
    text = `curl ${text.replace(/^curl/i, "").trim()}`;
  }

  // Expand common modern flags parse-curl doesn't know
  text = text
    .replace(/\s--data-raw\s+/gi, " -d ")
    .replace(/\s--data-binary\s+/gi, " -d ")
    .replace(/\s--data-urlencode\s+/gi, " -d ")
    .replace(/\s--url\s+/gi, " ");

  // --json BODY => -H content-type + -d BODY
  text = text.replace(/\s--json\s+('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|[^\s]+)/gi, (_match, body) => {
    return ` -H "Content-Type: application/json" -H "Accept: application/json" -d ${body}`;
  });

  return text;
}

function mapMethod(value: string | undefined): HttpMethod {
  const method = (value ?? "GET").toUpperCase();
  switch (method) {
    case "POST":
    case "PUT":
    case "PATCH":
    case "DELETE":
    case "HEAD":
    case "OPTIONS":
      return method;
    default:
      return "GET";
  }
}

function headersToItems(headers: Record<string, string> | undefined): KeyValueItem[] {
  const items = Object.entries(headers ?? {}).map(([key, value]) =>
    createKeyValue({ key, value, enabled: true }),
  );
  return items.length ? items : [createKeyValue()];
}

function deriveAuth(headers: Record<string, string>): {
  auth: AuthConfig;
  headers: Record<string, string>;
} {
  const next = { ...headers };
  const authHeaderKey = Object.keys(next).find(
    (key) => key.toLowerCase() === "authorization",
  );
  if (!authHeaderKey) {
    return { auth: createAuth(), headers: next };
  }

  const value = next[authHeaderKey] ?? "";
  delete next[authHeaderKey];

  if (/^bearer\s+/i.test(value)) {
    return {
      auth: createAuth({
        type: "bearer",
        bearerToken: value.replace(/^bearer\s+/i, "").trim(),
      }),
      headers: next,
    };
  }

  if (/^basic\s+/i.test(value)) {
    try {
      const decoded = atob(value.replace(/^basic\s+/i, "").trim());
      const idx = decoded.indexOf(":");
      return {
        auth: createAuth({
          type: "basic",
          basicUsername: idx >= 0 ? decoded.slice(0, idx) : decoded,
          basicPassword: idx >= 0 ? decoded.slice(idx + 1) : "",
        }),
        headers: next,
      };
    } catch {
      next[authHeaderKey] = value;
      return { auth: createAuth(), headers: next };
    }
  }

  next[authHeaderKey] = value;
  return { auth: createAuth(), headers: next };
}

function deriveBody(
  body: string | undefined,
  headers: Record<string, string>,
): BodyConfig {
  if (body == null || body === "") return createBody({ mode: "none" });

  const contentType =
    Object.entries(headers).find(([key]) => key.toLowerCase() === "content-type")?.[1] ??
    "";

  if (/json/i.test(contentType) || /^[\s]*[\{\[]/.test(body)) {
    let pretty = body;
    try {
      pretty = JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      // keep raw
    }
    return createBody({ mode: "json", json: pretty });
  }

  if (/x-www-form-urlencoded/i.test(contentType)) {
    const params = new URLSearchParams(body);
    const items: KeyValueItem[] = [];
    params.forEach((value, key) => {
      items.push(createKeyValue({ key, value, enabled: true }));
    });
    return createBody({
      mode: "urlencoded",
      urlencoded: items.length ? items : [createKeyValue()],
    });
  }

  return createBody({ mode: "text", text: body });
}

function splitUrl(url: string): { url: string; params: KeyValueItem[] } {
  try {
    const parsed = new URL(url);
    const params: KeyValueItem[] = [];
    parsed.searchParams.forEach((value, key) => {
      params.push(createKeyValue({ key, value, enabled: true }));
    });
    parsed.search = "";
    return {
      url: parsed.toString(),
      params: params.length ? params : [createKeyValue()],
    };
  } catch {
    return { url, params: [createKeyValue()] };
  }
}

export function parseCurlToDraft(
  input: string,
  existing?: Partial<HttpRequestDraft>,
): HttpRequestDraft {
  const normalized = normalizeCurl(input);
  const parsed = parseCurl(normalized);
  if (!parsed?.url) {
    throw new Error("Could not parse cURL. Check the command and try again.");
  }

  // parse-curl incorrectly maps -b to Set-Cookie; fix to Cookie
  const rawHeaders = { ...(parsed.header ?? {}) };
  if (rawHeaders["Set-Cookie"] && !rawHeaders.Cookie && !rawHeaders.cookie) {
    rawHeaders.Cookie = rawHeaders["Set-Cookie"];
    delete rawHeaders["Set-Cookie"];
  }

  const { auth, headers } = deriveAuth(rawHeaders);
  const body = deriveBody(parsed.body, headers);
  const { url, params } = splitUrl(parsed.url);

  return createRequestDraft({
    ...existing,
    id: existing?.id,
    name: existing?.name && existing.name !== "Untitled Request"
      ? existing.name
      : "Imported from cURL",
    method: mapMethod(parsed.method),
    url,
    params,
    headers: headersToItems(headers),
    auth,
    body,
    settings: createSettings(existing?.settings),
    collectionId: existing?.collectionId ?? null,
    folderId: existing?.folderId ?? null,
  });
}
