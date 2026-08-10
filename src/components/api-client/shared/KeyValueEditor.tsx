import { Plus, Trash2 } from "lucide-react";
import type { KeyValueItem } from "../types";
import { createKeyValue } from "../../../utils/api-client-db";
import { Button, IconButton, Input } from "./ui";

export function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: {
  items: KeyValueItem[];
  onChange: (items: KeyValueItem[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  const update = (id: string, patch: Partial<KeyValueItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const remove = (id: string) => {
    const next = items.filter((item) => item.id !== id);
    onChange(next.length ? next : [createKeyValue()]);
  };

  const add = () => onChange([...items, createKeyValue()]);

  return (
    <div className="ac-kv">
      <div className="ac-kv__head">
        <span>Enabled</span>
        <span>{keyPlaceholder}</span>
        <span>{valuePlaceholder}</span>
        <span />
      </div>
      {items.map((item) => (
        <div className="ac-kv__row" key={item.id}>
          <label className="ac-check">
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={(event) => update(item.id, { enabled: event.target.checked })}
              aria-label={`Enable ${item.key || "row"}`}
            />
          </label>
          <Input
            value={item.key}
            placeholder={keyPlaceholder}
            onChange={(event) => update(item.id, { key: event.target.value })}
          />
          <Input
            value={item.value}
            placeholder={valuePlaceholder}
            onChange={(event) => update(item.id, { value: event.target.value })}
          />
          <IconButton label="Remove row" onClick={() => remove(item.id)}>
            <Trash2 size={14} />
          </IconButton>
        </div>
      ))}
      <div className="ac-kv__actions">
        <Button size="sm" onClick={add}>
          <Plus size={14} /> Add row
        </Button>
      </div>
    </div>
  );
}
