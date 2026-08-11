import {
  ExternalLink,
  LocateFixed,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../../utils/cn";
import { usePresence } from "../../utils/use-presence";
import {
  advancedSearchMarkdown,
  countAdvancedHits,
  indexMarkdownForSearch,
  type AdvancedSearchGroup,
  type MdSearchNode,
} from "../../utils/markdown-advanced-search";
import { buildTryInApiClientHref } from "../../utils/api-client-share";
import type { HttpMethod } from "../api-client/types";

type Props = {
  open: boolean;
  markdown: string;
  noteTitle: string;
  onClose: () => void;
  onJumpTo: (offset: number, length?: number) => void;
  initialQuery?: string;
};

const METHOD_COLORS: Record<string, string> = {
  GET: "#22c55e",
  POST: "#f59e0b",
  PUT: "#3b82f6",
  PATCH: "#a855f7",
  DELETE: "#ef4444",
  HEAD: "#94a3b8",
  OPTIONS: "#94a3b8",
};

function detectBaseUrl(markdown: string): string {
  const production = markdown.match(
    /\*\*Production API\*\*\s*\|\s*`([^`]+)`/i,
  );
  if (production?.[1]) return production[1].replace(/\/$/, "");
  const local = markdown.match(/\*\*Local API\*\*\s*\|\s*`([^`]+)`/i);
  if (local?.[1]) return local[1].replace(/\/$/, "");
  return "{{baseUrl}}";
}

function tryHrefForNode(markdown: string, node: MdSearchNode): string | null {
  if (!node.method || !node.path) return null;
  const method = node.method.toUpperCase() as HttpMethod;
  const baseUrl = detectBaseUrl(markdown);
  const path = node.path.trim();
  const absolute =
    path.startsWith("http://") || path.startsWith("https://")
      ? path
      : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

  const auth =
    node.authHint === "Public"
      ? { type: "none" as const }
      : {
          type: "bearer" as const,
          bearerToken: "{{accessToken}}",
        };

  return buildTryInApiClientHref({
    v: 1,
    name: `${method} ${path}`,
    method,
    url: absolute,
    params: [],
    headers: [{ key: "Accept", value: "application/json" }],
    auth,
    body: { mode: "none" },
  });
}

function MethodPill({ method }: { method: string }) {
  const color = METHOD_COLORS[method.toUpperCase()] ?? "#a3a3a3";
  return (
    <span
      className="md-adv-search__method"
      style={{ color, borderColor: `color-mix(in srgb, ${color} 45%, transparent)` }}
    >
      {method.toUpperCase()}
    </span>
  );
}

function ResultCard({
  hit,
  markdown,
  onJump,
}: {
  hit: AdvancedSearchGroup["hits"][number];
  markdown: string;
  onJump: (node: MdSearchNode) => void;
}) {
  const { node, matchedVia } = hit;
  const tryHref = tryHrefForNode(markdown, node);

  if (node.kind === "section") {
    return (
      <article className="md-adv-search__card md-adv-search__card--section">
        <div className="md-adv-search__card-top">
          <h3>{node.cleanTitle}</h3>
          <button
            type="button"
            className="md-adv-search__ghost-btn"
            onClick={() => onJump(node)}
          >
            <LocateFixed className="h-3.5 w-3.5" />
            Jump
          </button>
        </div>
        {node.summary ? <p className="md-adv-search__summary">{node.summary}</p> : null}
      </article>
    );
  }

  if (node.kind === "group") {
    return (
      <div className="md-adv-search__group-label">
        <span>{node.cleanTitle}</span>
        {matchedVia === "self" ? (
          <em className="md-adv-search__via">matched</em>
        ) : null}
        <button
          type="button"
          className="md-adv-search__ghost-btn"
          onClick={() => onJump(node)}
        >
          Jump
        </button>
      </div>
    );
  }

  return (
    <article className="md-adv-search__card md-adv-search__card--endpoint">
      <div className="md-adv-search__card-top">
        <div className="md-adv-search__endpoint-title">
          {node.method ? <MethodPill method={node.method} /> : null}
          <code>{node.path ?? node.cleanTitle}</code>
          {node.authHint ? (
            <span className="md-adv-search__auth">{node.authHint}</span>
          ) : null}
        </div>
        <div className="md-adv-search__card-actions">
          {tryHref ? (
            <a
              href={tryHref}
              target="_blank"
              rel="noopener noreferrer"
              className="md-adv-search__try"
            >
              Try
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
          <button
            type="button"
            className="md-adv-search__ghost-btn"
            onClick={() => onJump(node)}
          >
            <LocateFixed className="h-3.5 w-3.5" />
            Jump
          </button>
        </div>
      </div>
      {node.summary ? <p className="md-adv-search__summary">{node.summary}</p> : null}
      {node.breadcrumb.length > 1 ? (
        <p className="md-adv-search__crumb">
          {node.breadcrumb.slice(0, -1).join(" › ")}
        </p>
      ) : null}
    </article>
  );
}

export function AdvancedSearchDialog({
  open,
  markdown,
  noteTitle,
  onClose,
  onJumpTo,
  initialQuery = "",
}: Props) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const { present, active } = usePresence(open, 220);

  const index = useMemo(
    () => indexMarkdownForSearch(markdown),
    [markdown],
  );

  const groups = useMemo(
    () => advancedSearchMarkdown(index, deferredQuery),
    [index, deferredQuery],
  );

  const hitCount = useMemo(() => countAdvancedHits(groups), [groups]);
  const isStale = query.trim() !== deferredQuery.trim();

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!present) return null;

  const handleJump = (node: MdSearchNode) => {
    const length =
      node.kind === "endpoint" && node.path
        ? Math.min(node.endOffset - node.startOffset, 120)
        : Math.min(80, node.cleanTitle.length + 4);
    onJumpTo(node.startOffset, length);
  };

  return (
    <div
      className={cn("md-adv-search-root", active && "is-active")}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn("md-adv-search", active && "is-active")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="md-adv-search__header">
          <div className="md-adv-search__heading">
            <Sparkles className="h-4 w-4" style={{ color: "var(--md-accent)" }} />
            <div>
              <h2 id={titleId}>Advanced search</h2>
              <p>
                Structured results from{" "}
                <strong>{noteTitle || "current note"}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="md-adv-search__close"
            onClick={onClose}
            aria-label="Close advanced search"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="md-adv-search__query">
          <Search className="md-adv-search__query-icon h-4 w-4" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try “chat”, “auth”, “websocket”, “upload”…'
            aria-label="Advanced search query"
          />
          <span
            className={cn(
              "md-adv-search__meta",
              isStale && "md-adv-search__meta--stale",
            )}
          >
            {deferredQuery.trim()
              ? `${hitCount} match${hitCount === 1 ? "" : "es"} · ${groups.length} section${groups.length === 1 ? "" : "s"}`
              : `${index.length} indexed blocks`}
          </span>
        </div>

        <div className="md-adv-search__body">
          {!deferredQuery.trim() ? (
            <div className="md-adv-search__empty">
              <p>
                Search topics, paths, or verbs. Matching chapters expand so you
                get the full related surface — not just line snippets.
              </p>
              <ul>
                <li>
                  <button type="button" onClick={() => setQuery("chat")}>
                    chat
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => setQuery("auth")}>
                    auth
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => setQuery("websocket")}>
                    websocket
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => setQuery("upload")}>
                    upload
                  </button>
                </li>
              </ul>
            </div>
          ) : groups.length === 0 ? (
            <div className="md-adv-search__empty">
              <p>No structured matches for “{deferredQuery.trim()}”.</p>
            </div>
          ) : (
            <div className="md-adv-search__groups">
              {groups.map((group) => (
                <section key={group.section.id} className="md-adv-search__section">
                  <header className="md-adv-search__section-head">
                    <h3>{group.section.cleanTitle}</h3>
                    <span>
                      {
                        group.hits.filter((h) => h.node.kind === "endpoint")
                          .length
                      }{" "}
                      endpoints
                    </span>
                  </header>
                  <div className="md-adv-search__section-body">
                    {group.hits.map((hit) => (
                      <ResultCard
                        key={hit.node.id}
                        hit={hit}
                        markdown={markdown}
                        onJump={handleJump}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
