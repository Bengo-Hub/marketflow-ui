"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FeatureGate } from "@bengo-hub/shared-ui-lib/subscription";
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
import { BarChart3, Users, CheckCircle, Activity, TrendingUp } from "lucide-react";

type Step = {
  delay_hours: number;
  channel: "email" | "whatsapp" | "sms";
  template?: string;
  subject?: string;
  body?: string;
};

type Sequence = {
  id: string;
  name: string;
  trigger_event: string;
  lead_type_filter?: string | null;
  active: boolean;
  steps: Step[];
  total_enrolled: number;
  total_completed: number;
  updated_at: string;
};

type SequenceAnalytics = {
  total_enrolled: number;
  total_completed: number;
  active_enrollments: number;
  completion_rate: number;
  enrollments_by_status?: Record<string, number>;
};

type Enrollment = {
  id: string;
  lead_id: string;
  lead_name?: string;
  status: string;
  current_step: number;
  enrolled_at: string;
};

const TRIGGERS = [
  { value: "lead.created", label: "New lead" },
  { value: "lead.qualified", label: "Lead qualified" },
  { value: "contact.dormant", label: "Dormant contact (re-engagement)" },
  { value: "order.placed", label: "Order placed (reorder)" },
];

function useSequenceAnalytics(sequenceId: string | null) {
  return useQuery<SequenceAnalytics | null>({
    queryKey: ["sequence-analytics", sequenceId],
    queryFn: async () => {
      if (!sequenceId) return null;
      try {
        const r = await apiClient.get<{ data: SequenceAnalytics }>(
          `/api/v1/sequences/${sequenceId}/analytics`,
        );
        return r.data.data ?? r.data;
      } catch {
        // Endpoint not available yet — return null so we fall back to inline fields
        return null;
      }
    },
    enabled: !!sequenceId,
  });
}

/** Compute analytics from the sequence's own fields if the analytics endpoint is not available */
function getInlineAnalytics(s: Sequence): SequenceAnalytics {
  const active = Math.max(0, s.total_enrolled - s.total_completed);
  const rate = s.total_enrolled > 0 ? (s.total_completed / s.total_enrolled) * 100 : 0;
  return {
    total_enrolled: s.total_enrolled,
    total_completed: s.total_completed,
    active_enrollments: active,
    completion_rate: Math.round(rate * 10) / 10,
  };
}

export default function SequencesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sequence | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [detailsName, setDetailsName] = useState<string>("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["sequences"],
    queryFn: async () => {
      const r = await apiClient.get<{ data: Sequence[] }>(`/api/v1/sequences?limit=100`);
      return r.data;
    },
  });

  const { data: detailAnalytics } = useSequenceAnalytics(detailsId);

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ["sequence-enrollments", detailsId],
    queryFn: async () => {
      if (!detailsId) return null;
      try {
        const r = await apiClient.get<{ data: Enrollment[] }>(
          `/api/v1/sequences/${detailsId}/enrollments?limit=50`,
        );
        return r.data.data ?? [];
      } catch {
        return [];
      }
    },
    enabled: !!detailsId,
  });

  const save = useMutation({
    mutationFn: async (s: Partial<Sequence>) => {
      if (editing?.id) {
        return apiClient.put(`/api/v1/sequences/${editing.id}`, s);
      }
      return apiClient.post(`/api/v1/sequences`, s);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sequences"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const toggle = useMutation({
    mutationFn: async (s: Sequence) =>
      apiClient.put(`/api/v1/sequences/${s.id}`, { active: !s.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });

  function newSeq() {
    setEditing({
      id: "",
      name: "",
      trigger_event: "lead.created",
      active: true,
      steps: [{ delay_hours: 0, channel: "email", subject: "", body: "" }],
      total_enrolled: 0,
      total_completed: 0,
      updated_at: "",
    });
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nurture sequences</h1>
          <p className="text-sm text-muted-foreground">
            Automated follow-up flows. Active sequences run for every matching lead.
          </p>
        </div>
        <FeatureGate feature="email_sequences">
          <Button onClick={newSeq}>+ New sequence</Button>
        </FeatureGate>
      </div>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Failed to load sequences: {(error as Error).message}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Analytics</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-48"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No sequences yet. Create one to start automating follow-up.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((s) => {
                  const analytics = getInlineAnalytics(s);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.trigger_event}</Badge>
                      </TableCell>
                      <TableCell>{s.steps?.length ?? 0}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-xs gap-1">
                            <Users className="h-3 w-3" />
                            {analytics.total_enrolled}
                          </Badge>
                          <Badge variant="outline" className="text-xs gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {analytics.total_completed}
                          </Badge>
                          <Badge variant="outline" className="text-xs gap-1">
                            <Activity className="h-3 w-3" />
                            {analytics.active_enrollments}
                          </Badge>
                          <Badge variant="outline" className="text-xs gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {analytics.completion_rate}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            s.active ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {s.active ? "active" : "paused"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDetailsId(s.id);
                              setDetailsName(s.name);
                            }}
                          >
                            <BarChart3 className="mr-1 h-3 w-3" />
                            Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditing(s);
                              setOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggle.mutate(s)}
                          >
                            {s.active ? "Pause" : "Resume"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sequence Detail / Enrollments Dialog */}
      <Dialog open={!!detailsId} onOpenChange={(o) => { if (!o) setDetailsId(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sequence Details: {detailsName}</DialogTitle>
          </DialogHeader>

          {/* Analytics Summary */}
          {detailsId && (() => {
            const seq = data?.data?.find((s) => s.id === detailsId);
            const a = detailAnalytics ?? (seq ? getInlineAnalytics(seq) : null);
            if (!a) return <Skeleton className="h-20" />;
            return (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatBadge icon={<Users className="h-4 w-4" />} label="Enrolled" value={a.total_enrolled} />
                <StatBadge icon={<CheckCircle className="h-4 w-4" />} label="Completed" value={a.total_completed} />
                <StatBadge icon={<Activity className="h-4 w-4" />} label="Active" value={a.active_enrollments} />
                <StatBadge icon={<TrendingUp className="h-4 w-4" />} label="Rate" value={`${a.completion_rate}%`} />
              </div>
            );
          })()}

          {/* Enrollments by Status */}
          {detailAnalytics?.enrollments_by_status && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Enrollments by Status</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(detailAnalytics.enrollments_by_status).map(([status, count]) => (
                  <Badge key={status} variant="outline" className="text-xs">
                    {status}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Enrollment List */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Recent Enrollments</h3>
            {enrollmentsLoading ? (
              <Skeleton className="h-24" />
            ) : (enrollments ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No enrollments found for this sequence.
              </p>
            ) : (
              <div className="max-h-60 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Step</TableHead>
                      <TableHead>Enrolled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(enrollments ?? []).map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{e.lead_name || e.lead_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{e.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{e.current_step}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(e.enrolled_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Sequence Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit sequence" : "New sequence"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate({
                  name: editing.name,
                  trigger_event: editing.trigger_event,
                  lead_type_filter: editing.lead_type_filter || null,
                  steps: editing.steps,
                  active: editing.active,
                });
              }}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Trigger">
                  <Select
                    value={editing.trigger_event}
                    onValueChange={(v) => setEditing({ ...editing, trigger_event: v ?? "lead.created" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGERS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Steps</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        steps: [
                          ...editing.steps,
                          { delay_hours: 24, channel: "email", subject: "", body: "" },
                        ],
                      })
                    }
                  >
                    + Add step
                  </Button>
                </div>
                {editing.steps.map((step, i) => (
                  <div key={i} className="space-y-2 rounded border bg-muted/30 p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">#{i + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-red-600"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            steps: editing.steps.filter((_, j) => j !== i),
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Field label="Delay hours">
                        <Input
                          type="number"
                          min={0}
                          value={step.delay_hours}
                          onChange={(e) => {
                            const steps = [...editing.steps];
                            steps[i] = { ...step, delay_hours: Number(e.target.value) };
                            setEditing({ ...editing, steps });
                          }}
                        />
                      </Field>
                      <Field label="Channel">
                        <Select
                          value={step.channel}
                          onValueChange={(v) => {
                            const steps = [...editing.steps];
                            steps[i] = { ...step, channel: (v as Step["channel"]) ?? "email" };
                            setEditing({ ...editing, steps });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Template ID (optional)">
                        <Input
                          value={step.template ?? ""}
                          onChange={(e) => {
                            const steps = [...editing.steps];
                            steps[i] = { ...step, template: e.target.value };
                            setEditing({ ...editing, steps });
                          }}
                        />
                      </Field>
                    </div>
                    {step.channel === "email" && (
                      <Field label="Subject">
                        <Input
                          value={step.subject ?? ""}
                          onChange={(e) => {
                            const steps = [...editing.steps];
                            steps[i] = { ...step, subject: e.target.value };
                            setEditing({ ...editing, steps });
                          }}
                        />
                      </Field>
                    )}
                    <Field label="Body">
                      <Textarea
                        rows={3}
                        value={step.body ?? ""}
                        onChange={(e) => {
                          const steps = [...editing.steps];
                          steps[i] = { ...step, body: e.target.value };
                          setEditing({ ...editing, steps });
                        }}
                      />
                    </Field>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? "Saving..." : editing.id ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function StatBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
