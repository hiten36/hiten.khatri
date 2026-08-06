export type MarkdownDoc = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "hiten.md.docs.v1";
const ACTIVE_KEY = "hiten.md.active.v1";

const isBrowser = () => typeof window !== "undefined";

function readAll(): MarkdownDoc[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MarkdownDoc[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(docs: MarkdownDoc[]) {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

export function listMarkdownDocs(): MarkdownDoc[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getMarkdownDoc(id: string): MarkdownDoc | undefined {
  return readAll().find((doc) => doc.id === id);
}

export function getActiveMarkdownId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveMarkdownId(id: string | null) {
  if (!isBrowser()) return;
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function createMarkdownDoc(
  partial?: Partial<Pick<MarkdownDoc, "title" | "content">>,
): MarkdownDoc {
  const now = Date.now();
  const doc: MarkdownDoc = {
    id: crypto.randomUUID(),
    title: partial?.title?.trim() || "Untitled",
    content: partial?.content ?? "",
    createdAt: now,
    updatedAt: now,
  };
  const docs = readAll();
  docs.push(doc);
  writeAll(docs);
  setActiveMarkdownId(doc.id);
  return doc;
}

export function updateMarkdownDoc(
  id: string,
  patch: Partial<Pick<MarkdownDoc, "title" | "content">>,
): MarkdownDoc | undefined {
  const docs = readAll();
  const index = docs.findIndex((doc) => doc.id === id);
  if (index === -1) return undefined;

  const next: MarkdownDoc = {
    ...docs[index],
    ...patch,
    title: patch.title !== undefined ? patch.title.trim() || "Untitled" : docs[index].title,
    updatedAt: Date.now(),
  };
  docs[index] = next;
  writeAll(docs);
  return next;
}

export function deleteMarkdownDoc(id: string): boolean {
  const docs = readAll();
  const next = docs.filter((doc) => doc.id !== id);
  if (next.length === docs.length) return false;
  writeAll(next);
  if (getActiveMarkdownId() === id) {
    setActiveMarkdownId(next[0]?.id ?? null);
  }
  return true;
}

export function upsertImportedMarkdown(title: string, content: string): MarkdownDoc {
  return createMarkdownDoc({ title, content });
}

export const SAMPLE_MARKDOWN = `# Welcome to Markdown Studio

Write or paste **raw Markdown** on the left. A live preview renders on the right with [Comark](https://comark.dev).

## Features

- Create, rename, save, and delete notes
- Upload \`.md\` / \`.markdown\` / \`.txt\` files
- Download the current note
- Everything stays in **localStorage** on this device

## Example

| Feature | Status |
| --- | --- |
| GFM tables | Ready |
| Task lists | - [x] Done |
| Code | Highlighted |

\`\`\`ts
const greet = (name: string) => \`Hello, \${name}!\`;
console.log(greet("Hiten"));
\`\`\`

> Tip: press **Save** or rely on autosave — your notes never leave this browser.

Inline math: $E = mc^2$

$$
\\int_0^1 x^2 \\, dx = \\frac{1}{3}
$$
`;
