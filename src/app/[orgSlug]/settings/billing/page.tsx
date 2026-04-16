"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import axios from "axios";

// Billing is owned by subscriptions-service; marketflow just reads from it.
// NEXT_PUBLIC_SUBSCRIPTIONS_URL is the base URL; falls back to production.
const SUBS_URL =
  process.env.NEXT_PUBLIC_SUBSCRIPTIONS_URL ||
  "https://subscriptionsapi.codevertexitsolutions.com";

type Subscription = {
  plan: string;
  status: string;
  current_period_end?: string;
  features?: string[];
  limits?: Record<string, number>;
};

type Invoice = {
  id: string;
  number: string;
  amount_cents: number;
  currency: string;
  status: string;
  issued_at: string;
  paid_at?: string | null;
  hosted_url?: string;
};

export default function BillingPage() {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const token = session?.accessToken;
  const tenantSlug = user?.tenantSlug;

  const axiosAuth = {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "X-Tenant-Slug": tenantSlug ?? "",
    },
  };

  const subQ = useQuery({
    queryKey: ["billing-sub", tenantSlug],
    queryFn: async () => {
      const r = await axios.get<Subscription>(
        `${SUBS_URL}/api/v1/subscriptions/current`,
        axiosAuth,
      );
      return r.data;
    },
    enabled: !!token && !!tenantSlug,
  });

  const invQ = useQuery({
    queryKey: ["billing-invoices", tenantSlug],
    queryFn: async () => {
      const r = await axios.get<{ data: Invoice[] }>(
        `${SUBS_URL}/api/v1/invoices?limit=20`,
        axiosAuth,
      );
      return r.data;
    },
    enabled: !!token && !!tenantSlug,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Your current plan, feature limits, and invoice history. Billing is managed by the
          platform subscription service.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Current plan</div>
              {subQ.isLoading ? (
                <Skeleton className="mt-1 h-7 w-32" />
              ) : subQ.data ? (
                <div className="mt-1 text-2xl font-semibold">
                  {subQ.data.plan}{" "}
                  <Badge variant="outline" className="ml-2 uppercase">
                    {subQ.data.status}
                  </Badge>
                </div>
              ) : (
                <div className="mt-1 text-sm text-muted-foreground">
                  No subscription found. Contact support to provision a plan.
                </div>
              )}
              {subQ.data?.current_period_end && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Renews on {new Date(subQ.data.current_period_end).toLocaleDateString()}
                </div>
              )}
            </div>
            <a
              href={`${SUBS_URL}/billing`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--brand-primary)] underline"
            >
              Manage on subscriptions portal ↗
            </a>
          </div>

          {subQ.data?.features && subQ.data.features.length > 0 && (
            <div>
              <div className="mb-1 text-xs uppercase text-muted-foreground">Included features</div>
              <div className="flex flex-wrap gap-2">
                {subQ.data.features.map((f) => (
                  <Badge key={f} variant="secondary">
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {subQ.data?.limits && Object.keys(subQ.data.limits).length > 0 && (
            <div>
              <div className="mb-1 text-xs uppercase text-muted-foreground">Monthly limits</div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {Object.entries(subQ.data.limits).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-base font-medium">Invoices</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invQ.isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !invQ.data?.data?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      No invoices yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  invQ.data.data.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.number}</TableCell>
                      <TableCell>{new Date(inv.issued_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {(inv.amount_cents / 100).toFixed(2)} {inv.currency}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{inv.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {inv.hosted_url && (
                          <a
                            className="text-xs text-[var(--brand-primary)] underline"
                            href={inv.hosted_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Need a different plan?{" "}
        <a
          className="text-[var(--brand-primary)] underline"
          href={`${SUBS_URL}/billing`}
          target="_blank"
          rel="noreferrer"
        >
          Open the subscriptions portal ↗
        </a>
      </p>
    </div>
  );
}
