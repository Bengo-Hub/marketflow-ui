"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createPublicLead } from "@/lib/api/public";
import type { FunnelField } from "./types";

const field =
  "min-h-11 w-full rounded-xl border border-input bg-background/80 px-3 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30 aria-[invalid=true]:border-destructive";

const INPUT_TYPES = new Set(["text", "email", "tel", "number", "date", "url"]);

/** Lead form for a funnel: posts to the tenant's public lead endpoint with UTM tags and the funnel slug. */
export function FunnelForm({
  tenantSlug,
  funnelSlug,
  title,
  description,
  ctaText,
  fields,
}: {
  tenantSlug: string;
  funnelSlug: string;
  title?: string;
  description?: string;
  ctaText?: string;
  fields: FunnelField[];
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const url = new URL(window.location.href);
    const utm: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign"]) {
      const v = url.searchParams.get(k);
      if (v) utm[k] = v;
    }
    // Known lead fields go top level; anything else is an answer to a custom question.
    const known = new Set(["email", "phone", "first_name", "last_name", "interest"]);
    const top: Record<string, string> = {};
    const answers: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      if (!v) continue;
      (known.has(k) ? top : answers)[k] = v;
    }
    try {
      await createPublicLead(tenantSlug, {
        ...top,
        ...utm,
        ...(Object.keys(answers).length ? { answers } : {}),
        source: "funnel",
        funnel_slug: funnelSlug,
      });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section role="status" className="glass rounded-[1.5rem] p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
        <h2 className="mt-3 font-display text-xl font-semibold">Thank you, we have your details</h2>
        <p className="mt-1 text-sm text-muted-foreground">We will be in touch shortly.</p>
      </section>
    );
  }

  return (
    <section className="glass rounded-[1.5rem] p-6 sm:p-8">
      {title && <h2 className="font-display text-xl font-semibold">{title}</h2>}
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <form onSubmit={onSubmit} className="mt-6 grid gap-4 md:grid-cols-2" noValidate={false}>
        {fields.map((f) => {
          const type = INPUT_TYPES.has(f.type ?? "") ? f.type : "text";
          const id = `ff-${f.key}`;
          return (
            <label key={f.key} htmlFor={id} className={f.type === "textarea" ? "block md:col-span-2" : "block"}>
              <span className="mb-1.5 block text-sm font-medium">
                {f.label}
                {f.required && <span className="ml-1 text-destructive">*</span>}
              </span>
              {f.type === "textarea" ? (
                <textarea
                  id={id}
                  required={f.required}
                  rows={3}
                  placeholder={f.placeholder}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                  className={`${field} py-2.5`}
                />
              ) : (
                <input
                  id={id}
                  type={type}
                  required={f.required}
                  placeholder={f.placeholder}
                  autoComplete={f.key === "email" ? "email" : f.key === "phone" ? "tel" : f.key === "first_name" ? "given-name" : f.key === "last_name" ? "family-name" : undefined}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                  className={field}
                />
              )}
            </label>
          );
        })}
        {error && (
          <p role="alert" className="text-sm text-destructive md:col-span-2">
            {error}
          </p>
        )}
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-7 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Sending..." : ctaText || "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}
