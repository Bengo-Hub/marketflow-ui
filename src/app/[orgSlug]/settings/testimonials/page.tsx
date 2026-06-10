"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Trash2, Edit2, Plus, Eye, EyeOff } from "lucide-react";

type Testimonial = {
  id: string;
  author_name: string;
  author_role?: string;
  body: string;
  avatar_url?: string;
  rating: number;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Testimonials settings — tenant-scoped CRUD that feeds the public /p/{slug}
 * testimonials section. Rating is a 1-5 integer; display_order sorts the
 * grid ascending so tenants can pin a strong quote to the top.
 */
export default function TestimonialsSettingsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, error } = useQuery<{ data: Testimonial[] }>({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const r = await apiClient.get<{ data: Testimonial[] }>("/api/v1/testimonials");
      return r.data;
    },
  });

  const rows = data?.data ?? [];

  const del = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/testimonials/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["testimonials"] }),
  });

  const togglePublish = useMutation({
    mutationFn: async (t: Testimonial) => {
      await apiClient.patch(`/api/v1/testimonials/${t.id}`, {
        is_published: !t.is_published,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["testimonials"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Testimonials</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shown on your public profile page under &ldquo;What people are saying&rdquo;.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add testimonial
        </Button>
      </div>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Failed to load testimonials: {(error as Error).message}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No testimonials yet. Add your first success story to build trust with visitors.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-base">{t.author_name}</CardTitle>
                  {t.author_role && (
                    <p className="text-xs text-muted-foreground">{t.author_role}</p>
                  )}
                </div>
                <div
                  className="text-amber-500"
                  aria-label={`${t.rating} out of 5 stars`}
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`inline h-3 w-3 ${i < t.rating ? "fill-amber-400" : "stroke-slate-300"}`}
                    />
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed">&ldquo;{t.body}&rdquo;</p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border px-2 py-0.5 text-muted-foreground">
                    order: {t.display_order}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 ${t.is_published ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}
                  >
                    {t.is_published ? "published" : "hidden"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                    <Edit2 className="mr-1 h-3 w-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePublish.mutate(t)}
                    disabled={togglePublish.isPending}
                  >
                    {t.is_published ? (
                      <>
                        <EyeOff className="mr-1 h-3 w-3" /> Hide
                      </>
                    ) : (
                      <>
                        <Eye className="mr-1 h-3 w-3" /> Publish
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm(`Delete testimonial from ${t.author_name}?`)) {
                        del.mutate(t.id);
                      }
                    }}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="mr-1 h-3 w-3" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <TestimonialDialog
          testimonial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function TestimonialDialog({
  testimonial,
  onClose,
}: {
  testimonial: Testimonial | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    author_name: testimonial?.author_name ?? "",
    author_role: testimonial?.author_role ?? "",
    body: testimonial?.body ?? "",
    avatar_url: testimonial?.avatar_url ?? "",
    rating: testimonial?.rating ?? 5,
    display_order: testimonial?.display_order ?? 0,
    is_published: testimonial?.is_published ?? true,
  });
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (testimonial) {
        await apiClient.patch(`/api/v1/testimonials/${testimonial.id}`, form);
      } else {
        await apiClient.post("/api/v1/testimonials", form);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["testimonials"] });
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-xl bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold">
          {testimonial ? "Edit testimonial" : "Add testimonial"}
        </h2>
        <div className="mt-4 grid gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Author name *
            </span>
            <Input
              value={form.author_name}
              onChange={(e) => setForm({ ...form, author_name: e.target.value })}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Role / title
            </span>
            <Input
              value={form.author_role}
              onChange={(e) => setForm({ ...form, author_role: e.target.value })}
              placeholder="e.g. Customer, Team member"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Body *</span>
            <Textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={4}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Avatar URL (optional)
            </span>
            <Input
              value={form.avatar_url}
              onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
              placeholder="https://…"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Rating</span>
              <Input
                type="number"
                min={1}
                max={5}
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Display order
              </span>
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
            />
            Publish immediately
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !form.author_name.trim() || !form.body.trim()}
          >
            {save.isPending ? "Saving…" : testimonial ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
