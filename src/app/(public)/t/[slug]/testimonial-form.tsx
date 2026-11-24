"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ImagePlus, Loader2, Star, X } from "lucide-react";
import { API_URL } from "@/lib/urls";
import { cn } from "@/lib/utils";

const field =
  "min-h-11 w-full rounded-xl border border-input bg-background/80 px-3 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30 aria-[invalid=true]:border-destructive";

const MAX_FILE_MB = 40;
const ACCEPT = "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime";

/**
 * A customer's testimonial for one business: name, rating, their words, an optional photo or
 * video, and their consent to publish. It goes to the business for review; nothing is shown until
 * the business approves it. The hidden "website" field and the start time are the spam checks.
 */
export function TestimonialForm({ slug, businessName }: { slug: string; businessName: string }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [consent, setConsent] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(0);
  const honeypot = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const tooShort = text.trim().length < 10;
  const canSend = name.trim() !== "" && !tooShort && rating > 0 && consent && !submitting;

  function pickFile(f: File | null) {
    setError(null);
    if (f && f.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`The file is larger than ${MAX_FILE_MB} MB. Choose a shorter video or a photo.`);
      return;
    }
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    setSubmitting(true);
    setError(null);
    const body = new FormData();
    body.set("name", name.trim());
    body.set("role", role.trim());
    body.set("text", text.trim());
    body.set("rating", String(rating));
    body.set("consent", consent ? "true" : "");
    if (email.trim()) body.set("email", email.trim());
    body.set("website", honeypot.current?.value ?? "");
    body.set("started_at", String(startedAt.current));
    if (file) body.set("file", file);
    try {
      const r = await fetch(`${API_URL}/api/v1/public/testimonials/${encodeURIComponent(slug)}`, { method: "POST", body });
      if (!r.ok) {
        // marketflow-api answers {error: "<message>", code}; its messages are written for people.
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ? j.error.charAt(0).toUpperCase() + j.error.slice(1) + "." : "Your testimonial could not be sent. Please try again.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your testimonial could not be sent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="glass rounded-[1.25rem] p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto size-10 text-success" />
        <h2 className="mt-3 font-display text-xl font-semibold">Thank you</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {businessName} will read your testimonial and decide whether to share it. It is shown exactly as you wrote it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="glass space-y-5 rounded-[1.25rem] p-5 sm:p-7" noValidate>
      <div>
        <span className="text-sm font-medium" id="rating-label">Your rating</span>
        <div className="mt-1 flex gap-1" role="radiogroup" aria-labelledby="rating-label">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n === rating}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => setRating(n)}
              className="grid size-11 place-items-center rounded-xl hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              <Star className={cn("size-6", n <= rating ? "fill-warning text-warning" : "text-muted-foreground/40")} />
            </button>
          ))}
        </div>
      </div>

      <label className="block text-sm font-medium">
        What would you tell a friend about {businessName}?
        <textarea
          className={cn(field, "mt-1 min-h-32 py-2")}
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          aria-invalid={text !== "" && tooShort}
        />
        <span className="mt-1 block text-xs text-muted-foreground">At least 10 characters. Your words are shown as you write them.</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Your name
          <input className={cn(field, "mt-1")} maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block text-sm font-medium">
          About you <span className="font-normal text-muted-foreground">(optional)</span>
          <input className={cn(field, "mt-1")} maxLength={120} placeholder="For example: customer since 2023" value={role} onChange={(e) => setRole(e.target.value)} />
        </label>
      </div>

      <label className="block text-sm font-medium">
        Email <span className="font-normal text-muted-foreground">(optional, never shown; only if the business needs to ask you something)</span>
        <input className={cn(field, "mt-1")} type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>

      <div>
        <span className="text-sm font-medium">A photo or short video <span className="font-normal text-muted-foreground">(optional)</span></span>
        {file ? (
          <div className="mt-1 flex items-center gap-3 rounded-xl border border-input bg-background/80 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            <button type="button" className="grid size-9 place-items-center rounded-lg hover:bg-accent" aria-label="Remove the file" onClick={() => setFile(null)}>
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <label className="mt-1 flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-input bg-background/60 px-3 text-sm text-muted-foreground hover:border-primary">
            <ImagePlus className="size-4" /> Choose a photo or video (up to {MAX_FILE_MB} MB)
            <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
          </label>
        )}
      </div>

      {/* Hidden from people; bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Website
          <input ref={honeypot} name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 size-4" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
        <span>
          {businessName} may publish my testimonial, my name and my photo or video on its pages and in its adverts. The words stay
          exactly as I wrote them.
        </span>
      </label>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      <button
        type="submit"
        disabled={!canSend}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting && <Loader2 className="size-4 animate-spin" />} {submitting ? "Sending..." : "Send my testimonial"}
      </button>
    </form>
  );
}
