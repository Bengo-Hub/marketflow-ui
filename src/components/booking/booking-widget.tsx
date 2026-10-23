"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";
import { SlotTakenError, createBooking, getAvailability, type Slot } from "@/lib/api/public";
import { cn } from "@/lib/utils";

/** Today in the visitor's own timezone as YYYY-MM-DD (toISOString would give the UTC date). */
function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

const field =
  "min-h-11 w-full rounded-xl border border-input bg-background/80 px-3 text-base outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30";

/** Picks a free slot from the owner's Google Calendar and books it (GET availability, POST book). */
export function BookingWidget({ tenantSlug }: { tenantSlug: string }) {
  const [date, setDate] = useState(todayLocal());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [connected, setConnected] = useState(true);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ meetingUrl?: string; at: string } | null>(null);

  const load = useCallback(
    async (d: string) => {
      setState("loading");
      setSelected(null);
      try {
        const res = await getAvailability(tenantSlug, d);
        setConnected(res.connected);
        setSlots(res.slots);
        setState("ready");
      } catch {
        setState("error");
      }
    },
    [tenantSlug],
  );

  useEffect(() => {
    void load(date);
  }, [load, date]);

  async function onBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await createBooking(tenantSlug, { slot_start: selected.start, name, email, phone: phone || undefined });
      setDone({ meetingUrl: res.meeting_url, at: selected.start });
    } catch (err) {
      setError((err as Error).message);
      if (err instanceof SlotTakenError) void load(date);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="glass rounded-[1.25rem] p-8 text-center">
        <CalendarCheck className="mx-auto h-10 w-10 text-success" />
        <h3 className="mt-3 font-display text-xl font-semibold">You are booked</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(new Date(done.at))}.
          The calendar invite is on its way to your email.
        </p>
        {done.meetingUrl && (
          <a href={done.meetingUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
            Open the meeting link
          </a>
        )}
      </div>
    );
  }

  if (state === "ready" && !connected) {
    return (
      <div className="glass rounded-[1.25rem] p-8 text-center text-sm text-muted-foreground">
        Online booking is not open yet. Get in touch directly to arrange a time.
      </div>
    );
  }

  return (
    <div className="glass rounded-[1.25rem] p-5 sm:p-6">
      <label className="block max-w-xs">
        <span className="mb-1.5 block text-sm font-medium">Date</span>
        <input type="date" min={todayLocal()} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={field} />
      </label>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium">Available times</legend>
        {state === "loading" && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}
        {state === "error" && (
          <p className="text-sm text-destructive">
            Could not load the calendar.{" "}
            <button type="button" onClick={() => void load(date)} className="font-semibold underline">
              Try again
            </button>
          </p>
        )}
        {state === "ready" && slots.length === 0 && (
          <p className="text-sm text-muted-foreground">No free times on this day. Pick another date.</p>
        )}
        {state === "ready" && slots.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {slots.map((s) => {
              const active = selected?.start === s.start;
              return (
                <button
                  key={s.start}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(s)}
                  className={cn(
                    "min-h-11 rounded-xl border text-sm font-medium tabular transition-colors",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/70 hover:border-primary/50",
                  )}
                >
                  {timeFmt.format(new Date(s.start))}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      {selected && (
        <form onSubmit={onBook} className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Your name <span className="text-destructive">*</span></span>
            <input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Email <span className="text-destructive">*</span></span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium">Phone</span>
            <input type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive sm:col-span-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-dark disabled:opacity-60 sm:col-span-2 sm:w-fit"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Booking..." : `Book ${timeFmt.format(new Date(selected.start))}`}
          </button>
        </form>
      )}
    </div>
  );
}
