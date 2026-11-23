"use client";

import { useId, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, ToneBadge } from "@/components/ui-kit";
import { ProviderLogo } from "./provider-logo";
import { RoutingPolicyEditor } from "./routing-policy-editor";
import type { ProviderDef, ProviderField } from "@/lib/providers/catalog";
import { isAdvancedField } from "@/lib/providers/groups";
import { cn } from "@/lib/utils";
import { ExternalLink, RefreshCw, CheckCircle2, AlertCircle, Zap, Star, Wallet, ChevronRight, Circle } from "lucide-react";

type ProviderRow = {
  id: string;
  provider_type: string;
  provider_name: string;
  status?: string;
  is_active?: boolean;
};

export type ProviderBalance = {
  remaining: number;
  unit: string;
  low_mark: number;
  estimate?: boolean;
  at: string;
  low: boolean;
};

type Recommendation = { field: string; label: string; model: string; informational?: boolean };

const checkedAt = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

/** "USD 4.49" or "14,707 characters". */
export function formatBalance(b: ProviderBalance): string {
  if (b.unit === "usd") return `USD ${b.remaining.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${Math.round(b.remaining).toLocaleString("en-KE")} ${b.unit}`;
}

/**
 * Metadata-driven config card for a single provider. Reads the catalog
 * definition to render inputs; handles save, sync-models, test connection,
 * and shows connected / unset state.
 *
 * Layout: header (logo, name, status, docs, description), the main fields, an "Advanced
 * settings" disclosure for endpoints and redirect URLs, then a footer with Configure or Update,
 * Sync models and Test. The field grid follows the card's own width (container queries), so the
 * same card reads well in a three-column grid and as a full-width row.
 */
export function ProviderCard({
  provider,
  existing,
  balance,
  defaultFor,
  onSetDefault,
  className,
}: {
  provider: ProviderDef;
  existing?: ProviderRow;
  /** The media provider's last balance from marketflow-ai's watcher. */
  balance?: ProviderBalance;
  /** Groups this provider is the default of, and the ones it could be set as default for. */
  defaultFor?: { id: string; label: string; isDefault: boolean }[];
  onSetDefault?: (group: string) => void;
  className?: string;
}) {
  const qc = useQueryClient();
  const configured = !!existing && existing.is_active !== false;
  const uid = useId().replace(/:/g, "");
  const cardId = `provider-${provider.type}-${provider.id}-${uid}`;

  // Load current (masked) settings for prefill.
  const settingsQ = useQuery({
    queryKey: ["provider-settings", provider.type, provider.id],
    queryFn: async () => {
      const r = await apiClient.get<{ data: { key: string; value: string; is_secret: boolean; is_encrypted: boolean }[] }>(
        `/api/v1/admin/providers/settings?type=${encodeURIComponent(provider.type)}&name=${encodeURIComponent(provider.id)}`,
      );
      return r.data.data ?? [];
    },
    enabled: configured,
  });

  // Persist a recently-synced model list so switching tabs doesn't wipe it.
  const modelListQ = useQuery<string[]>({
    queryKey: ["provider-models", provider.type, provider.id],
    queryFn: async () => [],
    enabled: false,
    initialData: [],
  });

  const initial = useMemo(() => {
    const out: Record<string, string> = {};
    for (const f of provider.fields) if (f.default !== undefined) out[f.key] = f.default;
    for (const s of settingsQ.data ?? []) {
      if (!s.is_secret && !s.is_encrypted) out[s.key] = s.value;
    }
    return out;
  }, [provider.fields, settingsQ.data]);

  // Typed edits sit on top of the saved values, so a refetch never wipes what is being typed.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const values = useMemo(() => ({ ...initial, ...edits }), [initial, edits]);

  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const secret_keys = provider.fields.filter((f) => f.secret).map((f) => f.key);
      const settings: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) {
        if (v === "" && secret_keys.includes(k) && configured) continue;
        settings[k] = v;
      }
      await apiClient.post(`/api/v1/admin/providers/configure`, {
        provider_type: provider.type,
        provider_name: provider.id,
        environment: "production",
        settings,
        secret_keys,
      });
    },
    onSuccess: () => {
      setFeedback({ kind: "ok", text: "Saved" });
      qc.invalidateQueries({ queryKey: ["provider-settings", provider.type, provider.id] });
      qc.invalidateQueries({ queryKey: ["admin-providers"] });
    },
    onError: (e) => setFeedback({ kind: "err", text: (e as Error).message }),
  });

  const [latest, setLatest] = useState<Recommendation[]>([]);

  const syncModels = useMutation({
    mutationFn: async () => {
      const r = await apiClient.post<{
        models: { id: string }[];
        recommended?: Record<string, string>;
        recommendations?: Recommendation[];
      }>(`/api/v1/admin/providers/sync-models`, {
        provider_type: provider.type,
        provider_name: provider.id,
      });
      return { models: r.data.models.map((m) => m.id), recommended: r.data.recommended ?? {}, recs: r.data.recommendations ?? [] };
    },
    onSuccess: ({ models, recommended, recs }) => {
      qc.setQueryData(["provider-models", provider.type, provider.id], models);
      // Preselect the recommended model for every role this card has a field for; nothing is
      // saved until Update.
      const fields = new Set(provider.fields.map((f) => f.key));
      const picks = Object.fromEntries(Object.entries(recommended).filter(([k]) => fields.has(k)));
      setEdits((s) => ({ ...s, ...picks }));
      setLatest(recs.filter((r) => r.informational || !fields.has(r.field)));
      const n = Object.keys(picks).length;
      setFeedback({
        kind: "ok",
        text: n > 0 ? `${models.length} models; the newest stable model is preselected for ${n} role${n === 1 ? "" : "s"}. Review, then Update.` : `${models.length} models available`,
      });
    },
    onError: (e) => setFeedback({ kind: "err", text: `Sync failed: ${(e as Error).message}` }),
  });

  const test = useMutation({
    mutationFn: async () => {
      const r = await apiClient.post<{ ok: boolean; latency_ms?: number; message?: string }>(
        `/api/v1/admin/providers/test`,
        { provider_type: provider.type, provider_name: provider.id },
      );
      return r.data;
    },
    onSuccess: (d) => {
      if (d.ok) {
        setFeedback({
          kind: "ok",
          text: d.latency_ms != null ? `Test OK (${d.latency_ms} ms)` : (d.message ?? "Test OK"),
        });
      } else {
        setFeedback({ kind: "err", text: d.message || "Test failed" });
      }
    },
    onError: (e) => setFeedback({ kind: "err", text: `Test failed: ${(e as Error).message}` }),
  });

  function set(key: string, value: string) {
    setEdits((s) => ({ ...s, [key]: value }));
    setFeedback(null);
  }

  const modelChoices = (modelListQ.data ?? []) as string[];
  const canSync = !!(configured || values.api_key);
  const canTest = configured;

  const mainFields = provider.fields.filter((f) => !isAdvancedField(f));
  const advancedFields = provider.fields.filter(isAdvancedField);

  function renderField(f: ProviderField) {
    const isModelField = provider.modelFieldKeys?.includes(f.key) ?? /model$/i.test(f.key);
    return (
      <FieldInput
        key={f.key}
        id={`${cardId}-${f.key}`}
        field={f}
        value={values[f.key] ?? ""}
        placeholder={f.placeholder ?? (f.secret && configured ? "•••••••• (leave blank to keep)" : undefined)}
        modelChoices={isModelField && modelChoices.length > 0 ? modelChoices : null}
        onChange={(v) => set(f.key, v)}
      />
    );
  }

  const fieldGrid = "grid grid-cols-1 gap-x-4 gap-y-4 @xl:grid-cols-2 @4xl:grid-cols-3";
  const titleId = `${cardId}-title`;

  return (
    <article
      aria-labelledby={titleId}
      className={cn("@container glass flex h-full min-w-0 flex-col rounded-[1.25rem] p-4 sm:p-5", className)}
    >
      <header className="flex items-start gap-3">
        <ProviderLogo slug={provider.logoSlug} color={provider.logoColor} brandColor={provider.brandColor} name={provider.name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 id={titleId} className="font-display text-base font-semibold leading-tight text-foreground">
              {provider.name}
            </h3>
            {configured ? (
              <ToneBadge tone="success">
                <CheckCircle2 /> Connected
              </ToneBadge>
            ) : (
              <ToneBadge tone="neutral">
                <Circle /> Not configured
              </ToneBadge>
            )}
          </div>
          <p className="mt-1 max-w-prose break-words text-sm leading-relaxed text-muted-foreground">{provider.description}</p>
        </div>
        {provider.docsUrl && (
          <a
            className="-mr-1 -mt-1 inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            href={provider.docsUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${provider.name} docs (opens in a new tab)`}
          >
            Docs <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
      </header>

      {((defaultFor && defaultFor.length > 0) || (provider.capabilities?.balance && configured)) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {defaultFor?.map((g) =>
            g.isDefault ? (
              <ToneBadge key={g.id} tone="primary">
                <Star /> Default for {g.label.toLowerCase()}
              </ToneBadge>
            ) : (
              <Button
                key={g.id}
                type="button"
                size="xs"
                variant="outline"
                className="h-7 px-2.5"
                disabled={!configured || !onSetDefault}
                title={configured ? `Use ${provider.name} for ${g.label.toLowerCase()} everywhere` : "Configure it first"}
                onClick={() => onSetDefault?.(g.id)}
              >
                Set as default for {g.label.toLowerCase()}
              </Button>
            ),
          )}
          {provider.capabilities?.balance && configured && (
            <p className={cn("flex items-center gap-1 text-xs", balance?.low ? "text-destructive" : "text-muted-foreground")}>
              <Wallet className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {balance ? (
                <span>
                  Balance {balance.estimate ? "about " : ""}
                  <span className="font-medium tabular">{formatBalance(balance)}</span>
                  {balance.low && " (below the low mark)"}, checked {checkedAt.format(new Date(balance.at))}
                </span>
              ) : (
                "No balance reading yet; the watcher reads it every 15 minutes."
              )}
            </p>
          )}
        </div>
      )}

      {mainFields.length > 0 && <div className={cn("mt-4", fieldGrid)}>{mainFields.map(renderField)}</div>}

      {advancedFields.length > 0 && (
        <details className="group/adv mt-4 rounded-xl border border-border/70 bg-background/40">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 transition-transform group-open/adv:rotate-90 motion-reduce:transition-none" aria-hidden />
            Advanced settings
            <span className="text-xs font-normal">({advancedFields.map((f) => f.label.toLowerCase()).join(", ")})</span>
          </summary>
          <div className={cn("px-3 pb-3 pt-1", fieldGrid)}>{advancedFields.map(renderField)}</div>
        </details>
      )}

      {latest.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-xs">
          <p className="mb-1 font-medium text-foreground">Newest model per tier</p>
          <ul className="space-y-0.5 text-muted-foreground">
            {latest.map((r) => (
              <li key={r.field}>
                {r.label}: <span className="break-all font-mono text-foreground">{r.model}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-muted-foreground">These media routes are set in marketflow-ai; compare a new model before switching it there.</p>
        </div>
      )}

      <footer className="mt-auto pt-4">
        <div role="status" aria-live="polite">
          {feedback && (
            <p
              className={cn(
                "mb-3 flex items-start gap-1.5 text-xs",
                feedback.kind === "ok" ? "text-success" : "text-destructive",
              )}
            >
              {feedback.kind === "ok" ? (
                <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : (
                <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              <span className="break-words">{feedback.text}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
          <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : configured ? "Update" : "Configure"}
          </Button>
          {provider.capabilities?.test && (
            <Button
              type="button"
              variant="outline"
              onClick={() => test.mutate()}
              disabled={test.isPending || !canTest}
              title={!canTest ? "Save configuration first, then run a test probe" : "Send a probe request to the provider"}
            >
              <Zap className={cn(test.isPending && "animate-pulse motion-reduce:animate-none")} aria-hidden />
              {test.isPending ? "Testing…" : "Test"}
            </Button>
          )}
          {provider.capabilities?.syncModels && (
            <Button
              type="button"
              variant="outline"
              onClick={() => syncModels.mutate()}
              disabled={syncModels.isPending || !canSync}
              title={!canSync ? "Configure an API key first" : "Fetch live list of models"}
            >
              <RefreshCw className={cn(syncModels.isPending && "animate-spin motion-reduce:animate-none")} aria-hidden />
              Sync models
            </Button>
          )}
          {!configured && (provider.capabilities?.test || provider.capabilities?.syncModels) && (
            <span className="text-xs text-muted-foreground">
              {provider.capabilities?.syncModels ? "Enter the API key to sync models; save to test." : "Save the settings to run a test."}
            </span>
          )}
        </div>
      </footer>
    </article>
  );
}

function FieldInput({
  id,
  field,
  value,
  placeholder,
  modelChoices,
  onChange,
}: {
  id: string;
  field: ProviderField;
  value: string;
  placeholder?: string;
  modelChoices: string[] | null;
  onChange: (v: string) => void;
}) {
  const hintId = field.help ? `${id}-hint` : undefined;
  const wide = field.type === "textarea";
  const common = { label: field.label, required: field.required, htmlFor: id, hint: field.help, hintId, className: cn("min-w-0", wide && "col-span-full") };

  if (field.editor === "routing-policy") {
    return (
      <Field {...common}>
        <RoutingPolicyEditor id={id} value={value} placeholder={placeholder} hintId={hintId} onChange={onChange} />
      </Field>
    );
  }

  // If sync-models returned a list, render Select preserving the current value
  // even if it's not in the list (so saved values aren't lost on re-render).
  if (modelChoices && modelChoices.length > 0) {
    const choices = value && !modelChoices.includes(value) ? [value, ...modelChoices] : modelChoices;
    return (
      <Field {...common}>
        <Select value={value || undefined} onValueChange={(v) => onChange(v ?? "")}>
          <SelectTrigger id={id} aria-describedby={hintId} className="w-full min-w-0">
            <SelectValue placeholder="Pick a model…" />
          </SelectTrigger>
          <SelectContent>
            {choices.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <Field {...common}>
        <Select value={value || undefined} onValueChange={(v) => onChange(v ?? "")}>
          <SelectTrigger id={id} aria-describedby={hintId} className="w-full min-w-0">
            {/* Show the option's label ("On"), not the stored value ("true"). */}
            <SelectValue>{(v: string) => field.options?.find((o) => o.value === v)?.label ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  }

  if (field.type === "textarea") {
    return (
      <Field {...common}>
        <Textarea
          id={id}
          value={value}
          placeholder={placeholder}
          aria-describedby={hintId}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          spellCheck={false}
          className="min-h-40 field-sizing-fixed resize-y font-mono text-xs leading-relaxed md:text-xs"
        />
      </Field>
    );
  }

  const inputType =
    field.type === "password"
      ? "password"
      : field.type === "email"
      ? "email"
      : field.type === "url"
      ? "url"
      : field.type === "number"
      ? "number"
      : "text";

  return (
    <Field {...common}>
      <Input
        id={id}
        type={inputType}
        value={value}
        placeholder={placeholder}
        min={field.min}
        max={field.max}
        aria-describedby={hintId}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
    </Field>
  );
}
