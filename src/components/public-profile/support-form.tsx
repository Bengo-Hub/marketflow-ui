"use client";

import { useState } from "react";
import { LifeBuoy, Loader2 } from "lucide-react";
import { createSupportTicket, sendSupportCode, verifySupportCode } from "@/lib/api/public-support";

const field =
  "min-h-11 w-full rounded-xl border border-input bg-background/80 px-3 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30";
const submitCls =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-dark disabled:opacity-60";

type Step = "details" | "code" | "done";

/**
 * A support request to the business, opened as a ticket in ticketing-api. The visitor's email is
 * verified with a six-digit code first, the same rule the chat widget follows, so a ticket always
 * carries an address that is really theirs.
 */
export function SupportForm({ tenantSlug, businessName }: { tenantSlug: string; businessName: string }) {
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onDetails(e: React.FormEvent) {
    e.preventDefault();
    void run(async () => {
      await sendSupportCode(tenantSlug, email.trim());
      setCode("");
      setStep("code");
    });
  }

  function onCode(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    void run(async () => {
      const token = await verifySupportCode(tenantSlug, email.trim(), code.trim());
      const res = await createSupportTicket(tenantSlug, token, {
        name: name.trim(),
        subject: subject.trim(),
        description: `${description.trim()}\n\nSent from ${businessName}'s MarketFlow page.`,
      });
      setTicketNumber(res.ticket_number ?? null);
      setStep("done");
    });
  }

  if (step === "done") {
    return (
      <div role="status" className="glass rounded-[1.25rem] p-8 text-center">
        <LifeBuoy className="mx-auto h-10 w-10 text-success" />
        <h3 className="mt-3 font-display text-xl font-semibold">Your request is in</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {ticketNumber ? (
            <>
              Ticket <span className="font-semibold tabular text-foreground">{ticketNumber}</span>.{" "}
            </>
          ) : null}
          Replies go to {email.trim()}.
        </p>
      </div>
    );
  }

  if (step === "code") {
    return (
      <form onSubmit={onCode} className="glass grid gap-4 rounded-[1.25rem] p-5 sm:p-6">
        <p className="text-sm text-muted-foreground">
          I sent a 6-digit code to <span className="font-semibold text-foreground">{email.trim()}</span>. It expires in 10 minutes.
        </p>
        <label className="block max-w-xs">
          <span className="mb-1.5 block text-sm font-medium">Verification code</span>
          <input
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className={`${field} text-center tracking-[0.4em] tabular`}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className={submitCls}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Verifying..." : "Verify and send"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError(null);
              setStep("details");
            }}
            className="text-sm font-semibold text-primary hover:underline disabled:opacity-60"
          >
            Change details
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onDetails} className="glass grid gap-4 rounded-[1.25rem] p-5 sm:grid-cols-2 sm:p-6">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          Your name <span className="text-destructive">*</span>
        </span>
        <input required maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          Email <span className="text-destructive">*</span>
        </span>
        <input type="email" required maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium">
          Subject <span className="text-destructive">*</span>
        </span>
        <input required maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} className={field} />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium">
          How can I help? <span className="text-destructive">*</span>
        </span>
        <textarea
          required
          maxLength={4500}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${field} py-2`}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={`${submitCls} sm:col-span-2 sm:w-fit`}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "Sending code..." : "Continue"}
      </button>
      <p className="text-xs text-muted-foreground sm:col-span-2">I will email you a code to confirm the address before the request is sent.</p>
    </form>
  );
}
