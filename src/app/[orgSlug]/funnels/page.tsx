"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Funnel = {
  id: string;
  name: string;
  slug: string;
  funnel_type: string;
  status: string;
  landing_page_html?: string;
  total_views: number;
  total_submissions: number;
  conversion_rate: number;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
};

const TYPES = [
  { value: "lead_magnet", label: "Lead magnet" },
  { value: "product_inquiry", label: "Product inquiry" },
  { value: "business_opportunity", label: "Business opportunity" },
  { value: "c9_challenge", label: "C9 challenge" },
  { value: "custom", label: "Custom" },
];

export default function FunnelsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Funnel> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["funnels"],
    queryFn: async () => {
      const r = await apiClient.get<{ data: Funnel[] }>(`/api/v1/funnels?limit=100`);
      return r.data;
    },
  });

  const save = useMutation({
    mutationFn: async (f: Partial<Funnel>) => {
      if (editing?.id) {
        return apiClient.put(`/api/v1/funnels/${editing.id}`, f);
      }
      return apiClient.post(`/api/v1/funnels`, f);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funnels"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const publish = useMutation({
    mutationFn: async (f: Funnel) =>
      apiClient.put(`/api/v1/funnels/${f.id}`, {
        status: f.status === "published" ? "draft" : "published",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["funnels"] }),
  });

  function newFunnel() {
    setEditing({
      name: "",
      slug: "",
      funnel_type: "lead_magnet",
      status: "draft",
      landing_page_html: "",
    });
    setOpen(true);
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://marketflow.codevertexitsolutions.com";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Funnels</h1>
          <p className="text-sm text-muted-foreground">
            Hosted lead-capture pages. Published funnels are available at{" "}
            <code className="text-xs">{appUrl}/f/&lt;slug&gt;</code>.
          </p>
        </div>
        <Button onClick={newFunnel}>+ New funnel</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Conv.</TableHead>
                <TableHead className="w-48"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No funnels yet. Create one to capture leads from ads or direct traffic.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell><Badge variant="outline">{f.funnel_type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">
                      {f.status === "published" ? (
                        <a
                          className="text-[var(--brand-primary)] underline"
                          target="_blank"
                          rel="noreferrer"
                          href={`${appUrl}/f/${f.slug}`}
                        >
                          /f/{f.slug}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">/f/{f.slug}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          f.status === "published"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {f.status}
                      </span>
                    </TableCell>
                    <TableCell>{f.total_views}</TableCell>
                    <TableCell>{f.total_submissions}</TableCell>
                    <TableCell>{(f.conversion_rate * 100).toFixed(1)}%</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing(f);
                            setOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => publish.mutate(f)}>
                          {f.status === "published" ? "Unpublish" : "Publish"}
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit funnel" : "New funnel"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate({
                  name: editing.name,
                  slug: editing.slug,
                  funnel_type: editing.funnel_type,
                  status: editing.status,
                  landing_page_html: editing.landing_page_html,
                });
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name">
                  <Input
                    value={editing.name ?? ""}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Slug (used in /f/<slug>)">
                  <Input
                    value={editing.slug ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                      })
                    }
                    required
                  />
                </Field>
              </div>
              <Field label="Type">
                <Select
                  value={editing.funnel_type}
                  onValueChange={(v) =>
                    setEditing({ ...editing, funnel_type: v ?? "lead_magnet" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Custom landing-page HTML (optional)">
                <Textarea
                  rows={10}
                  value={editing.landing_page_html ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, landing_page_html: e.target.value })
                  }
                  className="font-mono text-xs"
                  placeholder="Leave empty to use the default MarketFlow template (recommended)."
                />
              </Field>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
