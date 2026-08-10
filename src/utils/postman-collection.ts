import type {
  AuthConfig,
  BodyConfig,
  Collection,
  CollectionFolder,
  HttpMethod,
  HttpRequestDraft,
  ImportPreview,
  ImportPreviewItem,
  KeyValueItem,
  SavedRequest,
} from "../components/api-client/types";
import {
  createAuth,
  createBody,
  createKeyValue,
  createRequestDraft,
  createSettings,
  newId,
} from "./api-client-db";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function mapMethod(value: unknown): HttpMethod {
  const method = asString(value, "GET").toUpperCase();
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

function mapKeyValues(raw: unknown): KeyValueItem[] {
  if (!Array.isArray(raw)) return [createKeyValue()];
  const items = raw
    .filter(isObject)
    .map((item) =>
      createKeyValue({
        key: asString(item.key),
        value: asString(item.value),
        enabled: item.disabled === true ? false : true,
        description: asString(item.description),
      }),
    );
  return items.length ? items : [createKeyValue()];
}

function mapUrl(raw: unknown): { url: string; params: KeyValueItem[] } {
  if (typeof raw === "string") {
    return { url: raw, params: [createKeyValue()] };
  }
  if (!isObject(raw)) {
    return { url: "https://", params: [createKeyValue()] };
  }

  if (typeof raw.raw === "string" && raw.raw) {
    return {
      url: raw.raw,
      params: mapKeyValues(raw.query),
    };
  }

  const protocol = asString(raw.protocol, "https");
  const host = Array.isArray(raw.host) ? raw.host.join(".") : asString(raw.host);
  const path = Array.isArray(raw.path) ? raw.path.join("/") : asString(raw.path);
  const url = host ? `${protocol}://${host}${path ? `/${path}` : ""}` : "https://";
  return {
    url,
    params: mapKeyValues(raw.query),
  };
}

function mapAuth(raw: unknown): AuthConfig {
  if (!isObject(raw)) return createAuth();
  const type = asString(raw.type, "noauth").toLowerCase();
  const auth = createAuth();

  const find = (arr: unknown, key: string) => {
    if (!Array.isArray(arr)) return "";
    const found = arr.find(
      (item) => isObject(item) && asString(item.key).toLowerCase() === key.toLowerCase(),
    );
    return isObject(found) ? asString(found.value) : "";
  };

  if (type === "bearer") {
    auth.type = "bearer";
    auth.bearerToken = find(raw.bearer, "token");
  } else if (type === "basic") {
    auth.type = "basic";
    auth.basicUsername = find(raw.basic, "username");
    auth.basicPassword = find(raw.basic, "password");
  } else if (type === "apikey") {
    auth.type = "apikey";
    auth.apiKeyName = find(raw.apikey, "key") || "X-Api-Key";
    auth.apiKeyValue = find(raw.apikey, "value");
    const inn = find(raw.apikey, "in").toLowerCase();
    auth.apiKeyIn = inn === "query" ? "query" : "header";
  }

  return auth;
}

function mapBody(raw: unknown): BodyConfig {
  const body = createBody();
  if (!isObject(raw)) return body;
  const mode = asString(raw.mode, "none");

  if (mode === "raw") {
    const language = isObject(raw.options)
      ? isObject((raw.options as Record<string, unknown>).raw)
        ? asString(
            ((raw.options as Record<string, unknown>).raw as Record<string, unknown>)
              .language,
            "text",
          )
        : "text"
      : "text";
    if (language === "json") {
      body.mode = "json";
      body.json = asString(raw.raw, "{\n  \n}");
    } else {
      body.mode = "text";
      body.text = asString(raw.raw);
    }
  } else if (mode === "urlencoded") {
    body.mode = "urlencoded";
    body.urlencoded = mapKeyValues(raw.urlencoded);
  } else if (mode === "formdata") {
    body.mode = "multipart";
    body.multipart = mapKeyValues(raw.formdata);
  }

  return body;
}

function mapRequest(raw: unknown, collectionId: string, folderId: string | null, order: number): SavedRequest | null {
  if (!isObject(raw)) return null;
  const requestNode = isObject(raw.request) ? raw.request : raw;
  if (!isObject(requestNode)) return null;

  const mappedUrl = mapUrl(requestNode.url);
  const draft = createRequestDraft({
    name: asString(raw.name, "Imported Request"),
    method: mapMethod(requestNode.method),
    url: mappedUrl.url,
    params: mappedUrl.params,
    headers: mapKeyValues(requestNode.header),
    auth: mapAuth(requestNode.auth),
    body: mapBody(requestNode.body),
    settings: createSettings(),
    collectionId,
    folderId,
  });

  return {
    ...draft,
    collectionId,
    folderId,
    order,
  };
}

export function detectPostmanVersion(raw: unknown): "v1" | "v2" | "unknown" {
  if (!isObject(raw)) return "unknown";
  if (Array.isArray(raw.requests) && !raw.info && !raw.item) return "v1";
  if (isObject(raw.info) || Array.isArray(raw.item)) return "v2";
  if (isObject(raw.collection)) return detectPostmanVersion(raw.collection);
  return "unknown";
}

export function parsePostmanCollection(rawInput: unknown): ImportPreview {
  const warnings: string[] = [];
  let raw = rawInput;

  if (isObject(raw) && isObject(raw.collection)) {
    raw = raw.collection;
  }

  const version = detectPostmanVersion(raw);
  if (version === "v1") {
    throw new Error(
      "Postman Collection v1 is no longer supported. Convert it to Collection v2.1 with the Postman Collection Transformer, then try again.",
    );
  }
  if (version === "unknown" || !isObject(raw)) {
    throw new Error("Unrecognized collection format. Expected Postman Collection v2/v2.1 JSON.");
  }

  const info = isObject(raw.info) ? raw.info : {};
  const schema = asString(info.schema);
  if (schema && !schema.includes("v2.")) {
    warnings.push(`Unexpected schema "${schema}". Import will continue best-effort.`);
  }

  const collectionId = newId("col");
  const folders: CollectionFolder[] = [];
  const requests: SavedRequest[] = [];
  const previewItems: ImportPreviewItem[] = [];

  const walk = (
    items: unknown,
    parentFolderId: string | null,
  ) => {
    if (!Array.isArray(items)) return;
    items.forEach((item, index) => {
      if (!isObject(item)) return;
      const hasRequest = isObject(item.request) || typeof item.request === "string";
      const hasChildren = Array.isArray(item.item);

      if (hasChildren && !hasRequest) {
        const folderId = newId("folder");
        const name = asString(item.name, "Folder");
        folders.push({
          id: folderId,
          name,
          parentId: parentFolderId,
          order: index,
        });
        previewItems.push({ name, kind: "folder" });
        walk(item.item, folderId);
        return;
      }

      if (hasRequest) {
        const mapped = mapRequest(item, collectionId, parentFolderId, index);
        if (mapped) {
          requests.push(mapped);
          previewItems.push({
            name: mapped.name,
            method: mapped.method,
            url: mapped.url,
            kind: "request",
          });
        } else {
          warnings.push(`Skipped unreadable request "${asString(item.name, "unknown")}".`);
        }
      }
    });
  };

  walk(raw.item, null);

  const variables = mapKeyValues(raw.variable).filter((item) => item.key);

  const collection: Collection = {
    id: collectionId,
    name: asString(info.name, "Imported Collection"),
    description: asString(info.description),
    folders,
    requests,
    variables: variables.length ? variables : [createKeyValue()],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  previewItems.unshift({
    name: collection.name,
    kind: "collection",
  });

  if (!requests.length) {
    warnings.push("Collection imported with no requests.");
  }

  return {
    name: collection.name,
    itemCount: requests.length,
    warnings,
    items: previewItems.slice(0, 200),
    collection,
  };
}

function toPostmanKeyValues(items: KeyValueItem[]) {
  return items
    .filter((item) => item.key)
    .map((item) => ({
      key: item.key,
      value: item.value,
      description: item.description ?? "",
      disabled: !item.enabled,
    }));
}

function toPostmanUrl(draft: HttpRequestDraft) {
  try {
    const url = new URL(draft.url);
    return {
      raw: draft.url,
      protocol: url.protocol.replace(":", ""),
      host: url.hostname.split("."),
      path: url.pathname.split("/").filter(Boolean),
      query: toPostmanKeyValues(draft.params),
    };
  } catch {
    return {
      raw: draft.url,
      query: toPostmanKeyValues(draft.params),
    };
  }
}

function toPostmanAuth(auth: AuthConfig) {
  if (auth.type === "bearer") {
    return {
      type: "bearer",
      bearer: [{ key: "token", value: auth.bearerToken ?? "", type: "string" }],
    };
  }
  if (auth.type === "basic") {
    return {
      type: "basic",
      basic: [
        { key: "username", value: auth.basicUsername ?? "", type: "string" },
        { key: "password", value: auth.basicPassword ?? "", type: "string" },
      ],
    };
  }
  if (auth.type === "apikey") {
    return {
      type: "apikey",
      apikey: [
        { key: "key", value: auth.apiKeyName ?? "X-Api-Key", type: "string" },
        { key: "value", value: auth.apiKeyValue ?? "", type: "string" },
        { key: "in", value: auth.apiKeyIn ?? "header", type: "string" },
      ],
    };
  }
  return { type: "noauth" };
}

function toPostmanBody(body: BodyConfig) {
  if (body.mode === "json") {
    return {
      mode: "raw",
      raw: body.json ?? "",
      options: { raw: { language: "json" } },
    };
  }
  if (body.mode === "text") {
    return {
      mode: "raw",
      raw: body.text ?? "",
      options: { raw: { language: "text" } },
    };
  }
  if (body.mode === "urlencoded") {
    return {
      mode: "urlencoded",
      urlencoded: toPostmanKeyValues(body.urlencoded),
    };
  }
  if (body.mode === "multipart") {
    return {
      mode: "formdata",
      formdata: toPostmanKeyValues(body.multipart),
    };
  }
  return undefined;
}

function toPostmanRequestItem(request: SavedRequest) {
  return {
    name: request.name,
    request: {
      method: request.method,
      header: toPostmanKeyValues(request.headers),
      auth: toPostmanAuth(request.auth),
      body: toPostmanBody(request.body),
      url: toPostmanUrl(request),
    },
  };
}

export function exportPostmanCollection(collection: Collection): string {
  const rootFolders = collection.folders
    .filter((folder) => !folder.parentId)
    .sort((a, b) => a.order - b.order);

  const buildFolder = (folderId: string): Record<string, unknown> => {
    const folder = collection.folders.find((item) => item.id === folderId);
    const childFolders = collection.folders
      .filter((item) => item.parentId === folderId)
      .sort((a, b) => a.order - b.order)
      .map((item) => buildFolder(item.id));
    const childRequests = collection.requests
      .filter((item) => item.folderId === folderId)
      .sort((a, b) => a.order - b.order)
      .map(toPostmanRequestItem);

    return {
      name: folder?.name ?? "Folder",
      item: [...childFolders, ...childRequests],
    };
  };

  const rootRequests = collection.requests
    .filter((item) => !item.folderId)
    .sort((a, b) => a.order - b.order)
    .map(toPostmanRequestItem);

  const payload = {
    info: {
      name: collection.name,
      description: collection.description ?? "",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: [...rootFolders.map((folder) => buildFolder(folder.id)), ...rootRequests],
    variable: toPostmanKeyValues(collection.variables),
  };

  return JSON.stringify(payload, null, 2);
}
