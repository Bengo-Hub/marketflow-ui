"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { STALE_TIMES } from "@/app/providers";

// Tenant-scoped FBO profile editor. Only fields that show on the public
// /p/{slug} page or are safe for the tenant user to own belong here.
// Platform secrets (Meta App, Groq key, etc.) are NOT on this page.
type TenantProfile = {
  id: string;
  slug: string;
  name: string;
  country?: string | null;
  whatsapp_number?: string | null;
  fbo_distrib_id?: string | null;
  flp_store_code?: string | null;
  flp_language?: string | null;
  business_type?: string;
  metadata?: {
    logo_url?: string;
    bio?: string;
    brand_primary_color?: string;
    testimonials?: string[];
    featured_products?: string[];
  };
};

export default function ProfileSettingsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-profile", orgSlug],
    queryFn: async () => {
      const res = await apiClient.get<TenantProfile>(`/api/v1/tenants/current`);
      return res.data;
    },
    staleTime: STALE_TIMES.OPERATIONAL,
  });

  const [form, setForm] = useState<Partial<TenantProfile>>({});
  const [meta, setMeta] = useState<NonNullable<TenantProfile["metadata"]>>({});

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name,
        whatsapp_number: data.whatsapp_number ?? "",
        fbo_distrib_id: data.fbo_distrib_id ?? "",
        flp_store_code: data.flp_store_code ?? "",
        flp_language: data.flp_language ?? "",
        country: data.country ?? "",
      });
      setMeta(data.metadata ?? {});
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      return apiClient.patch(`/api/v1/tenants/current`, {
        ...form,
        metadata: meta,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-profile"] }),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">FBO profile</h1>
        <p className="text-muted-foreground">
          Lives at <code>/p/{data.slug}</code>. Changes are published immediately.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Card>
          <CardContent className="space-y-4 p-6">
            <Field label="Business name" required>
              <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Bio">
              <Textarea
                rows={3}
                value={meta.bio ?? ""}
                onChange={(e) => setMeta({ ...meta, bio: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="WhatsApp number">
                <Input
                  value={form.whatsapp_number ?? ""}
                  onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                  placeholder="+2547…"
                />
              </Field>
              <Field label="Country">
                <Input
                  value={form.country ?? ""}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="KE"
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {data.business_type === "flp" && (
          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-sm font-semibold uppercase text-muted-foreground">
                Forever Living
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="FBO distrib ID">
                  <Input
                    value={form.fbo_distrib_id ?? ""}
                    onChange={(e) => setForm({ ...form, fbo_distrib_id: e.target.value })}
                  />
                </Field>
                <Field label="FLP store code">
                  <Input
                    value={form.flp_store_code ?? ""}
                    onChange={(e) => setForm({ ...form, flp_store_code: e.target.value })}
                  />
                </Field>
                <Field label="FLP language">
                  <Input
                    value={form.flp_language ?? ""}
                    onChange={(e) => setForm({ ...form, flp_language: e.target.value })}
                    placeholder="en"
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Brand</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Logo URL">
                <Input
                  value={meta.logo_url ?? ""}
                  onChange={(e) => setMeta({ ...meta, logo_url: e.target.value })}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Brand colour">
                <Input
                  type="color"
                  value={meta.brand_primary_color ?? "#16a34a"}
                  onChange={(e) => setMeta({ ...meta, brand_primary_color: e.target.value })}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          {save.isError && (
            <span className="text-sm text-red-600">Save failed: {(save.error as Error)?.message}</span>
          )}
          {save.isSuccess && <span className="text-sm text-green-700">Saved</span>}
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-muted-foreground">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
