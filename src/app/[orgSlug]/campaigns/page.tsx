"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FeatureGate } from "@bengo-hub/shared-ui-lib/subscription";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Eye, MousePointerClick, DollarSign, Target, UserPlus } from "lucide-react";
import { toast } from "sonner";

type CampaignMetrics = {
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  leads: number;
  cost_per_lead: number;
};

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
  metrics?: CampaignMetrics | null;
  created_at: string;
};

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Campaign>>({
    name: "",
    platform: "meta",
    status: "draft",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const r = await apiClient.get<{ data: Campaign[] }>(`/api/v1/campaigns?limit=100`);
      return r.data;
    },
  });

  // Fetch individual campaign with metrics when expanded
  const { data: expandedCampaign, isLoading: expandedLoading } = useQuery({
    queryKey: ["campaign-detail", expandedId],
    queryFn: async () => {
      if (!expandedId) return null;
      const r = await apiClient.get<{ data: Campaign }>(`/api/v1/campaigns/${expandedId}`);
      return r.data.data ?? r.data;
    },
    enabled: !!expandedId,
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
      toast.success(editingId ? "Campaign updated" : "Campaign created");
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to save campaign"
      );
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/api/v1/campaigns/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted");
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete campaign"
      );
    },
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

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  /** Resolve metrics: from the expanded detail fetch, from the list item, or null */
  function getMetrics(campaign: Campaign): CampaignMetrics | null {
    if (expandedId === campaign.id && expandedCampaign) {
      const ec = expandedCampaign as Campaign;
      return ec.metrics ?? null;
    }
    return campaign.metrics ?? null;
  }

  function hasAnyMetricValue(m: CampaignMetrics): boolean {
    return m.impressions > 0 || m.clicks > 0 || m.spend > 0 || m.leads > 0;
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
        <FeatureGate anyOf={["basic_campaigns", "unlimited_campaigns"]}>
          <Button onClick={() => { resetForm(); setOpen(true); }}>+ New campaign</Button>
        </FeatureGate>
      </div>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Failed to load campaigns: {(error as Error).message}
        </div>
      )}

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
                <TableHead className="w-40"></TableHead>
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
                data?.data.map((c) => {
                  const isExpanded = expandedId === c.id;
                  const metrics = getMetrics(c);
                  return (
                    <TableRow key={c.id} className="group">
                      <TableCell>
                        <div>
                          <span className="font-medium">{c.name}</span>
                          {/* Inline metrics row when expanded */}
                          {isExpanded && (
                            <div className="mt-3">
                              {expandedLoading ? (
                                <Skeleton className="h-16 w-full" />
                              ) : metrics && hasAnyMetricValue(metrics) ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                                  <MetricCell
                                    icon={<Eye className="h-3.5 w-3.5" />}
                                    label="Impressions"
                                    value={metrics.impressions.toLocaleString()}
                                  />
                                  <MetricCell
                                    icon={<MousePointerClick className="h-3.5 w-3.5" />}
                                    label="Clicks"
                                    value={metrics.clicks.toLocaleString()}
                                  />
                                  <MetricCell
                                    icon={<DollarSign className="h-3.5 w-3.5" />}
                                    label="Spend"
                                    value={`$${metrics.spend.toFixed(2)}`}
                                  />
                                  <MetricCell
                                    icon={<Target className="h-3.5 w-3.5" />}
                                    label="CTR"
                                    value={`${metrics.ctr.toFixed(2)}%`}
                                  />
                                  <MetricCell
                                    icon={<MousePointerClick className="h-3.5 w-3.5" />}
                                    label="CPC"
                                    value={`$${metrics.cpc.toFixed(2)}`}
                                  />
                                  <MetricCell
                                    icon={<UserPlus className="h-3.5 w-3.5" />}
                                    label="Leads"
                                    value={metrics.leads.toLocaleString()}
                                  />
                                  <MetricCell
                                    icon={<DollarSign className="h-3.5 w-3.5" />}
                                    label="CPL"
                                    value={metrics.cost_per_lead > 0 ? `$${metrics.cost_per_lead.toFixed(2)}` : "--"}
                                  />
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic py-2">
                                  Metrics will appear once the campaign is active
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{c.platform}</Badge></TableCell>
                      <TableCell>{c.status}</TableCell>
                      <TableCell>{c.total_leads}</TableCell>
                      <TableCell>{c.total_conversions}</TableCell>
                      <TableCell>{c.total_spend ? `$${c.total_spend.toFixed(2)}` : "--"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleExpand(c.id)}
                            title="View metrics"
                            aria-label="View metrics"
                            aria-expanded={isExpanded}
                          >
                            <BarChart3 className="h-3.5 w-3.5" />
                          </Button>
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
                  );
                })
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
                {save.isPending ? (editingId ? "Saving..." : "Creating...") : editingId ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded border bg-muted/30 px-2 py-1.5 text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}
