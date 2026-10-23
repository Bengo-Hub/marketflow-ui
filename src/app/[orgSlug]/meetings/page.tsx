"use client";

import { useState } from "react";
import { CalendarDays, Check, ExternalLink, Plus, UserX, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CapsuleTabs, EmptyState, ErrorState, Field, Pager, PageHeader, StatusBadge, ToneBadge, humanize } from "@/components/ui-kit";
import { useMeetings, useSaveMeeting } from "@/hooks/use-meetings";
import { MEETING_TYPES, type Meeting, type MeetingInput } from "@/lib/api/meetings";

const dayFmt = new Intl.DateTimeFormat("en-KE", { weekday: "long", day: "numeric", month: "long" });
const timeFmt = new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit" });

function groupByDay(rows: Meeting[], ascending: boolean) {
  const sorted = [...rows].sort((a, b) => (ascending ? 1 : -1) * (Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at)));
  const groups: Array<{ day: string; items: Meeting[] }> = [];
  for (const m of sorted) {
    const day = dayFmt.format(new Date(m.scheduled_at));
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.items.push(m);
    else groups.push({ day, items: [m] });
  }
  return groups;
}

function BookDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveMeeting();
  const [f, setF] = useState<Omit<MeetingInput, "scheduled_at"> & { date: string; time: string }>({ date: "", time: "10:00", duration_minutes: 30, meeting_type: "product_demo" });
  // Captured when the dialog mounts; good enough to flag a time that has already passed.
  const [openedAt] = useState(() => Date.now());
  const when = f.date && f.time ? new Date(`${f.date}T${f.time}:00`) : null;
  const past = when ? when.getTime() < openedAt : false;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Book a meeting</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" required htmlFor="mt-d" error={past ? "That time has passed" : null}><Input id="mt-d" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Time" required htmlFor="mt-t"><Input id="mt-t" type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium">Type</p>
            <CapsuleTabs label="Meeting type" value={f.meeting_type ?? "product_demo"} onChange={(v) => setF({ ...f, meeting_type: v })} options={MEETING_TYPES.map((t) => ({ value: t, label: humanize(t) }))} />
          </div>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium">Length</p>
            <CapsuleTabs label="Length" value={String(f.duration_minutes)} onChange={(v) => setF({ ...f, duration_minutes: Number(v) })} options={[15, 30, 45, 60].map((n) => ({ value: String(n), label: `${n} min` }))} />
          </div>
          <Field label="With" htmlFor="mt-n"><Input id="mt-n" value={f.attendee_name ?? ""} onChange={(e) => setF({ ...f, attendee_name: e.target.value })} /></Field>
          <Field label="Their email" htmlFor="mt-e" hint="They get the calendar invite."><Input id="mt-e" type="email" value={f.attendee_email ?? ""} onChange={(e) => setF({ ...f, attendee_email: e.target.value })} /></Field>
          <Field label="Notes" className="sm:col-span-2" htmlFor="mt-notes"><Textarea id="mt-notes" rows={3} value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!when || past || save.isPending}
            onClick={() =>
              when &&
              save.mutate(
                {
                  data: {
                    scheduled_at: when.toISOString(),
                    duration_minutes: f.duration_minutes,
                    meeting_type: f.meeting_type,
                    attendee_name: f.attendee_name || undefined,
                    attendee_email: f.attendee_email || undefined,
                    notes: f.notes || undefined,
                  },
                },
                { onSuccess: () => onOpenChange(false) },
              )
            }
          >
            {save.isPending ? "Booking..." : "Book meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MeetingsPage() {
  const [view, setView] = useState<"upcoming" | "past">("upcoming");
  const [page, setPage] = useState(1);
  const [booking, setBooking] = useState(false);
  const list = useMeetings(view, page);
  const save = useSaveMeeting();
  const groups = groupByDay(list.data?.data ?? [], view === "upcoming");

  return (
    <div className="space-y-6">
      <PageHeader icon={<CalendarDays />} title="Meetings" description="Calls booked from your page, your chat and by you." actions={<Button onClick={() => setBooking(true)}><Plus /> Book a meeting</Button>} />
      <CapsuleTabs label="Which meetings" value={view} onChange={(v) => { setView(v); setPage(1); }} options={[{ value: "upcoming", label: "Upcoming" }, { value: "past", label: "Past" }]} />

      {list.isError && <ErrorState message="Could not load meetings." onRetry={() => void list.refetch()} />}
      {list.isLoading && <div className="glass h-48 animate-pulse rounded-[1.25rem]" />}
      {!list.isLoading && !list.isError && groups.length === 0 && (
        <div className="glass rounded-[1.25rem]">
          <EmptyState icon={<CalendarDays />} title={view === "upcoming" ? "Nothing booked yet" : "No past meetings"} description="Visitors book from your public page once Google Calendar is connected in Settings, Integrations." />
        </div>
      )}

      <div className="space-y-5">
        {groups.map((g) => (
          <section key={g.day}>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{g.day}</h2>
            <ul className="glass divide-y divide-border rounded-[1.25rem]">
              {g.items.map((m) => (
                <li key={m.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="w-24 shrink-0">
                    <p className="font-display text-lg font-semibold tabular">{timeFmt.format(new Date(m.scheduled_at))}</p>
                    <p className="text-xs text-muted-foreground">{m.duration_minutes} min</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{humanize(m.meeting_type)}{m.attendee_name ? ` with ${m.attendee_name}` : ""}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={m.status} />
                      {m.attendee_email && <span className="truncate text-xs text-muted-foreground">{m.attendee_email}</span>}
                    </div>
                    {m.notes && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.notes}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {m.meeting_url && <a href={m.meeting_url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"><Video className="h-4 w-4" /> Join</a>}
                    {m.google_event_link && <a href={m.google_event_link} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-sm hover:bg-muted"><ExternalLink className="h-4 w-4" /> Calendar</a>}
                    {m.status === "scheduled" && view === "past" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => save.mutate({ id: m.id, data: { status: "completed" } })}><Check /> Held</Button>
                        <Button size="sm" variant="outline" onClick={() => save.mutate({ id: m.id, data: { status: "no_show" } })}><UserX /> No-show</Button>
                      </>
                    )}
                    {m.status === "scheduled" && view === "upcoming" && (
                      <Button size="sm" variant="ghost" onClick={() => save.mutate({ id: m.id, data: { status: "cancelled" } })}><X /> Cancel</Button>
                    )}
                    {m.status !== "scheduled" && <ToneBadge>{humanize(m.status)}</ToneBadge>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {list.data && <Pager page={page} limit={list.data.limit || 50} total={list.data.total} onPage={setPage} />}
      {booking && <BookDialog open onOpenChange={setBooking} />}
    </div>
  );
}
