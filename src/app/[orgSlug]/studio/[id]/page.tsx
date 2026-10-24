"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Archive, ArchiveRestore, ArrowLeft, ImageIcon, TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState, ErrorState, GlassPanel, PageHeader, ToneBadge } from "@/components/ui-kit";
import { PosterForm } from "@/components/studio/poster-form";
import { VersionCard } from "@/components/studio/version-card";
import { useBrief, useCanApprove, useUpdateBrief } from "@/hooks/use-creative";
import { apiErrorMessage } from "@/lib/api/errors";
import { OBJECTIVES, type CreativeVersion } from "@/lib/api/creative";
import { cn } from "@/lib/utils";

export default function AdPage() {
  const { orgSlug, id } = useParams<{ orgSlug: string; id: string }>();
  const brief = useBrief(id);
  const update = useUpdateBrief(id);
  const canApprove = useCanApprove();
  // A poster to start from: "Make another like this" fills the form from it.
  const [base, setBase] = useState<CreativeVersion | null>(null);

  const back = (
    <Link href={`/${orgSlug}/studio`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
      <ArrowLeft /> All ads
    </Link>
  );

  if (brief.isError) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorState message={apiErrorMessage(brief.error, "Could not load this ad.")} onRetry={() => void brief.refetch()} />
      </div>
    );
  }
  if (!brief.data) {
    return (
      <div className="space-y-4">
        {back}
        <div className="h-24 animate-pulse rounded-[1.25rem] bg-muted" />
        <div className="h-96 animate-pulse rounded-[1.25rem] bg-muted" />
      </div>
    );
  }

  const b = brief.data;
  const versions = b.edges?.versions ?? [];
  const archived = b.status === "archived";
  const goal = OBJECTIVES.find((o) => o.value === b.objective)?.label ?? b.objective;
  const live = versions.filter((v) => v.status !== "rejected" && v.status !== "superseded");
  const old = versions.filter((v) => v.status === "rejected" || v.status === "superseded");

  return (
    <div className="space-y-6">
      {back}
      <PageHeader
        icon={<ImageIcon />}
        title={b.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {b.offering?.name && <span>{b.offering.name}</span>}
            {b.offering?.type === "PROMOTION" && <ToneBadge tone="warning">Promotion</ToneBadge>}
            <ToneBadge>{goal}</ToneBadge>
            {b.language === "sw" && <ToneBadge>Swahili</ToneBadge>}
          </span>
        }
        actions={
          <Button variant="outline" disabled={update.isPending} onClick={() => update.mutate({ status: archived ? "active" : "archived" })}>
            {archived ? <ArchiveRestore /> : <Archive />} {archived ? "Restore" : "Archive"}
          </Button>
        }
      />

      {!canApprove && (
        <GlassPanel>
          <p className="flex gap-2 text-sm text-muted-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            You can make posters and share them for review. The business owner or an admin approves them.
          </p>
        </GlassPanel>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* On a phone the posters to review come first once there are some. */}
        <div className={cn("min-w-0 lg:sticky lg:top-24 lg:self-start", live.length > 0 && "order-2 lg:order-0")}>
          {archived ? (
            <GlassPanel title="Archived">
              <p className="text-sm text-muted-foreground">Restore this ad to make new posters for it.</p>
            </GlassPanel>
          ) : (
            <PosterForm key={base?.id ?? "new"} brief={b} base={base} onStarted={() => setBase(null)} />
          )}
        </div>

        <div className="min-w-0 space-y-6">
          {live.length === 0 ? (
            <GlassPanel>
              <EmptyState
                icon={<ImageIcon />}
                title="No posters yet"
                description="Describe the picture you want and choose a size. Each poster is a draft you can approve, change or discard."
              />
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {live.map((v) => (
                <VersionCard key={v.id} briefId={b.id} version={v} canApprove={canApprove} archived={archived} onRemake={() => setBase(v)} />
              ))}
            </div>
          )}

          {old.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Discarded and replaced ({old.length})
              </summary>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {old.map((v) => (
                  <VersionCard key={v.id} briefId={b.id} version={v} canApprove={false} archived onRemake={() => setBase(v)} />
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
