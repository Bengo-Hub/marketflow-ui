"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ShortLink = {
  id: string;
  code: string;
  target_url: string;
  total_clicks: number;
  created_at: string;
};

export default function ShortLinksPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<ShortLink>>({ target_url: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["short-links"],
    queryFn: async () => {
      const r = await apiClient.get<{ data: ShortLink[] }>(`/api/v1/short-links?limit=100`);
      return r.data;
    },
  });

  const create = useMutation({
    mutationFn: async (s: Partial<ShortLink>) => apiClient.post(`/api/v1/short-links`, s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["short-links"] });
      setOpen(false);
      setForm({ target_url: "" });
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/api/v1/short-links/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["short-links"] }),
  });

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://marketflow.codevertexitsolutions.com";

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(`${appUrl}/s/${code}`);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Short links</h1>
          <p className="text-sm text-muted-foreground">
            Trackable short URLs for ads, WhatsApp messages, and offline campaigns. Every click
            increments the counter and is attributed to a lead when captured.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>+ New short link</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Short URL</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-36"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No short links yet. Create one to start tracking clicks.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">
                      <a
                        className="text-[var(--brand-primary)] underline"
                        href={`${appUrl}/s/${s.code}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        /s/{s.code}
                      </a>
                    </TableCell>
                    <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                      {s.target_url}
                    </TableCell>
                    <TableCell>{s.total_clicks}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => copy(s.code)}>
                          Copy
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete short link /s/${s.code}?`)) del.mutate(s.id);
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New short link</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(form);
            }}
          >
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-muted-foreground">Target URL</span>
              <Input
                type="url"
                placeholder="https://shop.foreverliving.com/…"
                value={form.target_url ?? ""}
                onChange={(e) => setForm({ ...form, target_url: e.target.value })}
                required
              />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-muted-foreground">Custom code (optional)</span>
              <Input
                placeholder="c9-offer"
                value={form.code ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                  })
                }
              />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
