"use client";

import { useMemo, useState } from "react";
import { SearchableCombobox, type ComboboxOption } from "@bengo-hub/shared-ui-lib/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/ui-kit";
import { useFalPrices, useMediaRoutes, useSaveMediaRoute } from "@/hooks/use-media-routes";
import { apiErrorMessage } from "@/lib/api/errors";
import { RECOMMENDATION_FOR, formatPrice, type FalPrice, type MediaRoute } from "@/lib/api/media-routes";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, RotateCcw, Undo2 } from "lucide-react";

/** One synced model, as the provider card keeps it. */
export type RouteModelOption = { id: string; category?: string };

/**
 * Picker rows for one tier: the synced models whose category fits it (all of them for an
 * ElevenLabs tier, whose list has no categories), with the saved and default ids kept selectable
 * when the list lacks them.
 */
export function routeOptions(route: MediaRoute, models: RouteModelOption[]): ComboboxOption[] {
  const fits = (m: RouteModelOption) =>
    route.kind === "elevenlabs" ? m.id.startsWith("eleven_") : !route.categories?.length || !m.category || route.categories.includes(m.category);
  const rows: ComboboxOption[] = models.filter(fits).map((m) => ({
    value: m.id,
    label: m.id,
    hint: [m.id === route.default && "default", m.id === route.effective && "running now", m.category].filter(Boolean).join(", ") || undefined,
  }));
  for (const [id, hint] of [
    [route.effective, "running now, not in the list"],
    [route.default, "default, not in the list"],
  ] as const) {
    if (id && !rows.some((r) => r.value === id)) rows.unshift({ value: id, label: id, hint });
  }
  return rows;
}

/**
 * The media tiers a provider card sets (fal.ai: posters, clips, presenters and the fal voice
 * fallback; ElevenLabs: the direct voice models). Each tier has a searchable picker over the synced
 * list, the price of what runs and of what is picked, Save, Reset to default and, after a change,
 * Revert. Saving merges that one key, so no other setting is touched.
 */
export function MediaRoutePanel({
  card,
  models,
  recommendations,
  idPrefix,
}: {
  card: "fal" | "elevenlabs";
  models: RouteModelOption[];
  /** Sync models' newest model per role, by field. */
  recommendations: Record<string, string>;
  idPrefix: string;
}) {
  const routesQ = useMediaRoutes(card);
  const routes = useMemo(() => routesQ.data ?? [], [routesQ.data]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ key: string; kind: "ok" | "err"; text: string } | null>(null);

  const falIds = useMemo(() => {
    if (card !== "fal") return [];
    const ids = new Set<string>();
    for (const r of routes) {
      if (r.kind !== "fal") continue;
      ids.add(r.effective);
      if (drafts[r.key]) ids.add(drafts[r.key]);
    }
    return [...ids].filter(Boolean).sort();
  }, [card, routes, drafts]);
  const pricesQ = useFalPrices(falIds);

  const saveRoute = useSaveMediaRoute(card);
  const save = {
    isPending: saveRoute.isPending,
    mutate: (vars: { key: string; value: string; done: string }) =>
      saveRoute.mutate(vars, {
        onSuccess: () => {
          setDrafts((d) => {
            const next = { ...d };
            delete next[vars.key];
            return next;
          });
          setFeedback({ key: vars.key, kind: "ok", text: vars.done });
        },
        onError: (e) => setFeedback({ key: vars.key, kind: "err", text: apiErrorMessage(e, "Save failed") }),
      }),
  };

  if (routesQ.isLoading) return <p className="mt-4 text-xs text-muted-foreground">Loading the media tiers…</p>;
  if (routesQ.isError) return <p className="mt-4 text-xs text-destructive">The media tiers could not be loaded.</p>;
  if (routes.length === 0) return null;

  return (
    <section aria-labelledby={`${idPrefix}-routes`} className="mt-4 rounded-xl border border-border/70 bg-background/40 p-3">
      <h4 id={`${idPrefix}-routes`} className="text-sm font-semibold text-foreground">
        Media tiers
      </h4>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
        {card === "fal"
          ? "The fal model behind each tier. Sync models moves a tier to a newer version of the same model on its own; anything else is your pick here."
          : "ElevenLabs direct is always tried first; fal reads the voice only when ElevenLabs cannot. Sync models moves a tier to a newer version on its own."}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-4 @3xl:grid-cols-2">
        {routes.map((r) =>
          r.kind === "flag" ? (
            <FlagRow
              key={r.key}
              id={`${idPrefix}-${r.key}`}
              route={r}
              busy={save.isPending}
              feedback={feedback?.key === r.key ? feedback : null}
              onChange={(on) => save.mutate({ key: r.key, value: on ? "true" : "false", done: on ? "On" : "Off" })}
            />
          ) : (
            <RouteRow
              key={r.key}
              id={`${idPrefix}-${r.key}`}
              route={r}
              options={routeOptions(r, models)}
              draft={drafts[r.key] ?? r.effective}
              newest={recommendations[RECOMMENDATION_FOR[r.key] ?? ""]}
              prices={pricesQ.data ?? {}}
              busy={save.isPending}
              feedback={feedback?.key === r.key ? feedback : null}
              onPick={(v) => {
                setDrafts((d) => ({ ...d, [r.key]: v }));
                setFeedback(null);
              }}
              onSave={(v) => save.mutate({ key: r.key, value: v, done: "Saved; it runs within about five minutes." })}
              onReset={() => save.mutate({ key: r.key, value: "", done: `Reset to ${r.default}` })}
              onRevert={() => r.previous && save.mutate({ key: r.key, value: r.previous, done: `Reverted to ${r.previous}` })}
            />
          ),
        )}
      </div>
    </section>
  );
}

function RouteRow({
  id,
  route,
  options,
  draft,
  newest,
  prices,
  busy,
  feedback,
  onPick,
  onSave,
  onReset,
  onRevert,
}: {
  id: string;
  route: MediaRoute;
  options: ComboboxOption[];
  draft: string;
  newest?: string;
  prices: Record<string, FalPrice>;
  busy: boolean;
  feedback: { kind: "ok" | "err"; text: string } | null;
  onPick: (v: string) => void;
  onSave: (v: string) => void;
  onReset: () => void;
  onRevert: () => void;
}) {
  const hintId = `${id}-hint`;
  const changed = draft.trim() !== "" && draft.trim() !== route.effective;
  const priceOf = (m: string) => (route.kind === "fal" ? formatPrice(prices[m]) : "billed in ElevenLabs subscription characters");
  const running = priceOf(route.effective);
  const picked = changed ? priceOf(draft) : undefined;
  // Only the saved and default ids: the provider's list has not been synced in this session.
  const listed = options.some((o) => !o.hint?.includes("not in the list"));

  return (
    <div className="min-w-0 rounded-lg border border-border/60 p-3">
      <Field label={route.label} htmlFor={id} hint={route.help} hintId={hintId}>
        {listed ? (
          <div role="group" aria-label={route.label} aria-describedby={hintId} className="min-w-0">
            <SearchableCombobox
              options={options}
              value={draft}
              valueLabel={draft || undefined}
              onChange={(v: string) => onPick(v)}
              placeholder="Pick a model"
              searchPlaceholder="Search or type a model id"
              emptyText="No model in this category matches. Type the full id to use it."
              onCreate={(text: string) => ({ value: text.trim(), label: text.trim() })}
              createLabel={'Use "{text}"'}
            />
          </div>
        ) : (
          <Input id={id} value={draft} aria-describedby={hintId} placeholder={route.default} autoComplete="off" spellCheck={false}
            onChange={(e) => onPick(e.target.value)} />
        )}
      </Field>
      <dl className="mt-2 space-y-0.5 text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-x-1">
          <dt>Running now:</dt>
          <dd className="break-all font-mono text-foreground">{route.effective}</dd>
          {running && <dd>({running})</dd>}
          {!route.value && <dd>(default)</dd>}
        </div>
        {!listed && <div>Sync models to pick from the provider&apos;s list.</div>}
        {newest && newest !== route.effective && (
          <div className="flex flex-wrap items-center gap-x-1">
            <dt>Newest in the list:</dt>
            <dd className="break-all font-mono text-foreground">{newest}</dd>
            <dd>
              <Button type="button" size="xs" variant="link" className="h-auto p-0" onClick={() => onPick(newest)}>
                Pick it
              </Button>
            </dd>
          </div>
        )}
      </dl>
      {changed && (
        <p className="mt-2 rounded-md bg-muted/60 p-2 text-xs leading-relaxed text-muted-foreground" data-testid="compare">
          Compare before saving: <span className="font-mono text-foreground">{route.effective}</span>
          {running ? ` at ${running}` : ""} against <span className="font-mono text-foreground">{draft}</span>
          {picked ? ` at ${picked}` : " (price not read yet)"}. Render one short test on the new model; its input must match this tier.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={!changed || busy} onClick={() => onSave(draft.trim())}>
          Save
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={!route.value || busy} onClick={onReset}
          title={`Run the default, ${route.default}`}>
          <RotateCcw aria-hidden /> Reset to default
        </Button>
        {route.previous && route.previous !== route.effective && (
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onRevert} title={`Back to ${route.previous}`}>
            <Undo2 aria-hidden /> Revert to {route.previous}
          </Button>
        )}
      </div>
      <Feedback feedback={feedback} />
    </div>
  );
}

function FlagRow({
  id,
  route,
  busy,
  feedback,
  onChange,
}: {
  id: string;
  route: MediaRoute;
  busy: boolean;
  feedback: { kind: "ok" | "err"; text: string } | null;
  onChange: (on: boolean) => void;
}) {
  const on = route.effective === "true";
  return (
    <div className="min-w-0 rounded-lg border border-border/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {route.label}
        </label>
        <Switch id={id} checked={on} disabled={busy} aria-label={route.label} aria-describedby={`${id}-hint`}
          onCheckedChange={(v: boolean) => onChange(v)} />
      </div>
      {route.help && (
        <p id={`${id}-hint`} className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {route.help}
        </p>
      )}
      <Feedback feedback={feedback} />
    </div>
  );
}

function Feedback({ feedback }: { feedback: { kind: "ok" | "err"; text: string } | null }) {
  return (
    <div role="status" aria-live="polite">
      {feedback && (
        <p className={cn("mt-2 flex items-start gap-1.5 text-xs", feedback.kind === "ok" ? "text-success" : "text-destructive")}>
          {feedback.kind === "ok" ? <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden /> : <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />}
          <span className="break-words">{feedback.text}</span>
        </p>
      )}
    </div>
  );
}
