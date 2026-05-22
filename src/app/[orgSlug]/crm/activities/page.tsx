"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { STALE_TIMES } from "@/app/providers";
import { activitiesApi } from "@/lib/api/activities";
import { Mail, Phone, FileText, Calendar, Plus } from "lucide-react";

const activityIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
};

const directionColors: Record<string, string> = {
  inbound: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  outbound: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

type Activity = {
  id: string;
  type: string;
  entity_type: string;
  entity_id: string;
  subject?: string;
  body?: string;
  direction?: string;
  created_at: string;
};

export default function ActivitiesPage() {
  const queryClient = useQueryClient();
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [showLog, setShowLog] = useState(false);
  const [form, setForm] = useState({ type: "note", entity_type: "lead", entity_id: "", subject: "", body: "" });

  const params: Record<string, string> = {};
  if (entityTypeFilter !== "all") params.entity_type = entityTypeFilter;

  const { data, isLoading } = useQuery({
    queryKey: ["activities", entityTypeFilter],
    queryFn: () => activitiesApi.list(params).then((r) => r.data),
    staleTime: STALE_TIMES.OPERATIONAL,
  });

  const logMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => activitiesApi.log(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setShowLog(false);
      setForm({ type: "note", entity_type: "lead", entity_id: "", subject: "", body: "" });
    },
  });

  const activities: Activity[] = data?.data ?? data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activities</h1>
          <p className="text-muted-foreground">Activity feed across all entities</p>
        </div>
        <Button onClick={() => setShowLog(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Log Activity
        </Button>
      </div>

      <div className="flex items-end gap-3">
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Entity Type</span>
          <Select value={entityTypeFilter} onValueChange={(v) => setEntityTypeFilter(v ?? "all")}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="contact">Contact</SelectItem>
              <SelectItem value="deal">Deal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))
        ) : activities.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No activities yet. Log your first activity to get started.
            </CardContent>
          </Card>
        ) : (
          activities.map((activity: Activity) => (
            <Card key={activity.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-muted p-2 text-muted-foreground">
                    {activityIcons[activity.type] ?? <FileText className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{activity.subject ?? activity.type}</span>
                      <span className="text-xs text-muted-foreground capitalize">{activity.entity_type}</span>
                      {activity.direction && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${directionColors[activity.direction] ?? ""}`}>
                          {activity.direction}
                        </span>
                      )}
                    </div>
                    {activity.body && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{activity.body}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v ?? "note" }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Entity Type</label>
              <Select value={form.entity_type} onValueChange={(v) => setForm((f) => ({ ...f, entity_type: v ?? "lead" }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="deal">Deal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Entity ID</label>
              <Input
                value={form.entity_id}
                onChange={(e) => setForm((f) => ({ ...f, entity_id: e.target.value }))}
                placeholder="ID of the lead/contact/deal"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Subject</label>
              <Input
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Activity subject"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Notes</label>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Activity notes..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLog(false)}>Cancel</Button>
              <Button
                onClick={() => logMutation.mutate({ type: form.type, entity_type: form.entity_type, entity_id: form.entity_id, subject: form.subject, body: form.body })}
                disabled={!form.entity_id || logMutation.isPending}
              >
                Log
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
