"use client";

import Link from "next/link";
import { Building2, ExternalLink, LayoutDashboard } from "lucide-react";
import type { DataTableColumn } from "@bengo-hub/shared-ui-lib/data-table";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, ListTable, PageHeader, StatusBadge, ToneBadge, humanize } from "@/components/ui-kit";
import { useAdminTenants } from "@/hooks/use-admin";
import type { AdminTenant } from "@/lib/api/admin";
import { PRICING_URL } from "@/lib/urls";

const dateFmt = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" });

/**
 * Tenant directory (marketflow-api /admin/tenants, bounded server-side). Read-only here:
 * plans, trials and exemptions are managed in the pricing console, identity in SSO.
 */
export default function PlatformTenantsPage() {
  const tenants = useAdminTenants();
  const rows = tenants.data ?? [];

  const columns: DataTableColumn<AdminTenant>[] = [
    {
      key: "name",
      header: "Business",
      primary: true,
      sortable: true,
      accessor: (t) => t.name,
      render: (t) => (
        <span>
          <span className="font-medium">{t.name}</span>
          <span className="block text-xs text-muted-foreground">{t.slug}</span>
        </span>
      ),
    },
    {
      key: "business_type",
      header: "Type",
      sortable: true,
      filterable: true,
      accessor: (t) => t.business_type ?? "generic",
      render: (t) => <ToneBadge tone={t.business_type === "flp" ? "primary" : "neutral"}>{t.business_type === "flp" ? "Forever Living" : humanize(t.business_type || "generic")}</ToneBadge>,
    },
    { key: "status", header: "Status", sortable: true, filterable: true, accessor: (t) => t.status ?? "active", render: (t) => <StatusBadge status={t.status ?? "active"} /> },
    { key: "country", header: "Country", sortable: true, filterable: true, hideBelow: "lg", accessor: (t) => t.country ?? "" },
    { key: "created_at", header: "Joined", sortable: true, accessor: (t) => t.created_at, render: (t) => <span className="text-muted-foreground tabular">{dateFmt.format(new Date(t.created_at))}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      mobileAction: true,
      exportable: false,
      render: (t) => (
        <div className="flex justify-end gap-1">
          <Link href={`/${t.slug}/dashboard`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label={`Open ${t.name}'s workspace`} title="Open workspace">
            <LayoutDashboard />
          </Link>
          <a href={`/p/${t.slug}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label={`${t.name}'s public page`} title="Public page">
            <ExternalLink />
          </a>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Building2 />}
        title="Tenants"
        description={tenants.isLoading ? "Loading..." : `${rows.length.toLocaleString()} businesses on MarketFlow.`}
        actions={
          <a href={`${PRICING_URL}/platform/tenants`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
            Plans and exemptions <ExternalLink />
          </a>
        }
      />
      <ListTable<AdminTenant>
        columns={columns}
        rows={rows}
        rowKey={(t) => t.id}
        loading={tenants.isLoading}
        error={tenants.isError}
        onRetry={() => void tenants.refetch()}
        storageKey="mf-platform-tenants-columns"
        defaultSort={{ key: "name", dir: "asc" }}
        showExportCsv
        exportFileName="marketflow-tenants"
        pageSize={25}
        emptyState={<EmptyState icon={<Building2 />} title="No tenants yet" description="Businesses appear here after their first sign-in to MarketFlow." />}
      />
    </div>
  );
}
