import { describe, expect, test } from "bun:test";
import {
  isBlockedHostname,
  isBlockedIp,
  sanitizeOutgoingHeaders,
} from "../src/server/api-client-proxy";
import {
  exportPostmanCollection,
  parsePostmanCollection,
} from "../src/utils/postman-collection";
import { looksLikeCurl, parseCurlToDraft } from "../src/utils/curl-import";
import {
  buildProxyPayload,
  buildVariableMap,
  findUnresolvedVariables,
  substituteVariables,
} from "../src/services/api-client";
import {
  createEmptyStore,
  createRequestDraft,
  migrateStore,
  validateStore,
} from "../src/utils/api-client-db";
import { apiClientReducer, createHistoryEntry } from "../src/components/api-client/state/reducer";
import {
  buildTryInApiClientHref,
  decodeTryPayload,
  encodeTryPayload,
  tryPayloadToDraft,
} from "../src/utils/api-client-share";
import { enhanceMarkdownWithApiTryLinks } from "../src/utils/markdown-api-links";

const sampleCollection = {
  info: {
    name: "Demo APIs",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  item: [
    {
      name: "Users",
      item: [
        {
          name: "List users",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "https://api.example.com/{{version}}/users?limit=10",
              host: ["api", "example", "com"],
              path: ["{{version}}", "users"],
              query: [{ key: "limit", value: "10" }],
            },
          },
        },
      ],
    },
    {
      name: "Create user",
      request: {
        method: "POST",
        header: [{ key: "Content-Type", value: "application/json" }],
        body: {
          mode: "raw",
          raw: '{"name":"Ada"}',
          options: { raw: { language: "json" } },
        },
        auth: {
          type: "bearer",
          bearer: [{ key: "token", value: "{{token}}" }],
        },
        url: "https://api.example.com/users",
      },
    },
  ],
  variable: [{ key: "version", value: "v1" }],
};

describe("proxy security helpers", () => {
  test("blocks private and reserved IPs", () => {
    expect(isBlockedIp("127.0.0.1")).toBe(true);
    expect(isBlockedIp("10.0.0.8")).toBe(true);
    expect(isBlockedIp("192.168.1.10")).toBe(true);
    expect(isBlockedIp("169.254.169.254")).toBe(true);
    expect(isBlockedIp("::1")).toBe(true);
    expect(isBlockedIp("8.8.8.8")).toBe(false);
  });

  test("blocks localhost-like hostnames", () => {
    expect(isBlockedHostname("localhost")).toBe(true);
    expect(isBlockedHostname("api.local")).toBe(true);
    expect(isBlockedHostname("metadata.google.internal")).toBe(true);
    expect(isBlockedHostname("example.com")).toBe(false);
  });

  test("strips hop-by-hop and cookie headers", () => {
    const headers = sanitizeOutgoingHeaders({
      Authorization: "Bearer abc",
      Connection: "keep-alive",
      Cookie: "a=1",
      "X-Custom": "yes",
    });
    expect(headers.get("Authorization")).toBe("Bearer abc");
    expect(headers.get("X-Custom")).toBe("yes");
    expect(headers.get("Connection")).toBeNull();
    expect(headers.get("Cookie")).toBeNull();
  });
});

describe("postman import/export", () => {
  test("imports collection v2.1 folders and requests", () => {
    const preview = parsePostmanCollection(sampleCollection);
    expect(preview.name).toBe("Demo APIs");
    expect(preview.itemCount).toBe(2);
    expect(preview.collection.folders.length).toBe(1);
    expect(preview.collection.requests[0]?.method).toBe("GET");
    expect(preview.collection.requests[1]?.auth.type).toBe("bearer");
    expect(preview.collection.requests[1]?.body.mode).toBe("json");
  });

  test("rejects legacy v1 collections", () => {
    expect(() =>
      parsePostmanCollection({
        name: "Old",
        requests: [{ method: "GET", url: "https://example.com" }],
      }),
    ).toThrow(/v1 is no longer supported/i);
  });

  test("round-trips through Postman export", () => {
    const preview = parsePostmanCollection(sampleCollection);
    const exported = exportPostmanCollection(preview.collection);
    const again = parsePostmanCollection(JSON.parse(exported));
    expect(again.collection.requests.length).toBe(2);
    expect(again.collection.name).toBe("Demo APIs");
  });
});

describe("environment substitution", () => {
  test("substitutes and reports unresolved variables", () => {
    const map = buildVariableMap(
      {
        id: "env",
        name: "Local",
        variables: [
          { id: "1", key: "baseUrl", value: "https://api.example.com", enabled: true },
          { id: "2", key: "token", value: "abc", enabled: true, secret: true },
        ],
        createdAt: 1,
        updatedAt: 1,
      },
      [{ id: "3", key: "version", value: "v1", enabled: true }],
    );

    expect(substituteVariables("{{baseUrl}}/{{version}}", map).value).toBe(
      "https://api.example.com/v1",
    );
    expect(substituteVariables("{{missing}}", map).unresolved).toEqual(["missing"]);

    const draft = createRequestDraft({
      url: "{{baseUrl}}/users",
      headers: [
        {
          id: "h1",
          key: "Authorization",
          value: "Bearer {{token}}",
          enabled: true,
        },
      ],
      auth: {
        type: "none",
      },
    });
    expect(findUnresolvedVariables(draft, map)).toEqual([]);

    const built = buildProxyPayload(draft, map);
    expect(built.resolvedUrl).toBe("https://api.example.com/users");
    expect(built.payload.headers.Authorization).toBe("Bearer abc");
  });
});

describe("curl import", () => {
  test("parses a typical POST curl into a draft", () => {
    const draft = parseCurlToDraft(`
      curl -X POST 'https://api.example.com/users?active=1' \\
        -H 'Authorization: Bearer tok_123' \\
        -H 'Content-Type: application/json' \\
        --data-raw '{"name":"Ada"}'
    `);
    expect(draft.method).toBe("POST");
    expect(draft.url).toBe("https://api.example.com/users");
    expect(draft.params.some((item) => item.key === "active" && item.value === "1")).toBe(true);
    expect(draft.auth.type).toBe("bearer");
    expect(draft.auth.bearerToken).toBe("tok_123");
    expect(draft.body.mode).toBe("json");
    expect(draft.body.json).toContain("Ada");
  });

  test("detects curl-looking clipboard text", () => {
    expect(looksLikeCurl("curl https://example.com")).toBe(true);
    expect(looksLikeCurl("https://example.com")).toBe(false);
  });
});

describe("markdown api try links", () => {
  test("injects try links under API headings and encodes payload", () => {
    const md = `# API

| **Production API** | \`https://api.example.com\` |

### \`POST /api/auth/login\`

\`\`\`json
{ "email": "a@b.com", "password": "x" }
\`\`\`

### \`GET /api/health\`

\`\`\`json
{ "success": true }
\`\`\`
`;

    const enhanced = enhanceMarkdownWithApiTryLinks(md);
    expect(enhanced).toContain("/api-client#try=");
    expect(enhanced).toContain("Try in API Client");

    const hrefMatch = enhanced.match(/\]\((\/api-client#try=[^)]+)\)/);
    expect(hrefMatch?.[1]).toBeTruthy();
    const encoded = hrefMatch![1]!.split("#try=")[1]!;
    const payload = decodeTryPayload(encoded);
    expect(payload.method).toBe("POST");
    expect(payload.url).toBe("https://api.example.com/api/auth/login");
    expect(payload.body?.mode).toBe("json");
    expect(payload.body?.json).toContain("email");

    const draft = tryPayloadToDraft(payload);
    expect(draft.method).toBe("POST");
    expect(draft.url).toContain("/api/auth/login");
  });

  test("round-trips share encoding", () => {
    const href = buildTryInApiClientHref({
      v: 1,
      method: "GET",
      url: "https://api.example.com/ping",
      name: "Ping",
    });
    const encoded = href.split("#try=")[1]!;
    expect(encodeTryPayload(decodeTryPayload(encoded))).toBe(encoded);
  });
});

describe("store migration and reducer", () => {
  test("migrates invalid payloads to empty store", () => {
    const store = migrateStore({ broken: true });
    expect(store.version).toBe(1);
    expect(store.tabs.length).toBe(1);
    expect(validateStore(store)).not.toBeNull();
  });

  test("imports collections with copy mode and tracks history", () => {
    const preview = parsePostmanCollection(sampleCollection);
    let store = createEmptyStore();
    store = apiClientReducer(store, {
      type: "IMPORT_COLLECTIONS",
      collections: [preview.collection],
      mode: "copy",
    });
    expect(store.collections.length).toBe(1);

    const draft = store.collections[0]!.requests[0]!;
    const entry = createHistoryEntry(draft, {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: [],
      mimeType: "application/json",
      bodyText: '{"ok":true}',
      bodyEncoding: "utf8",
      truncated: false,
      durationMs: 12,
      sizeBytes: 11,
    });
    store = apiClientReducer(store, { type: "PUSH_HISTORY", entry });
    expect(store.history[0]?.status).toBe(200);
  });
});
