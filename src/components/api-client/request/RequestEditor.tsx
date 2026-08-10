import { useMemo } from "react";
import { toast } from "sonner";
import type {
  AuthConfig,
  BodyConfig,
  HttpMethod,
  HttpRequestDraft,
  RequestEditorTab,
} from "../types";
import { HTTP_METHODS } from "../types";
import { KeyValueEditor } from "../shared/KeyValueEditor";
import { CodeEditor } from "../shared/CodeEditor";
import { Input, Select } from "../shared/ui";
import { useApiClient } from "../state/ApiClientContext";
import { looksLikeCurl, parseCurlToDraft } from "../../../utils/curl-import";

export function RequestEditor({
  draft,
  onChange,
  onReplace,
  onSend,
  theme,
}: {
  draft: HttpRequestDraft;
  onChange: (patch: Partial<HttpRequestDraft>) => void;
  onReplace: (draft: HttpRequestDraft) => void;
  onSend: () => void;
  theme: "light" | "dark";
}) {
  const { store, dispatch } = useApiClient();
  const tab = store.preferences.requestEditorTab;

  const setTab = (next: RequestEditorTab) =>
    dispatch({
      type: "SET_PREFERENCES",
      patch: { requestEditorTab: next },
    });

  const setAuth = (patch: Partial<AuthConfig>) =>
    onChange({ auth: { ...draft.auth, ...patch } });

  const setBody = (patch: Partial<BodyConfig>) =>
    onChange({ body: { ...draft.body, ...patch } });

  const applyCurlPaste = (raw: string) => {
    try {
      const next = parseCurlToDraft(raw, draft);
      onReplace(next);
      toast.success("cURL imported", {
        description: `${next.method} ${next.url}`,
      });
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to parse cURL");
      return false;
    }
  };

  const tabs = useMemo(
    () =>
      [
        ["params", "Params"],
        ["authorization", "Authorization"],
        ["headers", "Headers"],
        ["body", "Body"],
        ["settings", "Settings"],
      ] as const,
    [],
  );

  return (
    <div
      className="ac-request"
      onPaste={(event) => {
        const text = event.clipboardData.getData("text");
        if (!looksLikeCurl(text)) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest(".cm-editor") || target?.tagName === "TEXTAREA") return;
        event.preventDefault();
        applyCurlPaste(text);
      }}
    >
      <div className="ac-request__meta">
        <Input
          value={draft.name}
          onChange={(event) => onChange({ name: event.target.value })}
          aria-label="Request name"
          className="ac-request__name"
        />
      </div>

      <div className="ac-request__bar">
        <Select
          className={`ac-method-select ac-method--${draft.method.toLowerCase()}`}
          value={draft.method}
          aria-label="HTTP method"
          onChange={(event) =>
            onChange({ method: event.target.value as HttpMethod })
          }
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
        >
          {HTTP_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </Select>
        <Input
          id="ac-url-input"
          value={draft.url}
          onChange={(event) => onChange({ url: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              onSend();
            }
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (!looksLikeCurl(text)) return;
            event.preventDefault();
            applyCurlPaste(text);
          }}
          placeholder="https://api.example.com/{{path}}  ·  paste a cURL"
          aria-label="Request URL"
          className="ac-request__url"
        />
      </div>

      <div className="ac-segmented" role="tablist" aria-label="Request options">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "is-active" : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={`ac-request__panel ${tab === "body" ? "ac-request__panel--body" : ""}`}>
        {tab === "params" ? (
          <KeyValueEditor
            items={draft.params}
            onChange={(params) => onChange({ params })}
            keyPlaceholder="Query param"
            valuePlaceholder="Value"
          />
        ) : null}

        {tab === "headers" ? (
          <KeyValueEditor
            items={draft.headers}
            onChange={(headers) => onChange({ headers })}
            keyPlaceholder="Header"
            valuePlaceholder="Value"
          />
        ) : null}

        {tab === "authorization" ? (
          <div className="ac-auth">
            <label className="ac-field">
              <span>Type</span>
              <Select
                value={draft.auth.type}
                onChange={(event) =>
                  setAuth({ type: event.target.value as AuthConfig["type"] })
                }
              >
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="apikey">API Key</option>
              </Select>
            </label>

            {draft.auth.type === "bearer" ? (
              <label className="ac-field">
                <span>Token</span>
                <Input
                  value={draft.auth.bearerToken ?? ""}
                  onChange={(event) => setAuth({ bearerToken: event.target.value })}
                  placeholder="{{token}}"
                />
              </label>
            ) : null}

            {draft.auth.type === "basic" ? (
              <div className="ac-grid-2">
                <label className="ac-field">
                  <span>Username</span>
                  <Input
                    value={draft.auth.basicUsername ?? ""}
                    onChange={(event) =>
                      setAuth({ basicUsername: event.target.value })
                    }
                  />
                </label>
                <label className="ac-field">
                  <span>Password</span>
                  <Input
                    type="password"
                    value={draft.auth.basicPassword ?? ""}
                    onChange={(event) =>
                      setAuth({ basicPassword: event.target.value })
                    }
                  />
                </label>
              </div>
            ) : null}

            {draft.auth.type === "apikey" ? (
              <div className="ac-grid-2">
                <label className="ac-field">
                  <span>Key</span>
                  <Input
                    value={draft.auth.apiKeyName ?? ""}
                    onChange={(event) => setAuth({ apiKeyName: event.target.value })}
                  />
                </label>
                <label className="ac-field">
                  <span>Value</span>
                  <Input
                    value={draft.auth.apiKeyValue ?? ""}
                    onChange={(event) => setAuth({ apiKeyValue: event.target.value })}
                  />
                </label>
                <label className="ac-field">
                  <span>Add to</span>
                  <Select
                    value={draft.auth.apiKeyIn ?? "header"}
                    onChange={(event) =>
                      setAuth({
                        apiKeyIn: event.target.value as "header" | "query",
                      })
                    }
                  >
                    <option value="header">Header</option>
                    <option value="query">Query params</option>
                  </Select>
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "body" ? (
          <div className="ac-body">
            <div className="ac-segmented ac-segmented--compact">
              {(
                [
                  ["none", "None"],
                  ["json", "JSON"],
                  ["text", "Text"],
                  ["urlencoded", "x-www-form-urlencoded"],
                  ["multipart", "form-data"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={draft.body.mode === id ? "is-active" : undefined}
                  onClick={() => setBody({ mode: id })}
                >
                  {label}
                </button>
              ))}
            </div>

            {draft.body.mode === "none" ? (
              <p className="ac-muted">This request does not have a body.</p>
            ) : null}

            {draft.body.mode === "json" ? (
              <CodeEditor
                value={draft.body.json ?? ""}
                onChange={(json) => setBody({ json })}
                language="json"
                theme={theme}
                fill
              />
            ) : null}

            {draft.body.mode === "text" ? (
              <CodeEditor
                value={draft.body.text ?? ""}
                onChange={(text) => setBody({ text })}
                language="text"
                theme={theme}
                fill
              />
            ) : null}

            {draft.body.mode === "urlencoded" ? (
              <KeyValueEditor
                items={draft.body.urlencoded}
                onChange={(urlencoded) => setBody({ urlencoded })}
              />
            ) : null}

            {draft.body.mode === "multipart" ? (
              <KeyValueEditor
                items={draft.body.multipart}
                onChange={(multipart) => setBody({ multipart })}
              />
            ) : null}
          </div>
        ) : null}

        {tab === "settings" ? (
          <div className="ac-settings">
            <label className="ac-check-row">
              <input
                type="checkbox"
                checked={draft.settings.followRedirects}
                onChange={(event) =>
                  onChange({
                    settings: {
                      ...draft.settings,
                      followRedirects: event.target.checked,
                    },
                  })
                }
              />
              <span>Follow redirects</span>
            </label>
            <label className="ac-field">
              <span>Timeout (ms)</span>
              <Input
                type="number"
                min={1000}
                max={60000}
                value={draft.settings.timeoutMs}
                onChange={(event) =>
                  onChange({
                    settings: {
                      ...draft.settings,
                      timeoutMs: Number(event.target.value) || 30000,
                    },
                  })
                }
              />
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}
