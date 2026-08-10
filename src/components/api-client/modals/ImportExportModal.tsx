import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { ImportConflictMode, ImportPreview } from "../types";
import {
  exportWorkspaceBackup,
  getSessionPostmanKey,
  setSessionPostmanKey,
} from "../../../utils/api-client-db";
import {
  exportPostmanCollection,
  parsePostmanCollection,
} from "../../../utils/postman-collection";
import { importCollectionFromUrl } from "../../../services/api-client";
import { useApiClient } from "../state/ApiClientContext";
import { Badge, Button, Input, Modal, Select, TextArea } from "../shared/ui";

export function ImportExportModal({
  open,
  mode,
  onClose,
}: {
  open: boolean;
  mode: "import" | "export";
  onClose: () => void;
}) {
  const { store, dispatch } = useApiClient();
  const [tab, setTab] = useState<"file" | "paste" | "url">("file");
  const [paste, setPaste] = useState("");
  const [url, setUrl] = useState("");
  const [postmanKey, setPostmanKey] = useState(getSessionPostmanKey());
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [conflict, setConflict] = useState<ImportConflictMode>("copy");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportCollectionId, setExportCollectionId] = useState(
    store.collections[0]?.id ?? "",
  );
  const [includeSecrets, setIncludeSecrets] = useState(false);

  const title = mode === "import" ? "Import" : "Export";

  const selectedCollection = useMemo(
    () => store.collections.find((item) => item.id === exportCollectionId) ?? null,
    [store.collections, exportCollectionId],
  );

  const reset = () => {
    setPreview(null);
    setError(null);
    setBusy(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const loadPreviewFromUnknown = (raw: unknown, extraWarnings: string[] = []) => {
    const next = parsePostmanCollection(raw);
    next.warnings = [...extraWarnings, ...next.warnings];
    setPreview(next);
    setError(null);
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      loadPreviewFromUnknown(JSON.parse(text));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
      setPreview(null);
    }
  };

  const onPasteParse = () => {
    try {
      loadPreviewFromUnknown(JSON.parse(paste));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
      setPreview(null);
    }
  };

  const onUrlImport = async () => {
    setBusy(true);
    setError(null);
    try {
      setSessionPostmanKey(postmanKey);
      const result = await importCollectionFromUrl(url, {
        postmanApiKey: postmanKey,
      });
      loadPreviewFromUnknown(result.collection, result.warnings);
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const commitImport = () => {
    if (!preview) return;
    dispatch({
      type: "IMPORT_COLLECTIONS",
      collections: [preview.collection],
      mode: conflict,
    });
    toast.success(`Imported “${preview.name}”`);
    handleClose();
  };

  const downloadText = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  return (
    <Modal open={open} title={title} onClose={handleClose} wide>
      {mode === "import" ? (
        <div className="ac-import">
          <div className="ac-segmented">
            {(
              [
                ["file", "File"],
                ["paste", "Paste JSON"],
                ["url", "URL / Postman link"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={tab === id ? "is-active" : undefined}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "file" ? (
            <label className="ac-field">
              <span>Postman Collection v2 / v2.1 JSON</span>
              <Input
                type="file"
                accept="application/json,.json"
                onChange={(event) => void onFile(event.target.files?.[0] ?? null)}
              />
            </label>
          ) : null}

          {tab === "paste" ? (
            <div className="ac-stack">
              <TextArea
                rows={10}
                value={paste}
                onChange={(event) => setPaste(event.target.value)}
                placeholder="Paste collection JSON…"
              />
              <Button onClick={onPasteParse}>Parse</Button>
            </div>
          ) : null}

          {tab === "url" ? (
            <div className="ac-stack">
              <p className="ac-muted">
                Public Postman collection JSON links are deprecated. For current
                Postman collection/workspace links, paste the link and your Postman
                API key. Raw public JSON URLs also work.
              </p>
              <label className="ac-field">
                <span>Collection URL</span>
                <Input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://…"
                />
              </label>
              <label className="ac-field">
                <span>Postman API key (session only)</span>
                <Input
                  type="password"
                  value={postmanKey}
                  onChange={(event) => setPostmanKey(event.target.value)}
                  placeholder="PMAK-…"
                />
              </label>
              <Button variant="primary" disabled={busy || !url.trim()} onClick={() => void onUrlImport()}>
                {busy ? "Fetching…" : "Fetch collection"}
              </Button>
            </div>
          ) : null}

          {error ? <p className="ac-error">{error}</p> : null}

          {preview ? (
            <div className="ac-import-preview">
              <div className="ac-import-preview__head">
                <div>
                  <h3>{preview.name}</h3>
                  <p>{preview.itemCount} requests ready to import</p>
                </div>
                <label className="ac-field">
                  <span>Conflict mode</span>
                  <Select
                    value={conflict}
                    onChange={(event) =>
                      setConflict(event.target.value as ImportConflictMode)
                    }
                  >
                    <option value="copy">Import as copy</option>
                    <option value="merge">Merge by name</option>
                    <option value="replace">Replace all collections</option>
                  </Select>
                </label>
              </div>

              {preview.warnings.length ? (
                <div className="ac-warnings">
                  {preview.warnings.map((warning) => (
                    <Badge key={warning} tone="warn">
                      {warning}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <ul className="ac-import-list">
                {preview.items.slice(0, 40).map((item, index) => (
                  <li key={`${item.kind}-${item.name}-${index}`}>
                    <Badge tone="neutral">{item.kind}</Badge>
                    {item.method ? <Badge tone="info">{item.method}</Badge> : null}
                    <span>{item.name}</span>
                  </li>
                ))}
              </ul>

              <div className="ac-modal__actions">
                <Button onClick={() => setPreview(null)}>Back</Button>
                <Button variant="primary" onClick={commitImport}>
                  Import
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="ac-export">
          <label className="ac-field">
            <span>Export collection as Postman v2.1</span>
            <Select
              value={exportCollectionId}
              onChange={(event) => setExportCollectionId(event.target.value)}
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
            <Button
              disabled={!selectedCollection}
              onClick={() => {
                if (!selectedCollection) return;
                downloadText(
                  `${selectedCollection.name.replace(/\s+/g, "-").toLowerCase()}.postman_collection.json`,
                  exportPostmanCollection(selectedCollection),
                );
                toast.success("Collection exported");
              }}
            >
              Export collection
            </Button>
          </div>

          <hr className="ac-hr" />

          <label className="ac-check-row">
            <input
              type="checkbox"
              checked={includeSecrets}
              onChange={(event) => setIncludeSecrets(event.target.checked)}
            />
            <span>Include secret environment values in workspace backup</span>
          </label>
          <div className="ac-modal__actions">
            <Button
              variant="primary"
              onClick={() => {
                downloadText(
                  `api-client-backup-${Date.now()}.json`,
                  exportWorkspaceBackup(store, { includeSecrets }),
                );
                toast.success("Workspace backup exported");
              }}
            >
              Export workspace backup
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
