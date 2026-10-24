"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A short list of phrases edited as chips: type and press Enter (or paste several lines) to
 * add, click a chip to edit it, × to remove. Limits match the API so a save never fails on them.
 */
export function ListEditor({
  id,
  value,
  onChange,
  placeholder,
  maxItems = 20,
  maxLength = 300,
  label,
}: {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  maxLength?: number;
  /** Accessible name for the add box and the chips, e.g. "audience". */
  label: string;
}) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const full = value.length >= maxItems;

  const add = (raw: string) => {
    const items = raw
      .split(/\r?\n/)
      .map((s) => s.trim().slice(0, maxLength))
      .filter((s) => s && !value.includes(s));
    if (!items.length) return;
    onChange([...value, ...items].slice(0, maxItems));
    setDraft("");
  };

  const commitEdit = (i: number, text: string) => {
    const t = text.trim().slice(0, maxLength);
    onChange(t ? value.map((v, j) => (j === i ? t : v)) : value.filter((_, j) => j !== i));
    setEditing(null);
  };

  return (
    <div className="min-w-0 space-y-2">
      {value.length > 0 && (
        <ul className="flex min-w-0 flex-wrap gap-1.5" aria-label={label}>
          {value.map((v, i) =>
            editing === i ? (
              <li key={i} className="w-full">
                <Input
                  autoFocus
                  defaultValue={v}
                  maxLength={maxLength}
                  aria-label={`Edit ${label} item`}
                  onBlur={(e) => commitEdit(i, e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit(i, e.currentTarget.value);
                    if (e.key === "Escape") setEditing(null);
                  }}
                />
              </li>
            ) : (
              <li key={i} className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-background/70 py-1 pl-3 pr-1 text-sm">
                <button type="button" className="min-w-0 truncate text-left" title={v} onClick={() => setEditing(i)}>
                  {v}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${v}`}
                  className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ),
          )}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          disabled={full}
          maxLength={maxLength * 4}
          placeholder={full ? `Up to ${maxItems} items` : placeholder}
          aria-label={`Add to ${label}`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (text.includes("\n")) {
              e.preventDefault();
              add(text);
            }
          }}
        />
        <Button type="button" variant="outline" size="icon" className="size-10 shrink-0" aria-label={`Add to ${label}`} disabled={full || !draft.trim()} onClick={() => add(draft)}>
          <Plus />
        </Button>
      </div>
      <p className={cn("text-xs", full ? "text-warning" : "text-muted-foreground")}>
        {value.length} of {maxItems}
      </p>
    </div>
  );
}
