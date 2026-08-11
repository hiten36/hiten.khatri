import Fuse from "fuse.js";

export type MdSearchKind = "section" | "group" | "endpoint" | "note";

export type MdSearchNode = {
  id: string;
  level: number;
  title: string;
  cleanTitle: string;
  startOffset: number;
  endOffset: number;
  body: string;
  summary: string;
  method?: string;
  path?: string;
  authHint?: string;
  parentId: string | null;
  /** Nearest `##` section id */
  sectionId: string | null;
  breadcrumb: string[];
  kind: MdSearchKind;
  /** Full searchable blob */
  haystack: string;
};

export type AdvancedSearchHit = {
  node: MdSearchNode;
  score: number;
  matchedVia: "self" | "ancestor" | "descendant";
};

export type AdvancedSearchGroup = {
  section: MdSearchNode;
  score: number;
  hits: AdvancedSearchHit[];
};

const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const ENDPOINT_TITLE_RE =
  /`(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+([^`]+)`/i;
const TABLE_ENDPOINT_RE =
  /^\|\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\|\s*`?([^`|]+)`?\s*\|\s*(.*?)\s*\|?\s*$/i;
const FENCE_RE = /```[\s\S]*?```/g;

function stripMdInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/🔓|🔐|🟡|↗/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function authFromText(text: string): string | undefined {
  if (/🔓/.test(text)) return "Public";
  if (/🟡/.test(text)) return "Optional JWT";
  if (/🔐/.test(text)) return "JWT";
  return undefined;
}

function summarizeBody(body: string, maxLen = 220): string {
  const withoutFences = body.replace(FENCE_RE, " ");
  const lines = withoutFences
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (/^---+$/.test(line)) return false;
      if (/^\|?\s*-{3,}/.test(line)) return false;
      if (/^\|?\s*[-:| ]+\s*\|?\s*$/.test(line)) return false;
      return true;
    });

  const preferred = lines.filter(
    (line) =>
      !line.startsWith("|") &&
      !line.startsWith("#") &&
      !/^required:/i.test(line),
  );
  const pick = (preferred.length ? preferred : lines).slice(0, 4);
  const joined = stripMdInline(pick.join(" · "));
  if (joined.length <= maxLen) return joined;
  return `${joined.slice(0, maxLen - 1).trimEnd()}…`;
}

function lineOffsets(markdown: string): number[] {
  const offsets = [0];
  for (let i = 0; i < markdown.length; i += 1) {
    if (markdown[i] === "\n") offsets.push(i + 1);
  }
  return offsets;
}

/**
 * Split markdown into heading-backed nodes (sections, groups, endpoints)
 * plus table-row endpoints under the current heading.
 */
export function indexMarkdownForSearch(markdown: string): MdSearchNode[] {
  if (!markdown.trim()) return [];

  const lines = markdown.split(/\r?\n/);
  const offsets = lineOffsets(markdown);
  const headingStarts: Array<{
    line: number;
    level: number;
    title: string;
    raw: string;
  }> = [];

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i]!.match(HEADING_RE);
    if (!match) continue;
    headingStarts.push({
      line: i,
      level: match[1]!.length,
      title: match[2]!.trim(),
      raw: lines[i]!,
    });
  }

  const nodes: MdSearchNode[] = [];
  const stack: MdSearchNode[] = [];

  for (let h = 0; h < headingStarts.length; h += 1) {
    const current = headingStarts[h]!;
    const next = headingStarts[h + 1];
    const bodyStartLine = current.line + 1;
    const bodyEndLine = next ? next.line : lines.length;
    const body = lines.slice(bodyStartLine, bodyEndLine).join("\n").trim();
    const startOffset = offsets[current.line] ?? 0;
    const endOffset = next
      ? (offsets[next.line] ?? markdown.length)
      : markdown.length;

    while (stack.length && stack[stack.length - 1]!.level >= current.level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1] ?? null;
    const section =
      current.level === 2
        ? null
        : stack.find((n) => n.level === 2) ??
          (parent?.sectionId
            ? nodes.find((n) => n.id === parent.sectionId) ?? null
            : null);

    const endpointMatch = current.title.match(ENDPOINT_TITLE_RE);
    const method = endpointMatch?.[1]?.toUpperCase();
    const path = endpointMatch?.[2]?.trim();
    const cleanTitle = stripMdInline(current.title);

    let kind: MdSearchKind = "note";
    if (current.level <= 2) kind = "section";
    else if (method && path) kind = "endpoint";
    else if (current.level === 3) kind = "group";
    else kind = "note";

    const breadcrumb = [
      ...stack.map((n) => n.cleanTitle),
      cleanTitle,
    ];

    const id = `h-${current.line}-${current.level}`;
    const summary = summarizeBody(body);
    const authHint = authFromText(current.raw) ?? authFromText(body.slice(0, 240));

    const node: MdSearchNode = {
      id,
      level: current.level,
      title: current.title,
      cleanTitle,
      startOffset,
      endOffset,
      body,
      summary,
      method,
      path,
      authHint,
      parentId: parent?.id ?? null,
      sectionId:
        current.level === 2
          ? id
          : (section?.id ?? parent?.sectionId ?? null),
      breadcrumb,
      kind,
      haystack: [
        cleanTitle,
        method,
        path,
        authHint,
        summary,
        body.replace(FENCE_RE, " ").slice(0, 4000),
        breadcrumb.join(" "),
      ]
        .filter(Boolean)
        .join("\n"),
    };

    nodes.push(node);
    stack.push(node);

    // Table rows that list REST endpoints under this heading
    for (let li = bodyStartLine; li < bodyEndLine; li += 1) {
      const row = lines[li]!.match(TABLE_ENDPOINT_RE);
      if (!row) continue;
      const rowMethod = row[1]!.toUpperCase();
      const rowPath = row[2]!.trim().replace(/^`|`$/g, "");
      const rowNote = stripMdInline(row[3] ?? "");
      const rowOffset = offsets[li] ?? startOffset;
      const rowId = `t-${li}`;
      nodes.push({
        id: rowId,
        level: current.level + 1,
        title: `\`${rowMethod} ${rowPath}\``,
        cleanTitle: `${rowMethod} ${rowPath}`,
        startOffset: rowOffset,
        endOffset: rowOffset + lines[li]!.length,
        body: rowNote,
        summary: rowNote,
        method: rowMethod,
        path: rowPath,
        authHint: node.authHint,
        parentId: node.id,
        sectionId: node.sectionId ?? (node.level === 2 ? node.id : null),
        breadcrumb: [...breadcrumb, `${rowMethod} ${rowPath}`],
        kind: "endpoint",
        haystack: `${rowMethod} ${rowPath} ${rowNote} ${breadcrumb.join(" ")}`,
      });
    }
  }

  return nodes;
}

function isAncestor(ancestor: MdSearchNode, node: MdSearchNode): boolean {
  if (ancestor.id === node.sectionId && ancestor.kind === "section") {
    return node.id !== ancestor.id;
  }
  return (
    node.startOffset >= ancestor.startOffset &&
    node.endOffset <= ancestor.endOffset &&
    node.id !== ancestor.id
  );
}

/**
 * Advanced topic search: fuzzy match + expand matching sections/groups
 * so a query like "chat" returns the whole Messages & chat chapter organized.
 */
export function advancedSearchMarkdown(
  nodes: MdSearchNode[],
  query: string,
  limit = 120,
): AdvancedSearchGroup[] {
  const q = query.trim();
  if (!q || !nodes.length) return [];

  const fuse = new Fuse(nodes, {
    keys: [
      { name: "cleanTitle", weight: 0.45 },
      { name: "path", weight: 0.25 },
      { name: "method", weight: 0.1 },
      { name: "summary", weight: 0.12 },
      { name: "haystack", weight: 0.08 },
    ],
    threshold: 0.42,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: Math.min(2, q.length),
  });

  const fuseHits = fuse.search(q, { limit: Math.min(80, nodes.length) });
  const scoreById = new Map<string, number>();
  for (const hit of fuseHits) {
    // Fuse: lower score = better; invert to 0..1 relevance
    const relevance = 1 - (hit.score ?? 1);
    scoreById.set(hit.item.id, relevance);
  }

  const qLower = q.toLowerCase();
  // Strong substring boost for titles / paths (helps "chat", "auth", "ws")
  for (const node of nodes) {
    const titleHit = node.cleanTitle.toLowerCase().includes(qLower);
    const pathHit = node.path?.toLowerCase().includes(qLower);
    if (titleHit || pathHit) {
      const boost = titleHit && node.kind === "section" ? 0.98 : 0.9;
      scoreById.set(node.id, Math.max(scoreById.get(node.id) ?? 0, boost));
    }
  }

  const selected = new Map<string, AdvancedSearchHit>();

  const addHit = (
    node: MdSearchNode,
    score: number,
    matchedVia: AdvancedSearchHit["matchedVia"],
  ) => {
    const prev = selected.get(node.id);
    if (!prev || score > prev.score) {
      selected.set(node.id, { node, score, matchedVia });
    } else if (prev.matchedVia !== "self" && matchedVia === "self") {
      selected.set(node.id, { ...prev, matchedVia: "self" });
    }
  };

  // Seed with direct hits
  for (const [id, score] of scoreById) {
    if (score < 0.28) continue;
    const node = nodes.find((n) => n.id === id);
    if (!node) continue;
    addHit(node, score, "self");
  }

  // Expand matching sections / groups to include descendant endpoints & groups
  for (const node of nodes) {
    const score = scoreById.get(node.id);
    if (score == null || score < 0.45) continue;
    if (node.kind !== "section" && node.kind !== "group") continue;

    for (const child of nodes) {
      if (!isAncestor(node, child)) continue;
      if (child.kind === "endpoint" || child.kind === "group") {
        addHit(child, score * 0.85, "descendant");
      }
    }
  }

  // Ensure parent groups/sections appear when children match
  for (const hit of [...selected.values()]) {
    if (hit.matchedVia !== "self") continue;
    for (const ancestor of nodes) {
      if (ancestor.kind !== "section" && ancestor.kind !== "group") continue;
      if (!isAncestor(ancestor, hit.node)) continue;
      addHit(ancestor, hit.score * 0.7, "ancestor");
    }
  }

  const bySection = new Map<string, AdvancedSearchHit[]>();
  const sectionNodes = new Map<string, MdSearchNode>();

  for (const hit of selected.values()) {
    const sectionId =
      hit.node.kind === "section"
        ? hit.node.id
        : hit.node.sectionId ?? "__loose__";
    if (!bySection.has(sectionId)) bySection.set(sectionId, []);
    bySection.get(sectionId)!.push(hit);

    if (hit.node.kind === "section") {
      sectionNodes.set(sectionId, hit.node);
    } else if (!sectionNodes.has(sectionId) && hit.node.sectionId) {
      const section = nodes.find((n) => n.id === hit.node.sectionId);
      if (section) sectionNodes.set(sectionId, section);
    }
  }

  const groups: AdvancedSearchGroup[] = [];

  for (const [sectionId, hits] of bySection) {
    const section =
      sectionNodes.get(sectionId) ??
      ({
        id: sectionId,
        level: 2,
        title: "Other matches",
        cleanTitle: "Other matches",
        startOffset: 0,
        endOffset: 0,
        body: "",
        summary: "",
        parentId: null,
        sectionId: null,
        breadcrumb: ["Other matches"],
        kind: "section" as const,
        haystack: "",
      } satisfies MdSearchNode);

    const ranked = hits
      .slice()
      .sort((a, b) => {
        const kindRank = (k: MdSearchKind) =>
          k === "section" ? 0 : k === "group" ? 1 : k === "endpoint" ? 2 : 3;
        const kr = kindRank(a.node.kind) - kindRank(b.node.kind);
        if (kr !== 0) return kr;
        if (b.score !== a.score) return b.score - a.score;
        return a.node.startOffset - b.node.startOffset;
      })
      .slice(0, limit);

    const score = Math.max(...ranked.map((h) => h.score));
    groups.push({ section, score, hits: ranked });
  }

  groups.sort((a, b) => b.score - a.score || a.section.startOffset - b.section.startOffset);
  return groups;
}

export function countAdvancedHits(groups: AdvancedSearchGroup[]): number {
  return groups.reduce((sum, g) => sum + g.hits.length, 0);
}
