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

const TRIGGERS = [
  { value: "lead.created", label: "New lead" },
  { value: "lead.qualified", label: "Lead qualified" },
  { value: "contact.dormant", label: "Dormant contact (re-engagement)" },
  { value: "order.placed", label: "Order placed (reorder)" },
];

export default function SequencesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sequence | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sequences"],
    queryFn: async () => {
      const r = await apiClient.get<{ data: Sequence[] }>(`/api/v1/sequences?limit=100`);
      return r.data;
    },
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
        <Button onClick={newSeq}>+ New sequence</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-40"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No sequences yet. Create one to start automating follow-up.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.trigger_event}</Badge>
                    </TableCell>
                    <TableCell>{s.steps?.length ?? 0}</TableCell>
                    <TableCell>{s.total_enrolled}</TableCell>
                    <TableCell>{s.total_completed}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
              <div className="grid grid-cols-2 gap-3">
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
                    <div className="grid grid-cols-3 gap-2">
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
                  {save.isPending ? "Saving…" : editing.id ? "Update" : "Create"}
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
