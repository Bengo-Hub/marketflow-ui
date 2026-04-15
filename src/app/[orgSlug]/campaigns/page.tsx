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

  const create = useMutation({
    mutationFn: async (c: Partial<Campaign>) => apiClient.post(`/api/v1/campaigns`, c),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setOpen(false);
      setForm({ name: "", platform: "meta", status: "draft" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Track your Meta / TikTok / organic campaigns and the leads they generate.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>+ New campaign</Button>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
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
            <DialogTitle>New campaign</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(form);
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
