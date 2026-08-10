import { Copy, Download, WrapText } from "lucide-react";
import { useMemo, useState } from "react";
import type { ExecuteResponse, ResponseViewTab } from "../types";
import {
  CodeEditor,
  detectLanguage,
  prettyPrint,
} from "../shared/CodeEditor";
import { Badge, Button, EmptyState, IconButton } from "../shared/ui";
import { useApiClient } from "../state/ApiClientContext";

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export function ResponseViewer({
  response,
  loading,
  theme,
}: {
  response: ExecuteResponse | null;
  loading: boolean;
  theme: "light" | "dark";
}) {
  const { store, dispatch } = useApiClient();
  const tab = store.preferences.responseViewTab;
  const [wrap, setWrap] = useState(true);

  const setTab = (next: ResponseViewTab) =>
    dispatch({
      type: "SET_PREFERENCES",
      patch: { responseViewTab: next },
    });

  const language = useMemo(() => {
    if (!response) return "text" as const;
    return detectLanguage(response.mimeType, response.bodyText);
  }, [response]);

  const pretty = useMemo(() => {
    if (!response) return "";
    if (response.bodyEncoding === "base64") {
      return "[Binary content encoded as base64]\n" + response.bodyText;
    }
    return prettyPrint(response.bodyText, language);
  }, [response, language]);

  const copyBody = async () => {
    if (!response) return;
    await navigator.clipboard.writeText(response.bodyText);
  };

  const downloadBody = () => {
    if (!response) return;
    const blob =
      response.bodyEncoding === "base64"
        ? (() => {
            const binary = atob(response.bodyText);
            const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
            return new Blob([bytes], { type: response.mimeType });
          })()
        : new Blob([response.bodyText], { type: response.mimeType || "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `response-${Date.now()}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ac-response">
      <div className="ac-response__toolbar">
        <div className="ac-response__status">
          {loading ? <Badge tone="info">Sending…</Badge> : null}
          {response ? (
            <>
              <Badge
                tone={
                  response.status >= 200 && response.status < 300
                    ? "success"
                    : response.status >= 400 || response.status === 0
                      ? "danger"
                      : "warn"
                }
              >
                {response.status || "ERR"} {response.statusText}
              </Badge>
              <span>{response.durationMs} ms</span>
              <span>{formatBytes(response.sizeBytes)}</span>
              {response.truncated ? <Badge tone="warn">Truncated</Badge> : null}
            </>
          ) : !loading ? (
            <span className="ac-muted">Send a request to see the response</span>
          ) : null}
        </div>

        <div className="ac-response__actions">
          <IconButton label="Toggle wrap" onClick={() => setWrap((value) => !value)}>
            <WrapText size={14} />
          </IconButton>
          <IconButton label="Copy body" onClick={() => void copyBody()} disabled={!response}>
            <Copy size={14} />
          </IconButton>
          <IconButton
            label="Download body"
            onClick={downloadBody}
            disabled={!response}
          >
            <Download size={14} />
          </IconButton>
        </div>
      </div>

      <div className="ac-segmented" role="tablist" aria-label="Response view">
        {(
          [
            ["pretty", "Pretty"],
            ["raw", "Raw"],
            ["preview", "Preview"],
            ["headers", "Headers"],
          ] as const
        ).map(([id, label]) => (
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

      <div className={`ac-response__body ${wrap ? "is-wrap" : "is-nowrap"}`}>
        {!response && !loading ? (
          <EmptyState
            title="Waiting for a response"
            body="Your response body, headers, timing, and size will show up here."
          />
        ) : null}

        {loading ? <div className="ac-loading">Waiting for proxy response…</div> : null}

        {response && tab === "pretty" ? (
          <CodeEditor
            value={pretty}
            readOnly
            language={language === "text" ? "text" : language}
            theme={theme}
            fill
          />
        ) : null}

        {response && tab === "raw" ? (
          <CodeEditor
            value={response.bodyText}
            readOnly
            language="text"
            theme={theme}
            fill
          />
        ) : null}

        {response && tab === "preview" ? (
          language === "html" && response.bodyEncoding === "utf8" ? (
            <iframe
              title="HTML preview"
              className="ac-preview-frame"
              sandbox=""
              srcDoc={response.bodyText}
            />
          ) : (
            <div className="ac-preview-fallback">
              <p>No rich preview for this content type.</p>
              <Button size="sm" onClick={downloadBody}>
                Download instead
              </Button>
            </div>
          )
        ) : null}

        {response && tab === "headers" ? (
          <div className="ac-headers-table">
            {response.headers.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Header</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {response.headers.map((header) => (
                    <tr key={`${header.key}:${header.value}`}>
                      <td>{header.key}</td>
                      <td>{header.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="ac-muted">No headers returned.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
