"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  apiError,
  marketingOsApi,
  type MemberOverride,
  type ModelClass,
  type TeamMember,
} from "@/lib/api/marketing-os";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil } from "lucide-react";

export const CLASS_LABEL: Record<ModelClass, string> = {
  nano: "Quick",
  standard: "Standard",
  premium: "Premium writing",
  premium_plus: "Senior strategy",
};

// Server limit (marketflow-api marketingos.UpsertTeamMember).
const MAX_INSTRUCTIONS = 600;

/** The team: the manager first, then each specialist with on/off and edits. */
export function TeamRoster({ orgSlug, members }: { orgSlug: string; members: TeamMember[] }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<MemberOverride>({ key: "" });

  const overridesQ = useQuery({ queryKey: ["os-overrides", orgSlug], queryFn: marketingOsApi.overrides });
  const overrideFor = (key: string) => overridesQ.data?.find((o) => o.key === key);

  const save = useMutation({
    mutationFn: (o: MemberOverride) => marketingOsApi.saveMember(o),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["os-overrides", orgSlug] });
      qc.invalidateQueries({ queryKey: ["os-team", orgSlug] });
      setEditing(null);
      toast.success("Team member saved");
    },
    onError: (e) => toast.error(apiError(e, "Could not save the team member")),
  });

  // Every save sends the whole override so a toggle never drops a rename.
  const merged = (m: TeamMember, patch: Partial<MemberOverride>): MemberOverride => {
    const cur = overrideFor(m.key);
    return {
      key: m.key,
      name: cur?.name ?? "",
      model_class: cur?.model_class ?? "",
      instructions: cur?.instructions ?? "",
      disabled: !m.enabled,
      ...patch,
    };
  };

  const openEdit = (m: TeamMember) => {
    setEditing(m);
    setForm(merged(m, { name: m.name }));
  };

  const ordered = [...members].sort((a, b) => Number(b.key === "manager") - Number(a.key === "manager"));

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ordered.map((m) => {
          const isManager = m.key === "manager";
          return (
            <Card key={m.key} className={isManager ? "sm:col-span-2 xl:col-span-3" : undefined}>
              <CardContent className="space-y-2 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{m.name}</p>
                    <p className="text-sm text-muted-foreground">{m.role}</p>
                  </div>
                  {!isManager && (
                    <Switch
                      checked={m.enabled}
                      disabled={save.isPending}
                      aria-label={`${m.name} ${m.enabled ? "on" : "off"}`}
                      onCheckedChange={(on) => save.mutate(merged(m, { disabled: !on }))}
                    />
                  )}
                </div>
                <p className="text-sm">{m.description}</p>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-xs">
                    {CLASS_LABEL[m.model_class] ?? m.model_class}
                  </Badge>
                  <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => openEdit(m)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {editing?.role}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium">Name</span>
              <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium">Writing level</span>
              <Select
                value={form.model_class || "default"}
                onValueChange={(v) => setForm({ ...form, model_class: v === "default" ? "" : (v as ModelClass) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    Default ({editing ? CLASS_LABEL[editing.model_class] ?? editing.model_class : ""})
                  </SelectItem>
                  {(Object.keys(CLASS_LABEL) as ModelClass[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CLASS_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                Higher levels write better and cost more per request. Prices in a quote always show before you
                approve.
              </span>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium">Extra instructions</span>
              <Textarea
                rows={4}
                value={form.instructions ?? ""}
                placeholder="Always mention free delivery within Kisumu town."
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              />
              <span
                className={
                  (form.instructions?.length ?? 0) > MAX_INSTRUCTIONS
                    ? "text-xs text-destructive"
                    : "text-xs text-muted-foreground"
                }
              >
                {form.instructions?.length ?? 0}/{MAX_INSTRUCTIONS}
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => save.mutate({ ...form, name: form.name?.trim() })}
              disabled={save.isPending || (form.instructions?.length ?? 0) > MAX_INSTRUCTIONS}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
