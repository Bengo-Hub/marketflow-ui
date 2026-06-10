"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customAgentsApi } from "@/lib/api/custom-agents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Pencil, Play, ChevronDown, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const TRIGGER_TYPES = ["manual", "on_lead_created", "on_deal_stage_change", "on_contact_created", "scheduled"];

interface Agent {
  id: string;
  name: string;
  description?: string;
  trigger_type: string;
  prompt: string;
  is_active: boolean;
  created_at: string;
}

interface AgentRun {
  id: string;
  status: string;
  output?: string;
  error?: string;
  created_at: string;
  completed_at?: string;
}

interface AgentForm {
  name: string;
  description: string;
  trigger_type: string;
  prompt: string;
}

const emptyForm: AgentForm = {
  name: "",
  description: "",
  trigger_type: "manual",
  prompt: "",
};

function AgentCard({ agent, onEdit, onDelete, orgSlug }: {
  agent: Agent;
  onEdit: (a: Agent) => void;
  onDelete: (id: string) => void;
  orgSlug: string;
}) {
  const qc = useQueryClient();
  const [showRuns, setShowRuns] = useState(false);

  const { data: runsData, refetch: fetchRuns } = useQuery({
    queryKey: ["agent-runs", agent.id, orgSlug],
    queryFn: () => customAgentsApi.listRuns(agent.id),
    enabled: false,
  });

  const triggerMut = useMutation({
    mutationFn: () => customAgentsApi.triggerRun(agent.id),
    onSuccess: () => {
      fetchRuns();
      qc.invalidateQueries({ queryKey: ["agent-runs", agent.id] });
    },
  });

  const runs: AgentRun[] = (runsData as { data?: { items?: AgentRun[] } })?.data?.items ?? [];

  function toggleRuns() {
    if (!showRuns) fetchRuns();
    setShowRuns((v) => !v);
  }

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
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className="capitalize text-xs">{agent.trigger_type}</Badge>
            {agent.is_active
              ? <Badge className="text-xs">Active</Badge>
              : <Badge variant="secondary" className="text-xs">Inactive</Badge>
            }
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre-wrap line-clamp-3">
          {agent.prompt}
        </pre>

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
              {triggerMut.isPending ? "Running…" : "Run now"}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={toggleRuns} className="gap-1.5 text-xs text-muted-foreground">
              {showRuns ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Runs
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(agent.id)} aria-label="Delete agent">
              <Trash2 className="h-4 w-4 text-rose-500" />
            </Button>
          </div>
        </div>

        {showRuns && (
          <div className="space-y-2 pt-1">
            {runs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No runs yet.</p>
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
                    {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                  </span>
                </div>
                {run.output && (
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-2">{run.output}</pre>
                )}
                {run.error && (
                  <p className="text-xs text-rose-500">{run.error}</p>
                )}
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

  const agents: Agent[] = (data as { data?: { items?: Agent[] } })?.data?.items ?? [];

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => customAgentsApi.create(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["custom-agents"] }); setOpen(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      customAgentsApi.update(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["custom-agents"] }); setOpen(false); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => customAgentsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-agents"] }),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(a: Agent) {
    setEditing(a);
    setForm({ name: a.name, description: a.description ?? "", trigger_type: a.trigger_type, prompt: a.prompt });
    setOpen(true);
  }

  function handleSubmit() {
    const payload: Record<string, unknown> = { ...form };
    if (editing) {
      updateMut.mutate({ id: editing.id, payload });
    } else {
      createMut.mutate(payload);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Agents</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Build AI automation agents that run on triggers or on demand.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> New Agent
        </Button>
      </div>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Failed to load agents: {(error as Error).message}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">Loading…</div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <p>No agents yet. Create your first automation agent.</p>
          <Button onClick={openCreate} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Create Agent
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              onEdit={openEdit}
              onDelete={(id) => deleteMut.mutate(id)}
              orgSlug={orgSlug}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Agent" : "Create Agent"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Name</label>
              <Input
                placeholder="e.g. Lead Follow-up Reminder"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Description (optional)</label>
              <Input
                placeholder="What does this agent do?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Trigger</label>
              <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v ?? "manual" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">System prompt</label>
              <Textarea
                placeholder="You are a CRM automation agent. When triggered, analyze the lead data and..."
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name || !form.prompt || createMut.isPending || updateMut.isPending}
            >
              {editing ? "Save Changes" : "Create Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
