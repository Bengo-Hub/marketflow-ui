"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { activitiesApi } from "@/lib/api/activities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STALE_TIMES } from "@/app/providers";
import { ArrowLeft, Mail, Phone, FileText, Calendar, Plus } from "lucide-react";

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  qualified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  converted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const sourceColors: Record<string, string> = {
  manual: "bg-gray-100 text-gray-800",
  funnel: "bg-indigo-100 text-indigo-800",
  meta: "bg-blue-100 text-blue-800",
  google: "bg-red-100 text-red-700",
  tiktok: "bg-pink-100 text-pink-800",
  widget: "bg-emerald-100 text-emerald-800",
  public: "bg-amber-100 text-amber-800",
};

const activityIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
};

type TimelineItem = {
  id: string;
  type: string;
  subject?: string;
  body?: string;
  direction?: string;
  created_at: string;
};

export default function LeadDetailPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const id = params?.id as string;
  const queryClient = useQueryClient();
  const [showLog, setShowLog] = useState(false);
  const [form, setForm] = useState({ type: "note", subject: "", body: "" });

  const { data: leadData, isLoading: leadLoading, error: leadError } = useQuery({
    queryKey: ["leads", id],
    queryFn: () => apiClient.get(`/api/v1/leads/${id}`).then((r) => r.data),
    staleTime: STALE_TIMES.OPERATIONAL,
    enabled: !!id,
  });

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ["leads", id, "timeline"],
    queryFn: () => activitiesApi.leadTimeline(id).then((r) => r.data),
    staleTime: STALE_TIMES.OPERATIONAL,
    enabled: !!id,
  });

  const logMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => activitiesApi.log(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", id, "timeline"] });
      setShowLog(false);
      setForm({ type: "note", subject: "", body: "" });
    },
  });

  const lead = leadData?.data ?? leadData;
  const timeline: TimelineItem[] = timelineData?.data ?? timelineData ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => window.location.href = `/${orgSlug}/leads`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Leads
        </Button>
      </div>

      {leadError ? (
        <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Failed to load lead: {(leadError as Error).message}
        </div>
      ) : leadLoading ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-40" />
          </CardContent>
        </Card>
      ) : lead ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold">
                  {lead.first_name || lead.last_name
                    ? `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim()
                    : "Unnamed Lead"}
                </h1>
                <p className="text-muted-foreground text-sm mt-0.5">{lead.email ?? "--"}</p>
              </div>
              <div className="flex gap-2">
                {lead.source && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sourceColors[lead.source] ?? "bg-gray-100 text-gray-800"}`}>
                    {lead.source}
                  </span>
                )}
                {lead.status && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[lead.status] ?? ""}`}>
                    {lead.status}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Phone</span>
                <p className="font-medium mt-0.5">{lead.phone ?? "--"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Score</span>
                <p className="font-medium mt-0.5">{lead.score ?? "--"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Lead Type</span>
                <p className="font-medium mt-0.5">{lead.lead_type ?? "--"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created</span>
                <p className="font-medium mt-0.5">
                  {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "--"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Activity Timeline</h2>
        <Button size="sm" onClick={() => setShowLog(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Log Activity
        </Button>
      </div>

      <div className="space-y-3">
        {timelineLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))
        ) : timeline.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No activities logged yet.
            </CardContent>
          </Card>
        ) : (
          timeline.map((item: TimelineItem) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-muted p-2 text-muted-foreground">
                    {activityIcons[item.type] ?? <FileText className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.subject ?? item.type}</span>
                      {item.direction && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                          {item.direction}
                        </span>
                      )}
                    </div>
                    {item.body && (
                      <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
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
                placeholder="Notes..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLog(false)}>Cancel</Button>
              <Button
                onClick={() => logMutation.mutate({ type: form.type, entity_type: "lead", entity_id: id, subject: form.subject, body: form.body })}
                disabled={logMutation.isPending}
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
