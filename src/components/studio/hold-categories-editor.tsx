"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { autopilotApi, type AutoPublishStatus } from "@/lib/api/autopilot";
import { apiErrorMessage } from "@/lib/api/errors";
import {
  MAX_HOLD_ENTRIES,
  MAX_HOLD_LENGTH,
  RESTRICTED_HOLD_CATEGORIES,
  addHoldWord,
  buildHold,
  holdChanged,
  splitHold,
} from "@/lib/studio/hold-categories";

/**
 * "Always ask me first for" (owner 2026-11-14): the restricted categories and the words the
 * business keeps for its own approval in the veto-window mode. Saved for the whole business
 * (every autopilot agent) through PUT /agents/autopilot/auto-publish. Owners and admins edit;
 * everyone else sees the list read only.
 */
export function HoldCategoriesEditor({
  status,
  canEdit,
  queryKey,
}: {
  status: AutoPublishStatus;
  canEdit: boolean;
  queryKey: readonly unknown[];
}) {
  const qc = useQueryClient();
  const saved = status.hold_categories;
  const [restricted, setRestricted] = useState<string[]>(() => splitHold(saved).restricted);
  const [words, setWords] = useState<string[]>(() => splitHold(saved).words);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  // A save elsewhere (or a refetch) resets the editor to what is stored.
  const savedKey = saved.join("\n");
  useEffect(() => {
    const s = splitHold(saved);
    setRestricted(s.restricted);
    setWords(s.words);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const next = useMemo(() => buildHold(restricted, words), [restricted, words]);
  const dirty = holdChanged(saved, next);
  const full = next.length >= MAX_HOLD_ENTRIES;

  const save = useMutation({
    mutationFn: () => autopilotApi.setAutoPublish({ hold_categories: next }),
    onSuccess: (st) => {
      qc.setQueryData(queryKey, st);
      toast.success("Saved. Matching videos will wait for your approval.");
    },
    onError: (e) => setError(apiErrorMessage(e, "Could not save the list")),
  });

  const add = () => {
    const r = addHoldWord(restricted, words, draft);
    if (r.error) {
      setError(r.error);
      return;
    }
    setError(null);
    setRestricted(r.restricted);
    setWords(r.words);
    setDraft("");
  };

  const toggle = (key: string, on: boolean) => {
    setError(null);
    setRestricted((cur) => (on ? (cur.includes(key) ? cur : [...cur, key]) : cur.filter((k) => k !== key)));
  };

  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-3">
      <legend className="px-1 text-sm font-medium">Always ask me first for</legend>
      <p className="text-xs text-muted-foreground">
        A video about any of these waits for your approval instead of posting when the window ends. This list applies to
        every autopilot agent of your business. Ads that our checks flag in these categories always wait, whatever you tick
        here; ticking a category also holds products whose name or description falls in it.
      </p>
      {!canEdit && <p className="text-xs text-muted-foreground">Only the account owner or an admin can change this list.</p>}

      <div className="grid gap-1 sm:grid-cols-2">
        {RESTRICTED_HOLD_CATEGORIES.map((c) => {
          const checked = restricted.includes(c.key);
          return (
            <label key={c.key} className="flex min-h-11 items-center gap-3 text-sm has-[:disabled]:opacity-60">
              <Checkbox
                checked={checked}
                disabled={!canEdit || (!checked && full)}
                onCheckedChange={(on) => toggle(c.key, on === true)}
                aria-label={c.label}
              />
              {c.label}
            </label>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Your own words</p>
        {words.length === 0 && <p className="text-xs text-muted-foreground">None yet. Add a product type, brand or word.</p>}
        {words.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Your own words">
            {words.map((w) => (
              <li key={w} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border px-3 text-sm">
                {w}
                {canEdit && (
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
                    aria-label={`Remove ${w}`}
                    onClick={() => setWords((cur) => cur.filter((x) => x !== w))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Input
              aria-label="Add a word or phrase"
              placeholder="For example: wedding cakes"
              maxLength={MAX_HOLD_LENGTH}
              value={draft}
              disabled={full}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              className="min-h-11 flex-1 sm:max-w-xs"
            />
            <Button type="button" variant="outline" className="min-h-11" disabled={full || !draft.trim()} onClick={add}>
              Add
            </Button>
          </div>
        )}
        {full && canEdit && <p className="text-xs text-muted-foreground">The list holds up to {MAX_HOLD_ENTRIES} entries.</p>}
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {canEdit && (
        <Button type="button" disabled={!dirty || save.isPending} onClick={() => { setError(null); save.mutate(); }}>
          {save.isPending ? "Saving..." : "Save list"}
        </Button>
      )}
    </fieldset>
  );
}
