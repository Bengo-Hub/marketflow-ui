"use client";

import { useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://marketflowapi.codevertexitsolutions.com";

type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
};

type Step = {
  id?: string;
  title?: string;
  description?: string;
  cta_text?: string;
  fields?: Field[];
};

export function FunnelForm({
  tenantSlug,
  step,
  brandColor,
}: {
  tenantSlug: string;
  step: Step;
  brandColor: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Capture UTM params from URL if present.
    const url = new URL(window.location.href);
    const utm: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
      const v = url.searchParams.get(k);
      if (v) utm[k] = v;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/public/leads/${tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          ...utm,
          source: "funnel",
          funnel_slug: window.location.pathname.split("/").pop(),
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
      }
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section className="mt-10 rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold">Thanks — we'll be in touch</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your details have been received.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-2xl border bg-white p-8 shadow-sm">
      {step.title && <h2 className="text-xl font-semibold">{step.title}</h2>}
      {step.description && (
        <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
      )}

      <form onSubmit={onSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
        {(step.fields ?? []).map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              {f.label}
              {f.required && <span className="ml-1 text-red-500">*</span>}
            </span>
            <input
              type={f.type ?? "text"}
              required={f.required}
              placeholder={f.placeholder}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </label>
        ))}
        {error && (
          <p className="md:col-span-2 text-sm text-red-600">{error}</p>
        )}
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full px-8 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: brandColor }}
          >
            {submitting ? "Submitting…" : step.cta_text ?? "Submit"}
          </button>
        </div>
      </form>
    </section>
  );
}
