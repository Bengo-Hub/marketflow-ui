"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STALE_TIMES } from "@/app/providers";

// Tenant-scoped KB editor. Nothing platform-level is exposed here.
// On save the marketflow-api side emits `embedding.requested`; the worker
// re-embeds the entry via Ollama + pgvector upsert.
type KBEntry = {
  id: string;
  category: string;
  title: string;
  content: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = ["product", "faq", "business", "compliance"];

export default function KnowledgePage() {
  const qc = useQueryClient();
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KBEntry | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["kb", category],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (category !== "all") params.set("category", category);
      const res = await apiClient.get(`/api/v1/knowledge/entries?${params}`);
      return res.data;
    },
    staleTime: STALE_TIMES.OPERATIONAL,
  });

  const save = useMutation({
    mutationFn: async (input: Partial<KBEntry>) => {
      if (editing?.id) {
        return apiClient.put(`/api/v1/knowledge/entries/${editing.id}`, input);
      }
      return apiClient.post(`/api/v1/knowledge/entries`, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kb"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/api/v1/knowledge/entries/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb"] }),
  });

  function openCreate() {
    setEditing({ id: "", category: "faq", title: "", content: "" } as KBEntry);
    setOpen(true);
  }
  function openEdit(e: KBEntry) {
    setEditing(e);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge base</h1>
          <p className="text-muted-foreground">
            What your AI chatbot cites. Saving re-embeds the entry for semantic search.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={category} onValueChange={(v) => setCategory(v ?? "all")}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate}>+ New entry</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No knowledge entries yet. Add one to teach the chatbot.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((e: KBEntry) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.category}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate text-sm text-muted-foreground">
                      {e.content.slice(0, 120)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(e.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(e)}>
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete "${e.title}"?`)) remove.mutate(e.id);
                          }}
                        >
                          Delete
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit entry" : "New entry"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate({
                  title: editing.title,
                  content: editing.content,
                  category: editing.category,
                  tags: editing.tags,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
                <Select
                  value={editing.category}
                  onValueChange={(v) => setEditing({ ...editing, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Content</label>
                <Textarea
                  rows={8}
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  required
                />
              </div>
              {save.isError && (
                <p className="text-sm text-red-600">
                  Save failed: {(save.error as Error)?.message ?? "unknown error"}
                </p>
              )}
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
