"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProviderLogo } from "./provider-logo";
import type { ProviderDef, ProviderField } from "@/lib/providers/catalog";
import { ExternalLink, RefreshCw, CheckCircle2, AlertCircle, Zap } from "lucide-react";

type ProviderRow = {
  id: string;
  provider_type: string;
  provider_name: string;
  status?: string;
  is_active?: boolean;
};

/**
 * Metadata-driven config card for a single provider. Reads the catalog
 * definition to render inputs; handles save, sync-models, test connection,
 * and shows connected / unset state.
 */
export function ProviderCard({
  provider,
  existing,
}: {
  provider: ProviderDef;
  existing?: ProviderRow;
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

  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => setValues(initial), [initial]);

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

  const syncModels = useMutation({
    mutationFn: async () => {
      const r = await apiClient.post<{ models: { id: string }[] }>(`/api/v1/admin/providers/sync-models`, {
        provider_type: provider.type,
        provider_name: provider.id,
      });
      return r.data.models.map((m) => m.id);
    },
    onSuccess: (models) => {
      qc.setQueryData(["provider-models", provider.type, provider.id], models);
      setFeedback({ kind: "ok", text: `${models.length} models available — pick from dropdown` });
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
    setValues((s) => ({ ...s, [key]: value }));
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
