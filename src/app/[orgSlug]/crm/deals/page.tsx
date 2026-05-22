"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STALE_TIMES } from "@/app/providers";
import { dealsApi } from "@/lib/api/deals";
import { pipelinesApi } from "@/lib/api/pipelines";
import { Trophy, X } from "lucide-react";

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  won: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

type Deal = {
  id: string;
  title: string;
  contact_name?: string;
  value?: number;
  stage_name?: string;
  probability?: number;
  close_date?: string;
  status: string;
  pipeline_id?: string;
};

type Pipeline = {
  id: string;
  name: string;
};

export default function DealsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [pipelineFilter, setPipelineFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [lostDialog, setLostDialog] = useState<{ id: string } | null>(null);
  const [lostReason, setLostReason] = useState("");

  const [form, setForm] = useState({ title: "", value: "", pipeline_id: "" });

  const params: Record<string, string> = {};
  if (statusFilter !== "all") params.status = statusFilter;
  if (pipelineFilter !== "all") params.pipeline_id = pipelineFilter;

  const { data, isLoading } = useQuery({
    queryKey: ["deals", statusFilter, pipelineFilter],
    queryFn: () => dealsApi.list(params).then((r) => r.data),
    staleTime: STALE_TIMES.OPERATIONAL,
  });

  const { data: pipelinesData } = useQuery({
    queryKey: ["pipelines"],
    queryFn: () => pipelinesApi.list().then((r) => r.data),
    staleTime: STALE_TIMES.STATIC,
  });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => dealsApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setShowCreate(false);
      setForm({ title: "", value: "", pipeline_id: "" });
    },
  });

  const wonMutation = useMutation({
    mutationFn: (id: string) => dealsApi.markWon(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deals"] }),
  });

  const lostMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => dealsApi.markLost(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setLostDialog(null);
      setLostReason("");
    },
  });

  const pipelines: Pipeline[] = pipelinesData?.data ?? pipelinesData ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deals</h1>
          <p className="text-muted-foreground">{data?.total ?? 0} total deals</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>New Deal</Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Status</span>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Pipeline</span>
          <Select value={pipelineFilter} onValueChange={(v) => setPipelineFilter(v ?? "all")}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All pipelines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pipelines</SelectItem>
              {pipelines.map((p: Pipeline) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Probability</TableHead>
                <TableHead>Close Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (data?.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No deals yet. Create your first deal to get started.
                  </TableCell>
                </TableRow>
              ) : (
                (data?.data ?? []).map((deal: Deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-medium">{deal.title}</TableCell>
                    <TableCell>{deal.contact_name ?? "--"}</TableCell>
                    <TableCell>{deal.value != null ? `$${deal.value.toLocaleString()}` : "--"}</TableCell>
                    <TableCell>{deal.stage_name ?? "--"}</TableCell>
                    <TableCell>{deal.probability != null ? `${deal.probability}%` : "--"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {deal.close_date ? new Date(deal.close_date).toLocaleDateString() : "--"}
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[deal.status] ?? ""}`}>
                        {deal.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {deal.status === "open" && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-xs text-green-600"
                            onClick={() => wonMutation.mutate(deal.id)}
                            disabled={wonMutation.isPending}
                          >
                            <Trophy className="mr-1 h-3 w-3" />Won
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-xs text-red-600"
                            onClick={() => setLostDialog({ id: deal.id })}
                          >
                            <X className="mr-1 h-3 w-3" />Lost
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Deal Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Deal title"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Value ($)</label>
              <Input
                type="number"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Pipeline</label>
              <Select value={form.pipeline_id} onValueChange={(v) => setForm((f) => ({ ...f, pipeline_id: v ?? "" }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p: Pipeline) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate({ title: form.title, value: Number(form.value), pipeline_id: form.pipeline_id })}
                disabled={!form.title || createMutation.isPending}
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark Lost Dialog */}
      <Dialog open={!!lostDialog} onOpenChange={(o) => { if (!o) { setLostDialog(null); setLostReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Lost</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Reason (optional)</label>
              <Input
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Why was this deal lost?"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setLostDialog(null); setLostReason(""); }}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => lostDialog && lostMutation.mutate({ id: lostDialog.id, reason: lostReason })}
                disabled={lostMutation.isPending}
              >
                Confirm Lost
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
