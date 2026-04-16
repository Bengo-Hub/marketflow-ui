"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";

type Tenant = {
  id: string;
  slug: string;
  name: string;
  plan?: string;
  status?: string;
  business_type?: string;
  created_at: string;
};

export default function PlatformTenantsPage() {
  const [items, setItems] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{ tenants: Tenant[] }>("/api/v1/admin/tenants")
      .then((r) => setItems(r.data.tenants ?? []))
      .catch((e) => setError(e?.message ?? "Failed to load tenants"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <p className="text-sm text-muted-foreground">
          All tenants on the platform. Plan overrides and suspensions apply immediately.
        </p>
      </header>

      {error && <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="rounded border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Slug</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Plan</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No tenants found.
                </td>
              </tr>
            ) : (
              items.map((t) => (
                <tr key={t.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2 font-medium">{t.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{t.slug}</td>
                  <td className="px-4 py-2">{t.business_type ?? "-"}</td>
                  <td className="px-4 py-2">{t.plan ?? "starter"}</td>
                  <td className="px-4 py-2">{t.status ?? "active"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
