import { describe, expect, test } from "bun:test";
import {
  advancedSearchMarkdown,
  indexMarkdownForSearch,
} from "../src/utils/markdown-advanced-search";

const SAMPLE = `# GrowLuv API

## Quick start

Base URL notes.

## 10. Messages & chat

🔐 · Prefixes: \`/api/conversations\`, \`/api/chat\`

### Conversations

### \`GET /api/conversations\` 🔐

List conversations. Query \`q\` searches by group name.

### \`POST /api/conversations\` 🔐

Create or return existing DM:

\`\`\`json
{ "participantId": "64f..." }
\`\`\`

### Messages

### \`POST /api/conversations/:id/messages\` 🔐

Send a chat message with \`clientMessageId\`.

| Method | Path | Body |
|--------|------|------|
| GET | \`/api/chat/blocks\` | — |
| POST | \`/api/chat/blocks\` | \`{ "userId": "64f..." }\` |

## 2. Auth

### \`POST /api/auth/login\` 🔓

Login with email/password.
`;

describe("markdown advanced search", () => {
  test("indexes sections, groups, endpoints, and table rows", () => {
    const nodes = indexMarkdownForSearch(SAMPLE);
    expect(
      nodes.some((n) => n.kind === "section" && /chat/i.test(n.cleanTitle)),
    ).toBe(true);
    expect(
      nodes.some(
        (n) => n.kind === "endpoint" && n.path === "/api/conversations",
      ),
    ).toBe(true);
    expect(
      nodes.some((n) => n.kind === "endpoint" && n.path === "/api/chat/blocks"),
    ).toBe(true);
  });

  test("expands a topic query like chat into organized section results", () => {
    const nodes = indexMarkdownForSearch(SAMPLE);
    const groups = advancedSearchMarkdown(nodes, "chat");
    expect(groups.length).toBeGreaterThan(0);

    const chatGroup = groups.find((g) => /chat/i.test(g.section.cleanTitle));
    expect(chatGroup).toBeTruthy();
    const endpoints = chatGroup!.hits.filter((h) => h.node.kind === "endpoint");
    expect(endpoints.length).toBeGreaterThanOrEqual(3);
    expect(
      endpoints.some((h) => h.node.path?.includes("/api/conversations")),
    ).toBe(true);
  });

  test("still finds auth endpoints for auth query", () => {
    const nodes = indexMarkdownForSearch(SAMPLE);
    const groups = advancedSearchMarkdown(nodes, "auth");
    const flat = groups.flatMap((g) => g.hits);
    expect(flat.some((h) => h.node.path === "/api/auth/login")).toBe(true);
  });
});
