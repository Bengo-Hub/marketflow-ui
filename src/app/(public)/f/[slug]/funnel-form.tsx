"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
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
  variant,
  id,
  prominent = false,
  businessName,
}: {
  tenantSlug: string;
  funnelSlug: string;
  /** The anchor the page's sticky call to action scrolls to. */
  id?: string;
  /** The page's main form: one column, a full-width button and the privacy line under it. */
  prominent?: boolean;
  /** Names who will reply, in the privacy line and the thank-you note. */
  businessName?: string;
  /** The A/B version the visitor saw (Sprint 7 #53), recorded on the lead. */
  variant?: "a" | "b";
  title?: string;
  description?: string;
  ctaText?: string;
  fields: FunnelField[];
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  // The lead's own "OK to contact me on WhatsApp" tick: follow-ups go by WhatsApp only with it
  // (Kenya Data Protection Act). Shown only when the form asks for a phone number.
  const [waConsent, setWaConsent] = useState(false);
  const asksPhone = fields.some((f) => f.key === "phone");
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
        ...(variant ? { funnel_variant: variant } : {}),
        whatsapp_consent: asksPhone && waConsent,
      });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const shell = prominent
    ? "scroll-mt-6 rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-soft ring-1 ring-primary/10 sm:p-7"
    : "glass scroll-mt-6 rounded-[1.5rem] p-6 sm:p-8";
  const span = prominent ? "" : "md:col-span-2";

  if (done) {
    return (
      <section id={id} role="status" className={`${shell} text-center`}>
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
        <h2 className="mt-3 font-display text-xl font-semibold">Thank you, we have your details</h2>
        <p className="mt-1 text-sm text-muted-foreground">{businessName ? `${businessName} will be in touch shortly.` : "We will be in touch shortly."}</p>
      </section>
    );
  }

  return (
    <section id={id} className={shell}>
      {title && <h2 className="font-display text-xl font-semibold">{title}</h2>}
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <form onSubmit={onSubmit} className={`mt-5 grid gap-4 ${prominent ? "" : "md:grid-cols-2"}`} noValidate={false}>
        {fields.map((f) => {
          const type = INPUT_TYPES.has(f.type ?? "") ? f.type : "text";
          const id = `ff-${f.key}`;
          return (
            <label key={f.key} htmlFor={id} className={f.type === "textarea" ? `block ${span}` : "block"}>
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
                  inputMode={type === "tel" ? "tel" : type === "email" ? "email" : undefined}
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
        {asksPhone && (
          <label className={`flex min-h-11 items-start gap-3 text-sm ${span}`}>
            <input
              type="checkbox"
              checked={waConsent}
              onChange={(e) => setWaConsent(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-input accent-primary"
            />
            <span>OK to contact me on WhatsApp about this</span>
          </label>
        )}
        {error && (
          <p role="alert" className={`text-sm text-destructive ${span}`}>
            {error}
          </p>
        )}
        <div className={span}>
          <button
            type="submit"
            disabled={submitting}
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-base font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60 ${
              prominent ? "w-full" : "w-full sm:w-auto"
            }`}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Sending..." : ctaText || "Send"}
          </button>
          {prominent && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {businessName ? `Only ${businessName} sees your details, to reply to you.` : "Your details are used only to reply to you."}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
