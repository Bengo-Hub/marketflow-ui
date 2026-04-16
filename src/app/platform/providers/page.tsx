"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";

// Platform-level AI providers only: Groq, Tavily, Ollama, Meta App.
// Messaging (Email/SMS/WhatsApp/Push) is intentionally NOT here — it lives in
// notifications-api and is surfaced at /platform/messaging.
// Per-tenant AI overrides never appear on this page (this is platform-only).
type ProviderSetting = {
  id: string;
  provider_type: string;
  provider_name: string;
  status: string;
  environment: string;
  is_platform: boolean;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
};

const PROVIDER_TYPES = [
  { type: "ai_llm", label: "Groq LLM", fields: ["api_key", "base_url", "main_model", "router_model", "fallback_model"] },
  { type: "ai_search", label: "Tavily web search", fields: ["api_key", "daily_cap"] },
  { type: "ai_embed", label: "Ollama embeddings", fields: ["base_url", "embedding_model"] },
  { type: "meta_app", label: "Meta App (leadgen webhook)", fields: ["app_id", "app_secret", "verify_token"] },
];

export default function PlatformProvidersPage() {
  const [items, setItems] = useState<ProviderSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{ providers: ProviderSetting[] }>("/api/v1/admin/providers")
      .then((r) => setItems(r.data.providers ?? []))
      .catch((e) => setError(e?.message ?? "Failed to load providers"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">AI & integration providers</h1>
        <p className="text-sm text-muted-foreground">
          Platform-shared secrets. Stored encrypted; values are never displayed in clear text. Changes take effect within 60 seconds.
        </p>
      </header>

      {error && <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <section className="space-y-4">
        {PROVIDER_TYPES.map((p) => {
          const existing = items.find((i) => i.provider_type === p.type);
          return (
            <ProviderCard
              key={p.type}
              label={p.label}
              providerType={p.type}
              fields={p.fields}
              existing={existing}
              onSaved={(saved) => setItems((curr) => upsert(curr, saved))}
            />
          );
        })}
      </section>

      <div className="pt-4">
        <h2 className="mb-2 text-lg font-medium">All configured providers</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No providers configured yet.</p>
        ) : (
          <ul className="divide-y rounded border">
            {items.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>
                  <strong>{p.provider_name}</strong>
                  <span className="ml-2 text-muted-foreground">({p.provider_type})</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {p.environment} · {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function upsert(curr: ProviderSetting[], saved: ProviderSetting): ProviderSetting[] {
  const idx = curr.findIndex((i) => i.id === saved.id);
  if (idx === -1) return [...curr, saved];
  const next = curr.slice();
  next[idx] = saved;
  return next;
}

function ProviderCard({
  label,
  providerType,
  fields,
  existing,
  onSaved,
}: {
  label: string;
  providerType: string;
  fields: string[];
  existing?: ProviderSetting;
  onSaved: (saved: ProviderSetting) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setOk(false);
    try {
      const res = await apiClient.post<ProviderSetting>("/api/v1/admin/providers/configure", {
        provider_type: providerType,
        settings: form,
        environment: "production",
      });
      onSaved(res.data);
      setOk(true);
      setForm({});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setErr(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">
            {existing ? `Last updated ${new Date(existing.updated_at).toLocaleString()}` : "Not configured"}
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            existing?.status === "active"
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {existing?.status ?? "unset"}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((f) => (
          <label key={f} className="text-xs">
            <span className="mb-1 block font-medium text-muted-foreground">{f}</span>
            <input
              type={f.includes("secret") || f.includes("key") || f.includes("token") ? "password" : "text"}
              value={form[f] ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, [f]: e.target.value }))}
              placeholder={existing ? "•••••• (encrypted)" : ""}
              className="w-full rounded border px-2 py-1.5 text-sm"
              autoComplete="off"
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-[var(--brand-primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : existing ? "Update" : "Configure"}
        </button>
        {ok && <span className="text-xs text-green-700">Saved</span>}
        {err && <span className="text-xs text-red-700">{err}</span>}
      </div>
    </form>
  );
}
