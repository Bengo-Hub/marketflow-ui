"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ImageIcon, Plus } from "lucide-react";
import type { DataTableColumn } from "@bengo-hub/shared-ui-lib/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CapsuleTabs, EmptyState, ErrorState, ListTable, PageHeader, ToneBadge } from "@/components/ui-kit";
import { NewAdForm } from "@/components/studio/new-ad-form";
import { useBriefs } from "@/hooks/use-creative";
import { apiErrorMessage } from "@/lib/api/errors";
import { OBJECTIVES, type CreativeBrief } from "@/lib/api/creative";

const PAGE = 20;
const dateFmt = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" });

export default function StudioPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const list = useBriefs(status, page, PAGE);

  const columns: DataTableColumn<CreativeBrief>[] = [
    {
      key: "title",
      header: "Ad",
      primary: true,
      accessor: (b) => b.title,
      render: (b) => (
        <Link href={`/${orgSlug}/studio/${b.id}`} className="block min-w-0 hover:text-primary">
          <span className="font-medium">{b.title}</span>
          {b.offering?.name && b.offering.name !== b.title && <span className="block truncate text-xs text-muted-foreground">{b.offering.name}</span>}
        </Link>
      ),
    },
    {
      key: "objective",
      header: "Goal",
      accessor: (b) => OBJECTIVES.find((o) => o.value === b.objective)?.label ?? b.objective,
      render: (b) => <ToneBadge>{OBJECTIVES.find((o) => o.value === b.objective)?.label ?? b.objective}</ToneBadge>,
    },
    { key: "language", header: "Language", hideBelow: "md", accessor: (b) => (b.language === "sw" ? "Swahili" : "English") },
    {
      key: "offering",
      header: "From",
      hideBelow: "lg",
      accessor: (b) => (b.offering?.type === "PROMOTION" ? "Promotion" : b.offering?.source ? "Catalogue" : "Typed in"),
      render: (b) =>
        b.offering?.type === "PROMOTION" ? <ToneBadge tone="warning">Promotion</ToneBadge> : <span className="text-muted-foreground">{b.offering?.source_id ? "Catalogue" : "Typed in"}</span>,
    },
    { key: "updated_at", header: "Updated", hideBelow: "md", accessor: (b) => b.updated_at, render: (b) => <span className="text-muted-foreground tabular">{dateFmt.format(new Date(b.updated_at))}</span> },
    {
      key: "open",
      header: <span className="sr-only">Open</span>,
      mobileAction: true,
      exportable: false,
      render: (b) => (
        <Button variant="ghost" size="sm" onClick={() => router.push(`/${orgSlug}/studio/${b.id}`)}>
          Open
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ImageIcon />}
        title="Studio"
        description="Make posters for your products and promotions, review them, and keep the ones you approve."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> New ad
          </Button>
        }
      />

      <CapsuleTabs
        label="Show ads"
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        options={[
          { value: "active", label: "Current" },
          { value: "archived", label: "Archived" },
        ]}
      />

      {list.isError && <ErrorState message={apiErrorMessage(list.error, "Could not load your ads.")} onRetry={() => void list.refetch()} />}
      <ListTable<CreativeBrief>
        columns={columns}
        rows={list.data?.data ?? []}
        rowKey={(b) => b.id}
        loading={list.isLoading}
        storageKey="mf-studio-columns"
        paging={{ page, limit: list.data?.limit || PAGE, total: list.data?.total ?? 0, onPage: setPage }}
        emptyState={
          status === "active" ? (
            <EmptyState
              icon={<ImageIcon />}
              title="No ads yet"
              description="Pick a product, service or promotion and Studio makes a poster you can post on WhatsApp, Facebook or Instagram."
              action={<Button onClick={() => setCreating(true)}><Plus /> New ad</Button>}
            />
          ) : (
            <EmptyState icon={<ImageIcon />} title="Nothing archived" description="Ads you archive show here, with their approved posters." />
          )
        }
      />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New ad</DialogTitle>
          </DialogHeader>
          {creating && <NewAdForm onDone={(id) => (id ? router.push(`/${orgSlug}/studio/${id}`) : setCreating(false))} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
