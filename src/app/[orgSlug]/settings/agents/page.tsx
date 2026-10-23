"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { customAgentsApi } from "@/lib/api/custom-agents";
import { apiError } from "@/lib/api/marketing-os";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Pencil, Play, ChevronDown, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Tools a custom agent may use (marketflow-ai agent registry). Campaign
// creation and anything that spends money stays with the owner, never a
// background agent. No tools ticked means the read-only knowledge tools.
const TOOL_GROUPS: { label: string; tools: { key: string; label: string }[] }[] = [
  {
    label: "Read",
    tools: [
      { key: "kb_search", label: "Search the knowledge base" },
      { key: "get_product", label: "Look up a product" },
      { key: "get_faq", label: "Read FAQs" },
      { key: "get_compliance_rules", label: "Read compliance rules" },
      { key: "get_contact_360", label: "Read a contact's history" },
      { key: "web_search", label: "Search the web" },
    ],
  },
  {
    label: "Act in the CRM",
    tools: [
      { key: "score_lead", label: "Score a lead" },
      { key: "analyze_deal", label: "Analyse a deal" },
      { key: "create_activity", label: "Log an activity" },
      { key: "create_task", label: "Create a task" },
      { key: "draft_email", label: "Draft an email (not sent)" },
      { key: "move_pipeline_stage", label: "Move a deal stage" },
    ],
  },
];
const TOOL_LABEL = new Map(TOOL_GROUPS.flatMap((g) => g.tools.map((t) => [t.key, t.label] as const)));

interface Agent {
  id: string;
  name: string;
  description?: string;
  trigger_type: string;
  trigger_config?: Record<string, unknown>;
  system_prompt?: string;
  allowed_tools?: string[];
  max_iterations: number;
  is_active: boolean;
  run_count?: number;
  last_run_at?: string;
  created_at: string;
}

interface AgentRun {
  id: string;
  status: string;
  triggered_by?: string;
  trace?: { answer?: string };
  total_tokens?: number;
  tool_calls_n?: number;
  started_at: string;
  finished_at?: string;
  error_message?: string;
}

type TriggerKind = "manual" | "event" | "schedule";

// Events marketflow-api emits today (custom_agents.Events).
const EVENTS: { value: string; label: string }[] = [
  { value: "lead.created", label: "A new lead arrives" },
  { value: "crm.lead.qualified", label: "A lead becomes qualified" },
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Server limits for automatic runs (custom_agents.AutoDailyCap, marketflow-ai agentRunCredits).
const AUTO_DAILY_CAP = 50;

interface AgentForm {
  name: string;
  description: string;
  system_prompt: string;
  allowed_tools: string[];
  max_iterations: number;
  is_active: boolean;
  trigger: TriggerKind;
  event: string;
  frequency: "daily" | "weekly";
  time: string;
  weekday: number;
}

const emptyForm: AgentForm = {
  name: "",
  description: "",
  system_prompt: "",
  allowed_tools: [],
  max_iterations: 5,
  is_active: true,
  trigger: "manual",
  event: "lead.created",
  frequency: "daily",
  time: "08:00",
  weekday: 1,
};

/** Plain description of when an agent runs; older trigger values count as manual. */
function whenItRuns(a: Pick<Agent, "trigger_type" | "trigger_config">): string {
  const cfg = a.trigger_config ?? {};
  if (a.trigger_type === "event") {
    const ev = EVENTS.find((e) => e.value === cfg.event);
    return ev ? `Runs when ${ev.label.toLowerCase()}.` : "Runs on an event.";
  }
  if (a.trigger_type === "schedule") {
    const at = typeof cfg.time === "string" ? cfg.time : "";
    return cfg.frequency === "weekly"
      ? `Runs every ${WEEKDAYS[Number(cfg.weekday)] ?? "week"} at ${at}.`
      : `Runs every day at ${at}.`;
  }
  return "Runs when you press Run now.";
}

function startedBy(triggeredBy?: string): string {
  if (!triggeredBy || triggeredBy === "manual") return "Run now";
  if (triggeredBy === "schedule") return "Schedule";
  const ev = EVENTS.find((e) => `event:${e.value}` === triggeredBy);
  return ev ? ev.label : "Event";
}

function AgentCard({ agent, onEdit, onDelete, orgSlug }: {
  agent: Agent;
  onEdit: (a: Agent) => void;
  onDelete: (a: Agent) => void;
  orgSlug: string;
}) {
  const [showRuns, setShowRuns] = useState(false);

  const runsQ = useQuery({
    queryKey: ["agent-runs", agent.id, orgSlug],
    queryFn: () => customAgentsApi.listRuns(agent.id),
    enabled: showRuns,
    // Poll while a run is still pending or running.
    refetchInterval: (q) => {
      const rows = (q.state.data as { data?: { data?: AgentRun[] } })?.data?.data ?? [];
      return rows.some((r) => r.status === "pending" || r.status === "running") ? 4000 : false;
    },
  });

  const triggerMut = useMutation({
    mutationFn: () => customAgentsApi.triggerRun(agent.id),
    onSuccess: () => {
      toast.success(`${agent.name} started`);
      setShowRuns(true);
      runsQ.refetch();
    },
    onError: (e) => toast.error(apiError(e, "Could not start the agent")),
  });

  const runs: AgentRun[] = (runsQ.data as { data?: { data?: AgentRun[] } })?.data?.data ?? [];
  const tools = agent.allowed_tools ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{agent.name}</CardTitle>
            {agent.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{agent.description}</p>
            )}
          </div>
          {agent.is_active
            ? <Badge className="text-xs">On</Badge>
            : <Badge variant="secondary" className="text-xs">Off</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {agent.system_prompt && (
          <p className="text-sm bg-muted rounded-lg p-3 whitespace-pre-wrap line-clamp-3">{agent.system_prompt}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {whenItRuns(agent)}{" "}
          {tools.length === 0
            ? "Uses the knowledge base only."
            : `Can: ${tools.map((t) => TOOL_LABEL.get(t) ?? t).join(", ")}.`}
          {agent.last_run_at
            ? ` Last run ${formatDistanceToNow(new Date(agent.last_run_at), { addSuffix: true })}.`
            : " Never run."}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(agent)} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => triggerMut.mutate()}
              disabled={triggerMut.isPending}
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              {triggerMut.isPending ? "Starting…" : "Run now"}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowRuns((v) => !v)}
              aria-expanded={showRuns}
              className="gap-1.5 text-xs text-muted-foreground"
            >
              {showRuns ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Runs
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(agent)} aria-label={`Delete ${agent.name}`}>
              <Trash2 className="h-4 w-4 text-rose-500" />
            </Button>
          </div>
        </div>

        {showRuns && (
          <div className="space-y-2 pt-1">
            {runsQ.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading runs…</p>
            ) : runs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No runs yet. Press Run now to try it.</p>
            ) : runs.map((run) => (
              <div key={run.id} className="rounded-lg border px-3 py-2 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge
                    variant={run.status === "completed" ? "default" : run.status === "failed" ? "destructive" : "secondary"}
                    className="text-xs capitalize"
                  >
                    {run.status}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {startedBy(run.triggered_by)}, {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                  </span>
                </div>
                {run.trace?.answer && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{run.trace.answer}</p>
                )}
                {run.error_message && <p className="text-xs text-rose-500">{run.error_message}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AgentsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [form, setForm] = useState<AgentForm>(emptyForm);

  const { data, isLoading, error } = useQuery({
    queryKey: ["custom-agents", orgSlug],
    queryFn: () => customAgentsApi.list(),
  });

  const agents: Agent[] = (data as { data?: { data?: Agent[] } })?.data?.data ?? [];

  const done = (msg: string) => () => {
    qc.invalidateQueries({ queryKey: ["custom-agents"] });
    setOpen(false);
    toast.success(msg);
  };

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => customAgentsApi.create(payload),
    onSuccess: async (res) => {
      // The API creates agents switched off; apply the form's switch.
      const id = (res as { data?: { id?: string } })?.data?.id;
      if (id && form.is_active) await customAgentsApi.update(id, { is_active: true });
      done("Agent created")();
    },
    onError: (e) => toast.error(apiError(e, "Could not create the agent")),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      customAgentsApi.update(id, payload),
    onSuccess: done("Agent saved"),
    onError: (e) => toast.error(apiError(e, "Could not save the agent")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => customAgentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-agents"] });
      toast.success("Agent deleted");
    },
    onError: (e) => toast.error(apiError(e, "Could not delete the agent")),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(a: Agent) {
    const cfg = a.trigger_config ?? {};
    setEditing(a);
    setForm({
      ...emptyForm,
      name: a.name,
      description: a.description ?? "",
      system_prompt: a.system_prompt ?? "",
      allowed_tools: a.allowed_tools ?? [],
      max_iterations: a.max_iterations || 5,
      is_active: a.is_active,
      // Older trigger values ("on_lead_created", "scheduled") never ran; show them as manual.
      trigger: a.trigger_type === "event" || a.trigger_type === "schedule" ? a.trigger_type : "manual",
      event: typeof cfg.event === "string" ? cfg.event : emptyForm.event,
      frequency: cfg.frequency === "weekly" ? "weekly" : "daily",
      time: typeof cfg.time === "string" ? cfg.time : emptyForm.time,
      weekday: typeof cfg.weekday === "number" ? cfg.weekday : emptyForm.weekday,
    });
    setOpen(true);
  }

  function triggerFields(): Record<string, unknown> {
    if (form.trigger === "event") return { trigger_type: "event", trigger_config: { event: form.event } };
    if (form.trigger === "schedule") {
      const cfg: Record<string, unknown> = { frequency: form.frequency, time: form.time };
      if (form.frequency === "weekly") cfg.weekday = form.weekday;
      return { trigger_type: "schedule", trigger_config: cfg };
    }
    return { trigger_type: "manual", trigger_config: {} };
  }

  function toggleTool(key: string, on: boolean) {
    setForm((f) => ({
      ...f,
      allowed_tools: on ? [...f.allowed_tools, key] : f.allowed_tools.filter((t) => t !== key),
    }));
  }

  function handleSubmit() {
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim(),
      system_prompt: form.system_prompt.trim(),
      allowed_tools: form.allowed_tools,
      max_iterations: Math.min(20, Math.max(1, form.max_iterations)),
      ...triggerFields(),
    };
    if (editing) {
      updateMut.mutate({ id: editing.id, payload: { ...payload, is_active: form.is_active } });
    } else {
      createMut.mutate(payload);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Custom agents</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Small helpers that run on demand, when a lead arrives or on a schedule, for example a weekly lead review.
            For campaigns, ads and content, ask your{" "}
            <Link href={`/${orgSlug}/team`} className="underline underline-offset-2">marketing team</Link>.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> New agent
        </Button>
      </div>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {apiError(error, "Could not load agents")}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">Loading…</div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <p>No agents yet. Create one and press Run now to try it.</p>
          <Button onClick={openCreate} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Create agent
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              onEdit={openEdit}
              onDelete={(ag) => {
                if (window.confirm(`Delete ${ag.name}? This cannot be undone.`)) deleteMut.mutate(ag.id);
              }}
              orgSlug={orgSlug}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit agent" : "Create agent"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium">Name</span>
              <Input
                placeholder="Weekly lead review"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium">Description (optional)</span>
              <Input
                placeholder="What this agent is for"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium">Instructions</span>
              <Textarea
                placeholder="Look at leads from the last 7 days that nobody has contacted. Score each one and create a follow-up task for the top five."
                value={form.system_prompt}
                onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                rows={5}
              />
            </label>
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium">What it may do</legend>
              {TOOL_GROUPS.map((g) => (
                <div key={g.label} className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">{g.label}</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {g.tools.map((t) => (
                      <label key={t.key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.allowed_tools.includes(t.key)}
                          onCheckedChange={(v) => toggleTool(t.key, !!v)}
                        />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Nothing ticked means it can only read your knowledge base.</p>
            </fieldset>
            <div className="flex items-end justify-between gap-4">
              <label className="block space-y-1">
                <span className="text-xs font-medium">Most steps per run</span>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  className="w-24"
                  value={form.max_iterations}
                  onChange={(e) => setForm({ ...form, max_iterations: Number(e.target.value) || 1 })}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                On
              </label>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium">When it runs</legend>
              <Select value={form.trigger} onValueChange={(v) => setForm({ ...form, trigger: (v ?? "manual") as TriggerKind })}>
                <SelectTrigger aria-label="When it runs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Only when I press Run now</SelectItem>
                  <SelectItem value="event">When something happens</SelectItem>
                  <SelectItem value="schedule">On a schedule</SelectItem>
                </SelectContent>
              </Select>

              {form.trigger === "event" && (
                <Select value={form.event} onValueChange={(v) => setForm({ ...form, event: v ?? EVENTS[0].value })}>
                  <SelectTrigger aria-label="Event"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENTS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              {form.trigger === "schedule" && (
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={form.frequency}
                    onValueChange={(v) => setForm({ ...form, frequency: v === "weekly" ? "weekly" : "daily" })}
                  >
                    <SelectTrigger className="w-32" aria-label="How often"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Every day</SelectItem>
                      <SelectItem value="weekly">Every week</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.frequency === "weekly" && (
                    <Select value={String(form.weekday)} onValueChange={(v) => setForm({ ...form, weekday: Number(v) })}>
                      <SelectTrigger className="w-36" aria-label="Day"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WEEKDAYS.map((d, i) => <SelectItem key={d} value={String(i)}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <span className="text-sm text-muted-foreground">at</span>
                  <Input
                    type="time"
                    className="w-28"
                    aria-label="Time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                  />
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {form.trigger === "manual"
                  ? "Run now is free."
                  : `Each automatic run uses 1 AI credit, at most ${AUTO_DAILY_CAP} a day per agent. It only runs while the agent is on. Times are in your business's time zone.`}
              </p>
            </fieldset>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name.trim() || !form.system_prompt.trim() || createMut.isPending || updateMut.isPending}
            >
              {editing ? "Save agent" : "Create agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
