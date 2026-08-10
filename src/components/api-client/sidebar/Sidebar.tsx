import {
  Clock3,
  Copy,
  FolderPlus,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Fuse from "fuse.js";
import { useMemo, useState } from "react";
import type { Collection, HistoryEntry, SavedRequest, SidebarTab } from "../types";
import { createKeyValue, createRequestDraft, newId } from "../../../utils/api-client-db";
import { useApiClient } from "../state/ApiClientContext";
import { Badge, Button, EmptyState, IconButton, Input, MethodBadge, Modal } from "../shared/ui";

function formatTime(ts: number) {
  return new Date(ts).toLocaleString();
}

export function Sidebar({
  onOpenRequest,
  onOpenHistory,
}: {
  onOpenRequest: (request: SavedRequest) => void;
  onOpenHistory: (entry: HistoryEntry) => void;
}) {
  const { store, dispatch } = useApiClient();
  const [query, setQuery] = useState("");
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [newEnvOpen, setNewEnvOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [envName, setEnvName] = useState("");
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null);

  const tab = store.preferences.sidebarTab;

  const collectionFuse = useMemo(() => {
    const rows = store.collections.flatMap((collection) =>
      collection.requests.map((request) => ({
        collectionId: collection.id,
        collectionName: collection.name,
        request,
      })),
    );
    return new Fuse(rows, {
      keys: [
        "collectionName",
        "request.name",
        "request.url",
        "request.method",
      ],
      threshold: 0.35,
      ignoreLocation: true,
    });
  }, [store.collections]);

  const historyFuse = useMemo(
    () =>
      new Fuse(store.history, {
        keys: ["url", "method", "statusText", "status"],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [store.history],
  );

  const filteredCollections = useMemo(() => {
    const q = query.trim();
    if (!q) return store.collections;

    const matched = collectionFuse.search(q);
    const byCollection = new Map<string, SavedRequest[]>();
    for (const hit of matched) {
      const list = byCollection.get(hit.item.collectionId) ?? [];
      list.push(hit.item.request);
      byCollection.set(hit.item.collectionId, list);
    }

    return store.collections
      .map((collection) => {
        const requests = byCollection.get(collection.id);
        if (requests?.length) {
          return { ...collection, requests };
        }
        if (collection.name.toLowerCase().includes(q.toLowerCase())) {
          return collection;
        }
        return null;
      })
      .filter((item): item is Collection => Boolean(item));
  }, [collectionFuse, query, store.collections]);

  const filteredHistory = useMemo(() => {
    const q = query.trim();
    if (!q) return store.history;
    return historyFuse.search(q).map((hit) => hit.item);
  }, [historyFuse, query, store.history]);

  const setTab = (next: SidebarTab) =>
    dispatch({ type: "SET_SIDEBAR_TAB", tab: next });

  const createCollection = () => {
    const name = collectionName.trim() || "New Collection";
    const collection: Collection = {
      id: newId("col"),
      name,
      description: "",
      folders: [],
      requests: [],
      variables: [createKeyValue()],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    dispatch({ type: "UPSERT_COLLECTION", collection });
    setCollectionName("");
    setNewCollectionOpen(false);
  };

  const createEnvironment = () => {
    const name = envName.trim() || "New Environment";
    dispatch({
      type: "UPSERT_ENVIRONMENT",
      environment: {
        id: newId("env"),
        name,
        variables: [createKeyValue({ key: "baseUrl", value: "https://" })],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });
    setEnvName("");
    setNewEnvOpen(false);
  };

  const editingEnv = store.environments.find((env) => env.id === editingEnvId) ?? null;

  return (
    <aside className="ac-sidebar">
      <div className="ac-sidebar__tabs" role="tablist" aria-label="Sidebar">
        {(
          [
            ["collections", "Collections"],
            ["environments", "Environments"],
            ["history", "History"],
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

      <div className="ac-sidebar__toolbar">
        <div className="ac-search">
          <Search size={14} />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search…"
            aria-label="Search sidebar"
          />
        </div>
        {tab === "collections" ? (
          <IconButton label="New collection" onClick={() => setNewCollectionOpen(true)}>
            <FolderPlus size={16} />
          </IconButton>
        ) : null}
        {tab === "environments" ? (
          <IconButton label="New environment" onClick={() => setNewEnvOpen(true)}>
            <Plus size={16} />
          </IconButton>
        ) : null}
        {tab === "history" ? (
          <IconButton
            label="Clear history"
            onClick={() => {
              if (confirm("Clear all request history?")) {
                dispatch({ type: "CLEAR_HISTORY" });
              }
            }}
          >
            <Trash2 size={16} />
          </IconButton>
        ) : null}
      </div>

      <div className="ac-sidebar__body">
        {tab === "collections" ? (
          filteredCollections.length ? (
            <div className="ac-tree">
              {filteredCollections.map((collection) => (
                <div key={collection.id} className="ac-tree__group">
                  <div className="ac-tree__group-head">
                    <div>
                      <strong>{collection.name}</strong>
                      <span>{collection.requests.length} requests</span>
                    </div>
                    <div className="ac-tree__actions">
                      <IconButton
                        label="Add request"
                        onClick={() => {
                          const request = {
                            ...createRequestDraft({
                              name: "New Request",
                              collectionId: collection.id,
                            }),
                            collectionId: collection.id,
                            folderId: null,
                            order: collection.requests.length,
                          } satisfies SavedRequest;
                          dispatch({
                            type: "UPSERT_COLLECTION",
                            collection: {
                              ...collection,
                              requests: [...collection.requests, request],
                              updatedAt: Date.now(),
                            },
                          });
                          onOpenRequest(request);
                        }}
                      >
                        <Plus size={14} />
                      </IconButton>
                      <IconButton
                        label="Duplicate collection"
                        onClick={() =>
                          dispatch({
                            type: "DUPLICATE_COLLECTION",
                            collectionId: collection.id,
                          })
                        }
                      >
                        <Copy size={14} />
                      </IconButton>
                      <IconButton
                        label="Delete collection"
                        onClick={() => {
                          if (confirm(`Delete collection "${collection.name}"?`)) {
                            dispatch({
                              type: "DELETE_COLLECTION",
                              collectionId: collection.id,
                            });
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  </div>
                  <div className="ac-tree__items">
                    {collection.requests
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((request) => (
                        <button
                          key={request.id}
                          type="button"
                          className="ac-tree__item"
                          onClick={() => onOpenRequest(request)}
                        >
                          <MethodBadge method={request.method} />
                          <span className="ac-tree__item-name">{request.name}</span>
                        </button>
                      ))}
                    {!collection.requests.length ? (
                      <p className="ac-muted">No requests yet</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No collections"
              body="Import a Postman collection or create one to organize requests."
              action={
                <Button size="sm" onClick={() => setNewCollectionOpen(true)}>
                  Create collection
                </Button>
              }
            />
          )
        ) : null}

        {tab === "environments" ? (
          store.environments.length ? (
            <div className="ac-env-list">
              {store.environments.map((env) => (
                <div key={env.id} className="ac-env-card">
                  <div className="ac-env-card__head">
                    <button
                      type="button"
                      className={
                        store.preferences.activeEnvironmentId === env.id
                          ? "is-active"
                          : undefined
                      }
                      onClick={() =>
                        dispatch({
                          type: "SET_ACTIVE_ENVIRONMENT",
                          environmentId: env.id,
                        })
                      }
                    >
                      <strong>{env.name}</strong>
                      <span>{env.variables.filter((item) => item.key).length} vars</span>
                    </button>
                    <div className="ac-tree__actions">
                      <IconButton label="Edit environment" onClick={() => setEditingEnvId(env.id)}>
                        <MoreHorizontal size={14} />
                      </IconButton>
                      <IconButton
                        label="Delete environment"
                        onClick={() => {
                          if (confirm(`Delete environment "${env.name}"?`)) {
                            dispatch({
                              type: "DELETE_ENVIRONMENT",
                              environmentId: env.id,
                            });
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  </div>
                  {store.preferences.activeEnvironmentId === env.id ? (
                    <Badge tone="info">Active</Badge>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No environments"
              body="Create variables like {{baseUrl}} and switch them per project."
              action={
                <Button size="sm" onClick={() => setNewEnvOpen(true)}>
                  Create environment
                </Button>
              }
            />
          )
        ) : null}

        {tab === "history" ? (
          filteredHistory.length ? (
            <div className="ac-history">
              {filteredHistory.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="ac-history__item"
                  onClick={() => onOpenHistory(entry)}
                >
                  <div className="ac-history__top">
                    <MethodBadge method={entry.method} />
                    <Badge
                      tone={
                        entry.status >= 200 && entry.status < 300
                          ? "success"
                          : entry.status >= 400
                            ? "danger"
                            : "warn"
                      }
                    >
                      {entry.status || "ERR"}
                    </Badge>
                    <span>{entry.durationMs} ms</span>
                  </div>
                  <div className="ac-history__url">{entry.url}</div>
                  <div className="ac-history__meta">
                    <Clock3 size={12} />
                    {formatTime(entry.createdAt)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No history yet"
              body="Sent requests will appear here so you can reopen or rerun them."
            />
          )
        ) : null}
      </div>

      <Modal
        open={newCollectionOpen}
        title="New collection"
        onClose={() => setNewCollectionOpen(false)}
      >
        <label className="ac-field">
          <span>Name</span>
          <Input
            autoFocus
            value={collectionName}
            onChange={(event) => setCollectionName(event.target.value)}
            placeholder="My APIs"
          />
        </label>
        <div className="ac-modal__actions">
          <Button onClick={() => setNewCollectionOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={createCollection}>
            Create
          </Button>
        </div>
      </Modal>

      <Modal open={newEnvOpen} title="New environment" onClose={() => setNewEnvOpen(false)}>
        <label className="ac-field">
          <span>Name</span>
          <Input
            autoFocus
            value={envName}
            onChange={(event) => setEnvName(event.target.value)}
            placeholder="Local"
          />
        </label>
        <div className="ac-modal__actions">
          <Button onClick={() => setNewEnvOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={createEnvironment}>
            Create
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(editingEnv)}
        title={editingEnv ? `Edit ${editingEnv.name}` : "Edit environment"}
        onClose={() => setEditingEnvId(null)}
        wide
      >
        {editingEnv ? (
          <EnvironmentEditor
            environment={editingEnv}
            onSave={(environment) => {
              dispatch({ type: "UPSERT_ENVIRONMENT", environment });
              setEditingEnvId(null);
            }}
            onCancel={() => setEditingEnvId(null)}
          />
        ) : null}
      </Modal>
    </aside>
  );
}

function EnvironmentEditor({
  environment,
  onSave,
  onCancel,
}: {
  environment: import("../types").Environment;
  onSave: (environment: import("../types").Environment) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(environment.name);
  const [variables, setVariables] = useState(environment.variables);

  return (
    <div className="ac-env-editor">
      <label className="ac-field">
        <span>Name</span>
        <Input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <div className="ac-kv">
        <div className="ac-kv__head">
          <span>On</span>
          <span>Variable</span>
          <span>Value</span>
          <span>Secret</span>
          <span />
        </div>
        {variables.map((item) => (
          <div className="ac-kv__row ac-kv__row--env" key={item.id}>
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={(event) =>
                setVariables((prev) =>
                  prev.map((row) =>
                    row.id === item.id ? { ...row, enabled: event.target.checked } : row,
                  ),
                )
              }
            />
            <Input
              value={item.key}
              onChange={(event) =>
                setVariables((prev) =>
                  prev.map((row) =>
                    row.id === item.id ? { ...row, key: event.target.value } : row,
                  ),
                )
              }
            />
            <Input
              type={item.secret ? "password" : "text"}
              value={item.value}
              onChange={(event) =>
                setVariables((prev) =>
                  prev.map((row) =>
                    row.id === item.id ? { ...row, value: event.target.value } : row,
                  ),
                )
              }
            />
            <input
              type="checkbox"
              checked={Boolean(item.secret)}
              onChange={(event) =>
                setVariables((prev) =>
                  prev.map((row) =>
                    row.id === item.id ? { ...row, secret: event.target.checked } : row,
                  ),
                )
              }
            />
            <IconButton
              label="Remove variable"
              onClick={() =>
                setVariables((prev) => {
                  const next = prev.filter((row) => row.id !== item.id);
                  return next.length ? next : [createKeyValue()];
                })
              }
            >
              <Trash2 size={14} />
            </IconButton>
          </div>
        ))}
      </div>
      <div className="ac-modal__actions">
        <Button
          onClick={() =>
            setVariables((prev) => [
              ...prev,
              { ...createKeyValue(), secret: false },
            ])
          }
        >
          Add variable
        </Button>
        <div className="ac-spacer" />
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="primary"
          onClick={() =>
            onSave({
              ...environment,
              name: name.trim() || environment.name,
              variables,
              updatedAt: Date.now(),
            })
          }
        >
          Save
        </Button>
      </div>
    </div>
  );
}
