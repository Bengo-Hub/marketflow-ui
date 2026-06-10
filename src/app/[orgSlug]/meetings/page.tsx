"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Meeting = {
  id: string;
  lead_id?: string | null;
  contact_id?: string | null;
  meeting_type: string;
  status: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url?: string | null;
  google_event_link?: string | null;
  attendee_email?: string | null;
  attendee_name?: string | null;
  organizer_email?: string | null;
  notes?: string | null;
  created_at: string;
};

const TYPES = [
  { value: "product_demo", label: "Product demo" },
  { value: "business_opportunity", label: "Business opportunity" },
  { value: "follow_up", label: "Follow-up" },
  { value: "onboarding", label: "Onboarding" },
];

const STATUSES = ["scheduled", "completed", "no_show", "cancelled", "rescheduled"];

export default function MeetingsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [form, setForm] = useState<Partial<Meeting>>({
    meeting_type: "product_demo",
    duration_minutes: 30,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["meetings", filter],
    queryFn: async () => {
      const p = new URLSearchParams({ limit: "50" });
      if (filter !== "all") p.set("status", filter);
      const r = await apiClient.get<{ data: Meeting[] }>(`/api/v1/meetings?${p}`);
      return r.data;
    },
    refetchInterval: 30_000,
  });

  const create = useMutation({
    mutationFn: async (m: Partial<Meeting>) => apiClient.post(`/api/v1/meetings`, m),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      setOpen(false);
      setForm({ meeting_type: "product_demo", duration_minutes: 30 });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      apiClient.put(`/api/v1/meetings/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-sm text-muted-foreground">
            Scheduled calls with leads. When Google Calendar is connected, every meeting is
            pushed to your calendar with a Google Meet link.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v ?? "all")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setOpen(true)}>+ Schedule</Button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Failed to load meetings: {(error as Error).message}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Attendee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="w-48"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No meetings yet. Schedule one manually, or let the AI assistant book them
                    from chat.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="font-medium">{new Date(m.scheduled_at).toLocaleDateString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(m.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{m.attendee_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{m.attendee_email ?? ""}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{m.meeting_type}</Badge></TableCell>
                    <TableCell>{m.duration_minutes}m</TableCell>
                    <TableCell>
                      <Select
                        value={m.status}
                        onValueChange={(v) => updateStatus.mutate({ id: m.id, status: v ?? m.status })}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {m.meeting_url ? (
                        <a
                          className="text-xs text-[var(--brand-primary)] underline"
                          href={m.meeting_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Join
                        </a>
                      ) : m.google_event_link ? (
                        <a
                          className="text-xs text-[var(--brand-primary)] underline"
                          href={m.google_event_link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Calendar
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.google_event_link && (
                        <a
                          className="text-xs text-muted-foreground underline"
                          href={m.google_event_link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          open event
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule meeting</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(form);
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-muted-foreground">Date</span>
                <Input
                  type="date"
                  required
                  onChange={(e) => {
                    const d = e.target.value;
                    const t = form.scheduled_at ? new Date(form.scheduled_at) : new Date();
                    const [y, m, day] = d.split("-").map(Number);
                    t.setUTCFullYear(y, m - 1, day);
                    setForm({ ...form, scheduled_at: t.toISOString() });
                  }}
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-muted-foreground">Time (UTC)</span>
                <Input
                  type="time"
                  required
                  onChange={(e) => {
                    const [h, min] = e.target.value.split(":").map(Number);
                    const t = form.scheduled_at ? new Date(form.scheduled_at) : new Date();
                    t.setUTCHours(h, min, 0, 0);
                    setForm({ ...form, scheduled_at: t.toISOString() });
                  }}
                />
              </label>
            </div>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-muted-foreground">Type</span>
              <Select
                value={form.meeting_type}
                onValueChange={(v) => setForm({ ...form, meeting_type: v ?? "product_demo" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-muted-foreground">Duration (min)</span>
              <Input
                type="number"
                min={15}
                max={180}
                value={form.duration_minutes ?? 30}
                onChange={(e) =>
                  setForm({ ...form, duration_minutes: Number(e.target.value) || 30 })
                }
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-muted-foreground">Attendee email</span>
                <Input
                  type="email"
                  value={form.attendee_email ?? ""}
                  onChange={(e) => setForm({ ...form, attendee_email: e.target.value })}
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-muted-foreground">Attendee name</span>
                <Input
                  value={form.attendee_name ?? ""}
                  onChange={(e) => setForm({ ...form, attendee_name: e.target.value })}
                />
              </label>
            </div>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-muted-foreground">Agenda</span>
              <Textarea
                rows={3}
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Scheduling…" : "Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
