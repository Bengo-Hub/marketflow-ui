"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://marketflowapi.codevertexafrica.com";

type Slot = { start: string; end: string };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function BookingWidget({
  tenantSlug,
  brandColor = "#16a34a",
}: {
  tenantSlug: string;
  brandColor?: string;
}) {
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [connected, setConnected] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ meetingUrl?: string } | null>(null);

  async function loadSlots(d: string) {
    setLoadingSlots(true);
    setError(null);
    setSelected(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/public/availability/${tenantSlug}?date=${d}`);
      const body = await res.json();
      setConnected(body.connected !== false);
      setSlots(body.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  useEffect(() => {
    loadSlots(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onDateChange(d: string) {
    setDate(d);
    loadSlots(d);
  }

  async function onBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/public/book/${tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_start: selected.start, name, email, phone }),
      });
      if (res.status === 409) {
        setError("That time was just taken — please pick another slot.");
        loadSlots(date);
        return;
      }
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message || `HTTP ${res.status}`);
      }
      setConfirmation({ meetingUrl: body?.meeting_url });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h3 className="text-xl font-semibold">You&apos;re booked!</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Check your email for the calendar invite.
        </p>
        {confirmation.meetingUrl && (
          <a
            href={confirmation.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-sm font-medium underline"
            style={{ color: brandColor }}
          >
            Join link
          </a>
        )}
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          Booking isn&apos;t available right now — check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Pick a date</span>
        <input
          type="date"
          min={todayISO()}
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </label>

      <div className="mt-4">
        <span className="mb-2 block text-xs font-medium text-muted-foreground">Available times</span>
        {loadingSlots ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !slots || slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open slots on this day — try another date.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((s) => (
              <button
                key={s.start}
                type="button"
                onClick={() => setSelected(s)}
                className="rounded-md border px-2 py-2 text-sm"
                style={
                  selected?.start === s.start
                    ? { background: brandColor, color: "#fff", borderColor: brandColor }
                    : undefined
                }
              >
                {formatSlotTime(s.start)}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <form onSubmit={onBook} className="mt-6 grid gap-4 border-t pt-6">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Name <span className="text-red-500">*</span>
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Email <span className="text-red-500">*</span>
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Phone</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full px-8 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: brandColor }}
          >
            {submitting ? "Booking…" : `Confirm ${formatSlotTime(selected.start)}`}
          </button>
        </form>
      )}
    </div>
  );
}
