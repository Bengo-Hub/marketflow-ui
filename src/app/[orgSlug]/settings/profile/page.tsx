"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STALE_TIMES } from "@/app/providers";
import { AlertCircle, ExternalLink, CheckCircle2 } from "lucide-react";

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
  metadata?: Record<string, any>;
};

export default function ProfileSettingsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-profile", orgSlug],
    queryFn: async () => {
      const res = await apiClient.get<TenantProfile>(`/api/v1/tenant/profile`);
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
      return apiClient.patch(`/api/v1/tenant/profile`, {
        ...form,
        metadata: meta,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-profile"] }),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  }

  // Profile completeness check
  const missing: string[] = [];
  if (!data.whatsapp_number) missing.push("WhatsApp number");
  if (!meta.bio) missing.push("Bio");
  if (!data.fbo_distrib_id && data.business_type === "flp") missing.push("Distributor ID");
  if (!meta.logo_url) missing.push("Logo");
  const isComplete = missing.length === 0;
  const profileUrl = `https://marketflow.codevertexitsolutions.com/p/${data.slug}`;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
          <p className="text-sm text-muted-foreground">
            Your public page lives at{" "}
            <a href={profileUrl} target="_blank" rel="noreferrer" className="text-amber-600 hover:underline font-medium">
              /p/{data.slug} <ExternalLink className="inline h-3 w-3" />
            </a>
          </p>
        </div>
        <a href={profileUrl} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> View public page
          </Button>
        </a>
      </div>

      {!isComplete && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Complete your profile for a better public page</p>
            <p className="text-xs text-amber-600 mt-1">
              Missing: {missing.map((m, i) => (
                <Badge key={m} variant="outline" className="text-[10px] mx-0.5 border-amber-300 text-amber-700">
                  {m}
                </Badge>
              ))}
            </p>
          </div>
        </div>
      )}
      {isComplete && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <p className="text-sm text-green-700">Profile complete — your public page looks great!</p>
        </div>
      )}

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
            <Field label="Bio (shown on public page hero)">
              <Textarea
                rows={3}
                value={meta.bio ?? ""}
                onChange={(e) => setMeta({ ...meta, bio: e.target.value })}
                placeholder="Tell visitors about yourself and your business..."
              />
            </Field>
            <Field label="My Story (shown in the 'My Forever Story' section)">
              <Textarea
                rows={4}
                value={meta.story ?? ""}
                onChange={(e) => setMeta({ ...meta, story: e.target.value })}
                placeholder="Share your journey — how you started, what drives you..."
              />
            </Field>
            <Field label="Video URL (YouTube embed link)">
              <Input
                value={meta.video_url ?? ""}
                onChange={(e) => setMeta({ ...meta, video_url: e.target.value })}
                placeholder="https://www.youtube.com/embed/..."
              />
            </Field>
            <Field label="Tagline">
              <Input
                value={meta.tagline ?? ""}
                onChange={(e) => setMeta({ ...meta, tagline: e.target.value })}
                placeholder="e.g. Forever Business Owner"
              />
            </Field>
            <Field label="Contact email (shown when WhatsApp is not set)">
              <Input
                type="email"
                value={meta.contact_email ?? ""}
                onChange={(e) => setMeta({ ...meta, contact_email: e.target.value })}
                placeholder="you@example.com"
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
