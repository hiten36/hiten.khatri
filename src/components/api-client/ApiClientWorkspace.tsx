import {
  Download,
  Moon,
  Plus,
  Save,
  Send,
  Square,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
} from "react-resizable-panels";
import type {
  ExecuteResponse,
  HistoryEntry,
  SavedRequest,
} from "./types";
import { createRequestDraft } from "../../utils/api-client-db";
import {
  clearTryHashFromLocation,
  readTryPayloadFromLocation,
  tryPayloadToDraft,
} from "../../utils/api-client-share";
import {
  applyApiTheme,
  getStoredApiTheme,
  setStoredApiTheme,
} from "../../utils/api-client-theme";
import {
  buildProxyPayload,
  buildVariableMap,
  executeRequest,
  findUnresolvedVariables,
  toCurl,
} from "../../services/api-client";
import { ApiClientProvider, useActiveEnvironment, useApiClient } from "./state/ApiClientContext";
import { createHistoryEntry } from "./state/reducer";
import { Sidebar } from "./sidebar/Sidebar";
import { RequestEditor } from "./request/RequestEditor";
import { ResponseViewer } from "./response/ResponseViewer";
import { ImportExportModal } from "./modals/ImportExportModal";
import { toast, Toaster } from "sonner";
import {
  Button,
  IconButton,
  Modal,
  Select,
} from "./shared/ui";

function WorkspaceInner() {
  const { store, ready, dispatch, activeTab, saveError } = useApiClient();
  const environment = useActiveEnvironment();
  const [theme, setTheme] = useState(getStoredApiTheme);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveCollectionId, setSaveCollectionId] = useState("");
  const [response, setResponse] = useState<ExecuteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const { defaultLayout: sideLayout, onLayoutChanged: onSideLayoutChanged } =
    useDefaultLayout({
      // v2: previous ids stored broken pixel-sized layouts from numeric props
      id: "ac-side-v2",
      storage: typeof localStorage === "undefined" ? undefined : localStorage,
    });
  const { defaultLayout: mainLayout, onLayoutChanged: onMainLayoutChanged } =
    useDefaultLayout({
      id: "ac-main-v2",
      storage: typeof localStorage === "undefined" ? undefined : localStorage,
    });

  useEffect(() => {
    applyApiTheme(theme);
    setStoredApiTheme(theme);
    dispatch({ type: "SET_PREFERENCES", patch: { theme } });
  }, [theme, dispatch]);

  useEffect(() => {
    // Drop broken pixel layouts saved before percentage-based panel sizes.
    try {
      for (const key of Object.keys(localStorage)) {
        if (
          (key.includes("ac-side") || key.includes("ac-main")) &&
          !key.includes("ac-side-v2") &&
          !key.includes("ac-main-v2")
        ) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const payload = readTryPayloadFromLocation();
    if (!payload) return;

    try {
      const draft = tryPayloadToDraft(payload);
      dispatch({
        type: "OPEN_TAB",
        tab: {
          id: `tab_${crypto.randomUUID()}`,
          draft,
          dirty: true,
          originRequestId: null,
        },
      });
      clearTryHashFromLocation();
      toast.success("Request loaded from Markdown", {
        description: `${draft.method} ${draft.url}`,
      });
    } catch {
      toast.error("Could not load the shared API request.");
      clearTryHashFromLocation();
    }
  }, [ready, dispatch]);

  const collectionVariables = useMemo(() => {
    const collectionId = activeTab?.draft.collectionId;
    if (!collectionId) return [];
    return (
      store.collections.find((item) => item.id === collectionId)?.variables ?? []
    );
  }, [activeTab?.draft.collectionId, store.collections]);

  const unresolved = useMemo(() => {
    if (!activeTab) return [];
    return findUnresolvedVariables(
      activeTab.draft,
      buildVariableMap(environment, collectionVariables),
    );
  }, [activeTab, environment, collectionVariables]);

  const openRequest = useCallback(
    (request: SavedRequest) => {
      dispatch({
        type: "OPEN_TAB",
        tab: {
          id: `tab_${crypto.randomUUID()}`,
          draft: structuredClone(request),
          dirty: false,
          originRequestId: request.id,
        },
      });
      setMobileSidebar(false);
      setResponse(null);
    },
    [dispatch],
  );

  const openHistory = useCallback(
    (entry: HistoryEntry) => {
      dispatch({
        type: "OPEN_TAB",
        tab: {
          id: `tab_${crypto.randomUUID()}`,
          draft: structuredClone(entry.requestSnapshot),
          dirty: true,
          originRequestId: null,
        },
      });
      setResponse({
        ok: entry.status >= 200 && entry.status < 400,
        status: entry.status,
        statusText: entry.statusText,
        headers: [],
        mimeType: entry.mimeType,
        bodyText: entry.bodyPreview,
        bodyEncoding: "utf8",
        truncated: true,
        durationMs: entry.durationMs,
        sizeBytes: entry.sizeBytes,
      });
      setMobileSidebar(false);
    },
    [dispatch],
  );

  const send = useCallback(async () => {
    if (!activeTab || loading) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setResponse(null);

    try {
      const result = await executeRequest(activeTab.draft, {
        environment,
        collectionVariables,
        signal: controller.signal,
      });
      setResponse(result);

      let resolvedUrl = activeTab.draft.url;
      try {
        resolvedUrl = buildProxyPayload(
          activeTab.draft,
          buildVariableMap(environment, collectionVariables),
        ).resolvedUrl;
      } catch {
        // keep draft url
      }

      dispatch({
        type: "PUSH_HISTORY",
        entry: createHistoryEntry(activeTab.draft, result, resolvedUrl),
      });

      if (result.ok) {
        toast.success(`${result.status} ${result.statusText || "OK"}`, {
          description: `${result.durationMs} ms · ${result.sizeBytes} B`,
        });
      } else if (result.error) {
        toast.error(result.error);
      } else {
        toast.warning(`${result.status} ${result.statusText || "Error"}`);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.message("Request cancelled");
      } else {
        const message = error instanceof Error ? error.message : "Request failed";
        toast.error(message);
        setResponse({
          ok: false,
          status: 0,
          statusText: "Error",
          headers: [],
          mimeType: "text/plain",
          bodyText: message,
          bodyEncoding: "utf8",
          truncated: false,
          durationMs: 0,
          sizeBytes: 0,
          error: "Request failed",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, collectionVariables, dispatch, environment, loading]);

  const cancel = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingSurface =
        tag === "textarea" ||
        target?.isContentEditable ||
        target?.closest?.(".cm-editor") != null;

      const meta = event.metaKey || event.ctrlKey;

      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        // Enter sends from URL/method controls; Cmd/Ctrl+Enter sends from anywhere except editors
        const fromUrlBar =
          target?.id === "ac-url-input" ||
          target?.classList?.contains("ac-method-select");
        if ((fromUrlBar || meta) && !isTypingSurface) {
          event.preventDefault();
          void send();
          return;
        }
      }

      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        setSaveOpen(true);
      }
      if (meta && event.key.toLowerCase() === "l") {
        event.preventDefault();
        document.getElementById("ac-url-input")?.focus();
      }
      if (event.key === "Escape") {
        setImportOpen(false);
        setExportOpen(false);
        setSaveOpen(false);
        setMobileSidebar(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [send]);

  if (!ready) {
    return <div className="ac-boot">Loading API Client…</div>;
  }

  return (
    <div className="ac-app" data-theme={theme}>
      <header className="ac-topbar">
        <div className="ac-topbar__brand">
          <button
            type="button"
            className="ac-mobile-toggle"
            onClick={() => setMobileSidebar(true)}
          >
            Menu
          </button>
          <div>
            <strong>API Client</strong>
            <span>Local-first workspace</span>
          </div>
        </div>

        <div className="ac-topbar__controls">
          <Select
            aria-label="Active environment"
            value={store.preferences.activeEnvironmentId ?? ""}
            onChange={(event) =>
              dispatch({
                type: "SET_ACTIVE_ENVIRONMENT",
                environmentId: event.target.value || null,
              })
            }
          >
            <option value="">No environment</option>
            {store.environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </Select>

          <Button size="sm" onClick={() => setImportOpen(true)}>
            <Upload size={14} /> Import
          </Button>
          <Button size="sm" onClick={() => setExportOpen(true)}>
            <Download size={14} /> Export
          </Button>
          <button
            type="button"
            className="ac-theme-toggle"
            aria-label="Toggle theme"
            onClick={() => setTheme((value) => (value === "light" ? "dark" : "light"))}
          >
            <span className="ac-theme-toggle__thumb">
              {theme === "light" ? <Sun size={14} /> : <Moon size={14} />}
            </span>
          </button>
        </div>
      </header>

      <div className={`ac-shell ${mobileSidebar ? "is-mobile-open" : ""}`}>
        <div className="ac-desktop-layout">
          <Group
            orientation="horizontal"
            defaultLayout={sideLayout}
            onLayoutChanged={onSideLayoutChanged}
            className="ac-group"
          >
            <Panel
              id="sidebar"
              className="ac-panel-shell"
              defaultSize="28%"
              minSize="220px"
              maxSize="45%"
              collapsible
              collapsedSize="0px"
            >
              <Sidebar onOpenRequest={openRequest} onOpenHistory={openHistory} />
            </Panel>
            <Separator className="ac-separator ac-separator--vertical" />
            <Panel id="main" className="ac-panel-shell" minSize="40%" defaultSize="72%">
              <div className="ac-main">
                <div className="ac-tabs">
                  <div className="ac-tabs__list">
                    {store.tabs.map((tab) => (
                      <div
                        key={tab.id}
                        className={`ac-tab ${tab.id === store.activeTabId ? "is-active" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            dispatch({ type: "SET_ACTIVE_TAB", tabId: tab.id })
                          }
                        >
                          {tab.dirty ? "• " : ""}
                          {tab.draft.name}
                        </button>
                        <IconButton
                          label="Close tab"
                          onClick={() =>
                            dispatch({ type: "CLOSE_TAB", tabId: tab.id })
                          }
                        >
                          <X size={12} />
                        </IconButton>
                      </div>
                    ))}
                  </div>
                  <div className="ac-tabs__actions">
                    <IconButton
                      label="New request tab"
                      onClick={() =>
                        dispatch({
                          type: "OPEN_TAB",
                          tab: {
                            id: `tab_${crypto.randomUUID()}`,
                            draft: createRequestDraft(),
                            dirty: true,
                            originRequestId: null,
                          },
                        })
                      }
                    >
                      <Plus size={14} />
                    </IconButton>
                    <Button size="sm" onClick={() => setSaveOpen(true)}>
                      <Save size={14} /> Save
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!activeTab) return;
                        const curl = toCurl(activeTab.draft, environment);
                        await navigator.clipboard.writeText(curl);
                        toast.success("cURL copied");
                      }}
                    >
                      Copy cURL
                    </Button>
                    {loading ? (
                      <Button size="sm" variant="danger" onClick={cancel}>
                        <Square size={14} /> Cancel
                      </Button>
                    ) : (
                      <Button size="sm" variant="primary" onClick={() => void send()}>
                        <Send size={14} /> Send
                      </Button>
                    )}
                  </div>
                </div>

                {unresolved.length ? (
                  <div className="ac-banner ac-banner--warn">
                    Unresolved variables: {unresolved.map((item) => `{{${item}}}`).join(", ")}
                  </div>
                ) : null}
                {saveError ? (
                  <div className="ac-banner ac-banner--danger">{saveError}</div>
                ) : null}

                <Group
                  orientation="vertical"
                  defaultLayout={mainLayout}
                  onLayoutChanged={onMainLayoutChanged}
                  className="ac-group ac-group--main"
                >
                  <Panel
                    id="request"
                    className="ac-panel-shell"
                    defaultSize="58%"
                    minSize="30%"
                  >
                    {activeTab ? (
                      <RequestEditor
                        draft={activeTab.draft}
                        theme={theme}
                        onSend={() => void send()}
                        onChange={(patch) =>
                          dispatch({ type: "UPDATE_ACTIVE_DRAFT", patch })
                        }
                        onReplace={(next) =>
                          dispatch({
                            type: "REPLACE_ACTIVE_DRAFT",
                            draft: next,
                            dirty: true,
                          })
                        }
                      />
                    ) : null}
                  </Panel>
                  <Separator className="ac-separator ac-separator--horizontal" />
                  <Panel
                    id="response"
                    className="ac-panel-shell"
                    defaultSize="42%"
                    minSize="22%"
                  >
                    <ResponseViewer
                      response={response}
                      loading={loading}
                      theme={theme}
                    />
                  </Panel>
                </Group>
              </div>
            </Panel>
          </Group>
        </div>

        {mobileSidebar ? (
          <div className="ac-mobile-drawer">
            <div className="ac-mobile-drawer__backdrop" onClick={() => setMobileSidebar(false)} />
            <div className="ac-mobile-drawer__panel">
              <Sidebar onOpenRequest={openRequest} onOpenHistory={openHistory} />
            </div>
          </div>
        ) : null}
      </div>

      <Modal open={saveOpen} title="Save request" onClose={() => setSaveOpen(false)}>
        <label className="ac-field">
          <span>Collection</span>
          <Select
            value={saveCollectionId}
            onChange={(event) => setSaveCollectionId(event.target.value)}
          >
            <option value="">Select collection…</option>
            {store.collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </Select>
        </label>
        <div className="ac-modal__actions">
          <Button onClick={() => setSaveOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!saveCollectionId || !activeTab}
            onClick={() => {
              if (!saveCollectionId) return;
              dispatch({
                type: "SAVE_REQUEST_TO_COLLECTION",
                collectionId: saveCollectionId,
              });
              toast.success("Request saved");
              setSaveOpen(false);
            }}
          >
            Save
          </Button>
        </div>
      </Modal>

      <ImportExportModal
        open={importOpen}
        mode="import"
        onClose={() => setImportOpen(false)}
      />
      <ImportExportModal
        open={exportOpen}
        mode="export"
        onClose={() => setExportOpen(false)}
      />

      <Toaster
        theme={theme}
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{ duration: 2400 }}
      />
    </div>
  );
}

export default function ApiClientWorkspace() {
  return (
    <ApiClientProvider>
      <WorkspaceInner />
    </ApiClientProvider>
  );
}
