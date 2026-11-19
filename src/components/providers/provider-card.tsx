"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProviderLogo } from "./provider-logo";
import type { ProviderDef, ProviderField } from "@/lib/providers/catalog";
import { ExternalLink, RefreshCw, CheckCircle2, AlertCircle, Zap, Star, Wallet } from "lucide-react";

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
 */
export function ProviderCard({
  provider,
  existing,
  balance,
  defaultFor,
  onSetDefault,
}: {
  provider: ProviderDef;
  existing?: ProviderRow;
  /** The media provider's last balance from marketflow-ai's watcher. */
  balance?: ProviderBalance;
  /** Groups this provider is the default of, and the ones it could be set as default for. */
  defaultFor?: { id: string; label: string; isDefault: boolean }[];
  onSetDefault?: (group: string) => void;
}) {
  const qc = useQueryClient();
  const configured = !!existing && existing.is_active !== false;

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

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition hover:shadow">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ProviderLogo
            slug={provider.logoSlug}
            color={provider.logoColor}
            brandColor={provider.brandColor}
            name={provider.name}
            size={44}
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">{provider.name}</h3>
              {configured ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Connected
                </Badge>
              ) : (
                <Badge variant="outline">Not configured</Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{provider.description}</p>
            {defaultFor && defaultFor.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {defaultFor.map((g) =>
                  g.isDefault ? (
                    <Badge key={g.id} className="bg-primary/10 text-primary hover:bg-primary/10">
                      <Star className="mr-1 h-3 w-3" /> Default for {g.label.toLowerCase()}
                    </Badge>
                  ) : (
                    <Button
                      key={g.id}
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      disabled={!configured || !onSetDefault}
                      title={configured ? `Use ${provider.name} for ${g.label.toLowerCase()} everywhere` : "Configure it first"}
                      onClick={() => onSetDefault?.(g.id)}
                    >
                      Set as default for {g.label.toLowerCase()}
                    </Button>
                  ),
                )}
              </div>
            )}
            {provider.capabilities?.balance && configured && (
              <p className={`mt-1.5 flex items-center gap-1 text-xs ${balance?.low ? "text-red-700" : "text-muted-foreground"}`}>
                <Wallet className="h-3.5 w-3.5" />
                {balance ? (
                  <>
                    Balance {balance.estimate ? "about " : ""}
                    <span className="font-medium">{formatBalance(balance)}</span>
                    {balance.low && " (below the low mark)"}, checked {checkedAt.format(new Date(balance.at))}
                  </>
                ) : (
                  "No balance reading yet; the watcher reads it every 15 minutes."
                )}
              </p>
            )}
          </div>
        </div>
        {provider.docsUrl && (
          <a
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            href={provider.docsUrl}
            target="_blank"
            rel="noreferrer"
          >
            Docs <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {provider.fields.map((f) => {
          const isModelField =
            provider.modelFieldKeys?.includes(f.key) ?? /model$/i.test(f.key);
          return (
            <FieldInput
              key={f.key}
              field={f}
              value={values[f.key] ?? ""}
              placeholder={
                f.placeholder ??
                (f.secret && configured ? "•••••••• (leave blank to keep)" : undefined)
              }
              modelChoices={isModelField && modelChoices.length > 0 ? modelChoices : null}
              onChange={(v) => set(f.key, v)}
            />
          );
        })}
      </div>

      {latest.length > 0 && (
        <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-xs">
          <p className="mb-1 font-medium">Newest model per tier</p>
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

      {feedback && (
        <p
          className={`mt-3 flex items-center gap-1 text-xs ${
            feedback.kind === "ok" ? "text-green-700" : "text-red-700"
          }`}
        >
          {feedback.kind === "ok" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5" />
          )}
          {feedback.text}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          style={{ background: provider.brandColor }}
          className="text-white"
        >
          {save.isPending ? "Saving…" : configured ? "Update" : "Configure"}
        </Button>
        {provider.capabilities?.syncModels && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => syncModels.mutate()}
            disabled={syncModels.isPending || !canSync}
            title={!canSync ? "Configure an API key first" : "Fetch live list of models"}
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${syncModels.isPending ? "animate-spin" : ""}`}
            />
            Sync models
          </Button>
        )}
        {provider.capabilities?.test && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => test.mutate()}
            disabled={test.isPending || !canTest}
            title={
              !canTest
                ? "Save configuration first, then run a test probe"
                : "Send a probe request to the provider"
            }
          >
            <Zap className={`mr-1.5 h-3.5 w-3.5 ${test.isPending ? "animate-pulse" : ""}`} />
            {test.isPending ? "Testing…" : "Test"}
          </Button>
        )}
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  placeholder,
  modelChoices,
  onChange,
}: {
  field: ProviderField;
  value: string;
  placeholder?: string;
  modelChoices: string[] | null;
  onChange: (v: string) => void;
}) {
  const label = (
    <span className="mb-1 block text-xs font-medium text-muted-foreground">
      {field.label}
      {field.required && <span className="ml-1 text-red-500">*</span>}
    </span>
  );

  // If sync-models returned a list, render Select preserving the current value
  // even if it's not in the list (so saved values aren't lost on re-render).
  if (modelChoices && modelChoices.length > 0) {
    const choices =
      value && !modelChoices.includes(value) ? [value, ...modelChoices] : modelChoices;
    return (
      <label className="block">
        {label}
        <Select value={value || undefined} onValueChange={(v) => onChange(v ?? "")}>
          <SelectTrigger>
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
        {field.help && <p className="mt-1 text-[11px] text-muted-foreground">{field.help}</p>}
      </label>
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <label className="block">
        {label}
        <Select value={value || undefined} onValueChange={(v) => onChange(v ?? "")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {field.help && <p className="mt-1 text-[11px] text-muted-foreground">{field.help}</p>}
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="block">
        {label}
        <Textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          spellCheck={false}
          className="font-mono text-xs"
        />
        {field.help && <p className="mt-1 text-[11px] text-muted-foreground">{field.help}</p>}
      </label>
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
    <label className="block">
      {label}
      <Input
        type={inputType}
        value={value}
        placeholder={placeholder}
        min={field.min}
        max={field.max}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      {field.help && <p className="mt-1 text-[11px] text-muted-foreground">{field.help}</p>}
    </label>
  );
}
