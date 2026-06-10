"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STALE_TIMES } from "@/app/providers";
import { segmentsApi } from "@/lib/api/segments";
import { RefreshCw } from "lucide-react";

type Segment = {
  id: string;
  name: string;
  entity_type: string;
  member_count?: number;
  is_dynamic?: boolean;
  last_calculated_at?: string;
};

export default function SegmentsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", entity_type: "lead", is_dynamic: false });

  const { data, isLoading, error } = useQuery({
    queryKey: ["segments"],
    queryFn: () => segmentsApi.list().then((r) => r.data),
    staleTime: STALE_TIMES.OPERATIONAL,
  });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => segmentsApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["segments"] });
      setShowCreate(false);
      setForm({ name: "", entity_type: "lead", is_dynamic: false });
    },
  });

  const evaluateMutation = useMutation({
    mutationFn: (id: string) => segmentsApi.evaluate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["segments"] });
      setEvaluatingId(null);
    },
    onMutate: (id) => setEvaluatingId(id),
  });

  const segments: Segment[] = data?.data ?? data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Segments</h1>
          <p className="text-muted-foreground">{segments.length} segments</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>New Segment</Button>
      </div>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Failed to load segments: {(error as Error).message}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Dynamic</TableHead>
                <TableHead>Last Calculated</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : segments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No segments yet. Create one to start grouping your contacts.
                  </TableCell>
                </TableRow>
              ) : (
                segments.map((segment: Segment) => (
                  <TableRow key={segment.id}>
                    <TableCell className="font-medium">{segment.name}</TableCell>
                    <TableCell className="capitalize">{segment.entity_type}</TableCell>
                    <TableCell>{segment.member_count ?? "--"}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${segment.is_dynamic ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" : "bg-muted text-muted-foreground"}`}>
                        {segment.is_dynamic ? "Dynamic" : "Static"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {segment.last_calculated_at ? new Date(segment.last_calculated_at).toLocaleString() : "--"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-xs"
                        onClick={() => evaluateMutation.mutate(segment.id)}
                        disabled={evaluatingId === segment.id}
                      >
                        <RefreshCw className={`mr-1 h-3 w-3 ${evaluatingId === segment.id ? "animate-spin" : ""}`} />
                        Evaluate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Segment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Segment name"
              />
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
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_dynamic"
                checked={form.is_dynamic}
                onChange={(e) => setForm((f) => ({ ...f, is_dynamic: e.target.checked }))}
                className="h-4 w-4 rounded border"
              />
              <label htmlFor="is_dynamic" className="text-sm font-medium cursor-pointer">
                Dynamic segment (auto-updates based on rules)
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate({ name: form.name, entity_type: form.entity_type, is_dynamic: form.is_dynamic })}
                disabled={!form.name || createMutation.isPending}
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
