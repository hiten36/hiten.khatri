import { MarkdownClient } from "@comark/react";
import math from "@comark/react/plugins/math";
import shiki from "@comark/react/plugins/shiki";
import {
  ChevronDown,
  ChevronUp,
  Download,
  FilePlus,
  FileUp,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Search,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import Fuse from "fuse.js";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { cn } from "../../utils/cn";
import { enhanceMarkdownWithApiTryLinks } from "../../utils/markdown-api-links";
import {
  SAMPLE_MARKDOWN,
  createMarkdownDoc,
  deleteMarkdownDoc,
  getActiveMarkdownId,
  listMarkdownDocs,
  setActiveMarkdownId,
  updateMarkdownDoc,
  upsertImportedMarkdown,
  type MarkdownDoc,
} from "../../utils/markdown-storage";
import {
  getStoredMdTheme,
  setStoredMdTheme,
  type MdTheme,
} from "../../utils/markdown-theme";
import { AdvancedSearchDialog } from "./AdvancedSearchDialog";
import "katex/dist/katex.min.css";

const MD_PLUGINS = [
  shiki({
    preStyles: true,
  }),
  math(),
];

function MdLink({
  href,
  children,
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) {
  const isApiTry = Boolean(href?.includes("/api-client#try="));

  return (
    <a
      {...props}
      href={href}
      className={cn(className, isApiTry && "md-api-try__link")}
      target={isApiTry ? "_blank" : props.target}
      rel={isApiTry ? "noopener noreferrer" : props.rel}
    >
      {children}
    </a>
  );
}

const MD_COMPONENTS = {
  a: MdLink,
};

type ViewMode = "split" | "edit" | "preview";

function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(ts).toLocaleDateString();
}

function slugifyFilename(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "note"
  );
}

function applyTheme(theme: MdTheme) {
  document.documentElement.dataset.mdTheme = theme;
  setStoredMdTheme(theme);
}

export default function MarkdownWorkspace() {
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<MdTheme>("dark");
  const [docs, setDocs] = useState<MarkdownDoc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [status, setStatus] = useState<string | null>(null);
  const [notesQuery, setNotesQuery] = useState("");
  const [findQuery, setFindQuery] = useState("");
  const [findIndex, setFindIndex] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedSeed, setAdvancedSeed] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const previewContent = useMemo(
    () => enhanceMarkdownWithApiTryLinks(content),
    [content],
  );

  const notesFuse = useMemo(
    () =>
      new Fuse(docs, {
        keys: [
          { name: "title", weight: 0.7 },
          { name: "content", weight: 0.3 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [docs],
  );

  const filteredDocs = useMemo(() => {
    const q = notesQuery.trim();
    if (!q) return docs;
    return notesFuse.search(q).map((hit) => hit.item);
  }, [docs, notesFuse, notesQuery]);

  const findMatches = useMemo(() => {
    const q = findQuery.trim();
    if (!q) return [] as number[];
    const haystack = content.toLowerCase();
    const needle = q.toLowerCase();
    const indexes: number[] = [];
    let from = 0;
    while (from <= haystack.length) {
      const at = haystack.indexOf(needle, from);
      if (at === -1) break;
      indexes.push(at);
      from = at + Math.max(needle.length, 1);
    }
    return indexes;
  }, [content, findQuery]);

  useEffect(() => {
    setFindIndex(-1);
  }, [findQuery, activeId]);

  const jumpToMatch = useCallback(
    (nextIndex: number) => {
      if (!findMatches.length) return;
      const safe =
        ((nextIndex % findMatches.length) + findMatches.length) %
        findMatches.length;
      setFindIndex(safe);
      const start = findMatches[safe]!;
      const end = start + findQuery.trim().length;

      const editor = editorRef.current;
      if (editor && (viewMode === "edit" || viewMode === "split")) {
        editor.focus();
        editor.setSelectionRange(start, end);
        const lineHeight = 22;
        const before = content.slice(0, start);
        const line = before.split("\n").length - 1;
        editor.scrollTop = Math.max(
          0,
          line * lineHeight - editor.clientHeight / 3,
        );
      }

      const preview = previewRef.current;
      if (preview && (viewMode === "preview" || viewMode === "split")) {
        const needle = findQuery.trim();
        if (!needle) return;
        const walker = document.createTreeWalker(
          preview,
          NodeFilter.SHOW_TEXT,
        );
        let node = walker.nextNode();
        let remaining = safe;
        const needleLower = needle.toLowerCase();
        while (node) {
          const text = node.textContent ?? "";
          const lower = text.toLowerCase();
          let pos = 0;
          while (true) {
            const at = lower.indexOf(needleLower, pos);
            if (at === -1) break;
            if (remaining === 0) {
              node.parentElement?.scrollIntoView({
                block: "center",
                behavior: "smooth",
              });
              return;
            }
            remaining -= 1;
            pos = at + Math.max(needle.length, 1);
          }
          node = walker.nextNode();
        }
      }
    },
    [content, findMatches, findQuery, viewMode],
  );

  const openAdvancedSearch = useCallback((seed = "") => {
    setAdvancedSeed(seed);
    setAdvancedOpen(true);
  }, []);

  const jumpToOffset = useCallback(
    (offset: number, length = 40) => {
      setAdvancedOpen(false);
      const editor = editorRef.current;
      if (editor && (viewMode === "edit" || viewMode === "split")) {
        const end = Math.min(content.length, offset + length);
        editor.focus();
        editor.setSelectionRange(offset, end);
        const lineHeight = 22;
        const before = content.slice(0, offset);
        const line = before.split("\n").length - 1;
        editor.scrollTop = Math.max(
          0,
          line * lineHeight - editor.clientHeight / 3,
        );
      }

      // Align basic find highlight with jumped text when possible
      const lineText = content.slice(offset, offset + 80).split("\n")[0] ?? "";
      const snippet = lineText.replace(/^#+\s*/, "").slice(0, 48).trim();
      if (snippet) {
        setFindQuery(snippet.replace(/`/g, ""));
      }

      const preview = previewRef.current;
      if (preview && (viewMode === "preview" || viewMode === "split")) {
        const needle = content
          .slice(offset, offset + 60)
          .replace(/^#+\s*/, "")
          .replace(/`/g, "")
          .trim()
          .slice(0, 40);
        if (!needle) return;
        const walker = document.createTreeWalker(
          preview,
          NodeFilter.SHOW_TEXT,
        );
        let node = walker.nextNode();
        const needleLower = needle.toLowerCase();
        while (node) {
          const text = (node.textContent ?? "").toLowerCase();
          if (text.includes(needleLower.slice(0, Math.min(24, needleLower.length)))) {
            node.parentElement?.scrollIntoView({
              block: "center",
              behavior: "smooth",
            });
            break;
          }
          node = walker.nextNode();
        }
      }
    },
    [content, viewMode],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "k") return;
      e.preventDefault();
      openAdvancedSearch(findQuery.trim());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [findQuery, openAdvancedSearch]);

  const refreshDocs = useCallback(() => {
    setDocs(listMarkdownDocs());
  }, []);

  const loadDoc = useCallback((doc: MarkdownDoc) => {
    setActiveId(doc.id);
    setTitle(doc.title);
    setContent(doc.content);
    setDirty(false);
    setActiveMarkdownId(doc.id);
  }, []);

  useEffect(() => {
    const initialTheme = getStoredMdTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);

    let docsList = listMarkdownDocs();
    if (docsList.length === 0) {
      const seed = createMarkdownDoc({
        title: "Getting started",
        content: SAMPLE_MARKDOWN,
      });
      docsList = [seed];
    }

    setDocs(docsList);
    const active =
      docsList.find((d) => d.id === getActiveMarkdownId()) ?? docsList[0];
    loadDoc(active);
    setReady(true);

    return () => {
      delete document.documentElement.dataset.mdTheme;
    };
  }, [loadDoc]);

  const persist = useCallback(
    (nextTitle = title, nextContent = content) => {
      if (!activeId) return;
      const updated = updateMarkdownDoc(activeId, {
        title: nextTitle,
        content: nextContent,
      });
      if (!updated) return;
      setDirty(false);
      setStatus("Saved");
      refreshDocs();
      window.setTimeout(() => setStatus(null), 1600);
    },
    [activeId, content, refreshDocs, title],
  );

  const scheduleAutosave = useCallback(
    (nextTitle: string, nextContent: string) => {
      setDirty(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        persist(nextTitle, nextContent);
      }, 700);
    },
    [persist],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const toggleTheme = () => {
    const next: MdTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  const handleNew = () => {
    const doc = createMarkdownDoc({ title: "Untitled", content: "" });
    refreshDocs();
    loadDoc(doc);
    setStatus("Created");
  };

  const handleDelete = () => {
    if (!activeId) return;
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    deleteMarkdownDoc(activeId);
    const remaining = listMarkdownDocs();
    setDocs(remaining);
    if (remaining[0]) loadDoc(remaining[0]);
    else {
      const doc = createMarkdownDoc({
        title: "Untitled",
        content: "",
      });
      setDocs([doc]);
      loadDoc(doc);
    }
    setStatus("Deleted");
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const text = await file.text();
    const name = file.name.replace(/\.(md|markdown|txt)$/i, "") || "Imported";
    const doc = upsertImportedMarkdown(name, text);
    refreshDocs();
    loadDoc(doc);
    setStatus(`Imported ${file.name}`);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugifyFilename(title)}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!ready) {
    return (
      <div className="md-studio flex min-h-[70vh] items-center justify-center text-sm text-[var(--md-text-soft)]">
        Loading workspace…
      </div>
    );
  }

  return (
    <div
      className="md-studio relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col px-3 py-4 md:px-6 md:py-6"
      data-theme={theme}
    >
      <header
        className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-4"
        style={{ borderColor: "var(--md-border)" }}
      >
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: "var(--md-accent)" }}
          >
            Local workspace
          </p>
          <h1
            className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold md:text-3xl"
            style={{ color: "var(--md-text)" }}
          >
            Markdown Studio
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--md-text-muted)" }}
          >
            Draft, upload, preview, and save Markdown — stored only in your
            browser.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="md-theme-toggle"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            <span className="md-theme-toggle__icons" aria-hidden>
              <Sun className="icon-sun" />
              <Moon className="icon-moon" />
            </span>
            <span className="md-theme-toggle__thumb" />
          </button>

          <a
            href="/"
            className="rounded-md border px-3 py-1.5 text-sm transition hover:border-[color-mix(in_srgb,var(--md-accent)_55%,transparent)]"
            style={{
              borderColor: "var(--md-border-strong)",
              color: "var(--md-text-muted)",
            }}
          >
            ← Portfolio
          </a>
          <span
            className="text-xs"
            style={{ color: "var(--md-text-soft)" }}
          >
            {status ?? (dirty ? "Unsaved changes" : "All changes saved")}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-3">
        <aside
          className={cn(
            "shrink-0 overflow-hidden rounded-xl border transition-all",
            sidebarOpen ? "w-64 p-3" : "w-0 border-0 p-0",
          )}
          style={{
            borderColor: "var(--md-border)",
            background: "var(--md-surface-strong)",
          }}
        >
          {sidebarOpen && (
            <div className="flex h-full flex-col">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--md-text-soft)" }}
                >
                  Notes
                </h2>
                <button
                  type="button"
                  onClick={handleNew}
                  className="inline-flex items-center gap-1 rounded-md bg-orange-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-orange-500"
                >
                  <FilePlus className="h-3.5 w-3.5" />
                  New
                </button>
              </div>
              <label className="relative mb-2 block">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 opacity-60"
                  style={{ color: "var(--md-text-soft)" }}
                />
                <input
                  value={notesQuery}
                  onChange={(e) => setNotesQuery(e.target.value)}
                  placeholder="Search notes…"
                  aria-label="Search notes"
                  className="w-full rounded-md border py-1.5 pr-2 pl-7 text-xs outline-none ring-[color-mix(in_srgb,var(--md-accent)_40%,transparent)] focus:ring-1"
                  style={{
                    borderColor: "var(--md-border)",
                    background: "var(--md-input)",
                    color: "var(--md-text)",
                  }}
                />
              </label>
              <ul className="space-y-1 overflow-y-auto pr-1">
                {filteredDocs.length === 0 ? (
                  <li
                    className="px-2 py-3 text-xs"
                    style={{ color: "var(--md-text-soft)" }}
                  >
                    No notes match.
                  </li>
                ) : (
                  filteredDocs.map((doc) => (
                    <li key={doc.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (dirty && activeId) persist();
                          loadDoc(doc);
                        }}
                        className={cn(
                          "w-full rounded-lg px-2.5 py-2 text-left transition",
                          doc.id === activeId
                            ? "ring-1"
                            : "hover:bg-[var(--md-hover)]",
                        )}
                        style={
                          doc.id === activeId
                            ? {
                                background: "var(--md-accent-soft)",
                                boxShadow:
                                  "inset 0 0 0 1px color-mix(in srgb, var(--md-accent) 40%, transparent)",
                              }
                            : undefined
                        }
                      >
                        <div
                          className="truncate text-sm font-medium"
                          style={{ color: "var(--md-text)" }}
                        >
                          {doc.title}
                        </div>
                        <div
                          className="mt-0.5 text-[11px]"
                          style={{ color: "var(--md-text-soft)" }}
                        >
                          {formatRelative(doc.updatedAt)}
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </aside>

        <section
          className="flex min-w-0 flex-1 flex-col rounded-xl border"
          style={{
            borderColor: "var(--md-border)",
            background: "var(--md-surface)",
          }}
        >
          <div
            className="flex flex-wrap items-center gap-2 border-b p-3"
            style={{ borderColor: "var(--md-border)" }}
          >
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="rounded-md border p-2 transition hover:opacity-90"
              style={{
                borderColor: "var(--md-border-strong)",
                color: "var(--md-text-muted)",
              }}
              aria-label={sidebarOpen ? "Hide notes" : "Show notes"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>

            <input
              value={title}
              onChange={(e) => {
                const next = e.target.value;
                setTitle(next);
                scheduleAutosave(next, content);
              }}
              className="min-w-[8rem] flex-1 rounded-md border px-3 py-2 text-sm font-semibold outline-none ring-[color-mix(in_srgb,var(--md-accent)_40%,transparent)] focus:ring-1"
              style={{
                borderColor: "var(--md-border)",
                background: "var(--md-input)",
                color: "var(--md-text)",
              }}
              placeholder="Note title"
              aria-label="Note title"
            />

            <div
              className="flex min-w-[12rem] flex-1 items-center gap-1 rounded-md border px-2 py-1"
              style={{
                borderColor: "var(--md-border-strong)",
                background: "var(--md-input)",
              }}
            >
              <Search
                className="h-3.5 w-3.5 shrink-0 opacity-60"
                style={{ color: "var(--md-text-soft)" }}
              />
              <input
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!findMatches.length) return;
                    jumpToMatch(
                      e.shiftKey
                        ? findIndex < 0
                          ? findMatches.length - 1
                          : findIndex - 1
                        : findIndex + 1,
                    );
                  }
                  if (e.key === "Escape") {
                    setFindQuery("");
                    e.currentTarget.blur();
                  }
                }}
                placeholder="Find in note…"
                aria-label="Find in note"
                className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                style={{ color: "var(--md-text)" }}
              />
              {findQuery.trim() ? (
                <span
                  className="shrink-0 text-[10px] tabular-nums"
                  style={{ color: "var(--md-text-soft)" }}
                >
                  {findMatches.length
                    ? findIndex < 0
                      ? `–/${findMatches.length}`
                      : `${findIndex + 1}/${findMatches.length}`
                    : "0"}
                </span>
              ) : null}
              <button
                type="button"
                className="rounded p-0.5 transition hover:bg-[var(--md-hover)] disabled:opacity-40"
                style={{ color: "var(--md-text-muted)" }}
                disabled={!findMatches.length}
                aria-label="Previous match"
                onClick={() =>
                  jumpToMatch(
                    findIndex < 0 ? findMatches.length - 1 : findIndex - 1,
                  )
                }
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="rounded p-0.5 transition hover:bg-[var(--md-hover)] disabled:opacity-40"
                style={{ color: "var(--md-text-muted)" }}
                disabled={!findMatches.length}
                aria-label="Next match"
                onClick={() => jumpToMatch(findIndex + 1)}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => openAdvancedSearch(findQuery.trim())}
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition hover:border-[color-mix(in_srgb,var(--md-accent)_50%,transparent)]"
              style={{
                borderColor: "var(--md-border-strong)",
                color: "var(--md-accent)",
                background: "var(--md-accent-soft)",
              }}
              title="Advanced search (Ctrl+K)"
              aria-label="Open advanced search"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Advanced
              <kbd
                className="hidden rounded border px-1 py-0.5 text-[10px] font-medium sm:inline"
                style={{
                  borderColor: "var(--md-border)",
                  color: "var(--md-text-soft)",
                }}
              >
                ⌘K
              </kbd>
            </button>

            <div
              className="flex rounded-md border p-0.5 text-xs"
              style={{ borderColor: "var(--md-border-strong)" }}
            >
              {(["edit", "split", "preview"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className="rounded px-2.5 py-1.5 capitalize transition"
                  style={
                    viewMode === mode
                      ? {
                          background: "var(--md-hover)",
                          color: "var(--md-text)",
                        }
                      : { color: "var(--md-text-soft)" }
                  }
                >
                  {mode}
                </button>
              ))}
            </div>

            {(
              [
                {
                  label: "Save",
                  icon: Save,
                  onClick: () => persist(),
                },
                {
                  label: "Upload",
                  icon: FileUp,
                  onClick: () => fileInputRef.current?.click(),
                },
                {
                  label: "Export",
                  icon: Download,
                  onClick: handleDownload,
                },
              ] as const
            ).map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition hover:border-[color-mix(in_srgb,var(--md-accent)_50%,transparent)]"
                style={{
                  borderColor: "var(--md-border-strong)",
                  color: "var(--md-text-muted)",
                }}
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </button>
            ))}

            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition"
              style={{
                borderColor: "var(--md-danger-border)",
                color: "var(--md-danger-text)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--md-danger-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              className="hidden"
              onChange={handleUpload}
            />
          </div>

          <div
            className={cn(
              "grid min-h-[70vh] flex-1",
              viewMode === "split"
                ? "grid-cols-1 lg:grid-cols-2"
                : "grid-cols-1",
            )}
          >
            {(viewMode === "edit" || viewMode === "split") && (
              <div
                className={cn("min-h-[50vh]", viewMode === "split" && "lg:border-r")}
                style={{ borderColor: "var(--md-border)" }}
              >
                <label className="sr-only" htmlFor="md-editor">
                  Markdown source
                </label>
                <textarea
                  ref={editorRef}
                  id="md-editor"
                  value={content}
                  onChange={(e) => {
                    const next = e.target.value;
                    setContent(next);
                    scheduleAutosave(title, next);
                  }}
                  spellCheck={false}
                  className="h-full min-h-[50vh] w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed outline-none placeholder:opacity-50"
                  style={{ color: "var(--md-text)" }}
                  placeholder="# Start writing Markdown…"
                />
              </div>
            )}

            {(viewMode === "preview" || viewMode === "split") && (
              <div
                ref={previewRef}
                className="min-h-[50vh] overflow-auto p-4 md:p-6"
              >
                {content.trim() ? (
                  <MarkdownClient
                    value={previewContent}
                    plugins={MD_PLUGINS}
                    components={MD_COMPONENTS}
                    className="md-prose"
                    streaming
                  />
                ) : (
                  <p
                    className="text-sm"
                    style={{ color: "var(--md-text-soft)" }}
                  >
                    Preview appears here as you type.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <AdvancedSearchDialog
        open={advancedOpen}
        markdown={content}
        noteTitle={title}
        initialQuery={advancedSeed}
        onClose={() => setAdvancedOpen(false)}
        onJumpTo={jumpToOffset}
      />
    </div>
  );
}
