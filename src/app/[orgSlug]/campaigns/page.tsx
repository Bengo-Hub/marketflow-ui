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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Campaign = {
  id: string;
  name: string;
  platform: string;
  status: string;
  budget_daily?: number | null;
  budget_total?: number | null;
  total_leads: number;
  total_conversions: number;
  total_spend?: number | null;
  created_at: string;
};

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Campaign>>({
    name: "",
    platform: "meta",
    status: "draft",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const r = await apiClient.get<{ data: Campaign[] }>(`/api/v1/campaigns?limit=100`);
      return r.data;
    },
  });

  function resetForm() {
    setForm({ name: "", platform: "meta", status: "draft" });
    setEditingId(null);
  }

  const save = useMutation({
    mutationFn: async (c: Partial<Campaign>) => {
      if (editingId) return apiClient.put(`/api/v1/campaigns/${editingId}`, c);
      return apiClient.post(`/api/v1/campaigns`, c);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setOpen(false);
      resetForm();
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/api/v1/campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  function openEdit(c: Campaign) {
    setForm({
      name: c.name,
      platform: c.platform,
      status: c.status,
      budget_daily: c.budget_daily ?? undefined,
    });
    setEditingId(c.id);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Track your Meta / TikTok / organic campaigns and the leads they generate.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setOpen(true); }}>+ New campaign</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Conversions</TableHead>
                <TableHead>Spend</TableHead>
                <TableHead className="w-32"></TableHead>
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
                    No campaigns yet. Add one to start tracking lead attribution.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell><Badge variant="outline">{c.platform}</Badge></TableCell>
                    <TableCell>{c.status}</TableCell>
                    <TableCell>{c.total_leads}</TableCell>
                    <TableCell>{c.total_conversions}</TableCell>
                    <TableCell>{c.total_spend ? `$${c.total_spend.toFixed(2)}` : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete campaign "${c.name}"?`)) del.mutate(c.id);
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
            <DialogTitle>{editingId ? "Edit campaign" : "New campaign"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(form);
            }}
          >
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-muted-foreground">Name</span>
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-muted-foreground">Platform</span>
              <Select
                value={form.platform}
                onValueChange={(v) => setForm({ ...form, platform: v ?? "meta" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meta">Meta (Facebook/Instagram)</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="google">Google Ads</SelectItem>
                  <SelectItem value="organic">Organic / Other</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-muted-foreground">Daily budget (USD)</span>
              <Input
                type="number"
                step="0.01"
                value={form.budget_daily ?? ""}
                onChange={(e) =>
                  setForm({ ...form, budget_daily: Number(e.target.value) || undefined })
                }
              />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? (editingId ? "Saving…" : "Creating…") : editingId ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
