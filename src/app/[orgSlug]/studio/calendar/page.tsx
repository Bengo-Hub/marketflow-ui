"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, ExternalLink, RotateCcw, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { CapsuleTabs, ConfirmDialog, EmptyState, ErrorState, GlassPanel, PageHeader, ToneBadge, type Tone } from "@/components/ui-kit";
import { useCancelPost, usePublishAccounts, usePublishJobs, useRetryPost } from "@/hooks/use-publishing";
import { apiErrorMessage } from "@/lib/api/errors";
import { JOB_STATUS_LABEL, PLATFORM_LABEL, type JobStatus, type PublishJob } from "@/lib/api/publishing";

type Range = "upcoming" | "past";

const TONE: Record<JobStatus, Tone> = {
  pending: "info",
  uploading: "warning",
  processing: "warning",
  published: "success",
  failed: "danger",
  cancelled: "neutral",
};

const dayFmt = new Intl.DateTimeFormat("en-KE", { weekday: "long", day: "numeric", month: "long" });
const timeFmt = new Intl.DateTimeFormat("en-KE", { timeStyle: "short" });

/** The window the API is asked for: the next 30 days, or the last 30 (it allows up to 92). */
function windowFor(range: Range) {
  const now = new Date();
  const day = 24 * 60 * 60_000;
  // Start an hour back so a post that is on its way right now still shows under "Upcoming".
  return range === "upcoming"
    ? { from: new Date(now.getTime() - 60 * 60_000).toISOString(), to: new Date(now.getTime() + 30 * day).toISOString() }
    : { from: new Date(now.getTime() - 30 * day).toISOString(), to: now.toISOString() };
}

export default function PublishingCalendarPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [range, setRange] = useState<Range>("upcoming");
  // The window is fixed per tab choice, so the query key stays stable between renders.
  const win = useMemo(() => windowFor(range), [range]);
  const jobs = usePublishJobs(win.from, win.to);
  const accounts = usePublishAccounts();
  const names = useMemo(() => new Map((accounts.data ?? []).map((a) => [a.id, a.display_name])), [accounts.data]);

  const all = useMemo(() => {
    const rows = jobs.data?.pages.flatMap((p) => p.data) ?? [];
    return range === "past" ? [...rows].reverse() : rows;
  }, [jobs.data, range]);
  const days = useMemo(() => {
    const groups = new Map<string, PublishJob[]>();
    for (const j of all) {
      const key = dayFmt.format(new Date(j.planned_at));
      groups.set(key, [...(groups.get(key) ?? []), j]);
    }
    return [...groups.entries()];
  }, [all]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<CalendarDays />}
        title="Posting calendar"
        description="Videos going to your pages and channels, and how each post went."
        actions={
          <Link href={`/${orgSlug}/studio`} className={buttonVariants({ variant: "outline" })}>
            Back to Studio
          </Link>
        }
      />

      <CapsuleTabs
        label="Which posts to show"
        value={range}
        onChange={setRange}
        options={[
          { value: "upcoming" as const, label: "Upcoming" },
          { value: "past" as const, label: "Last 30 days" },
        ]}
      />

      {jobs.isError ? (
        <ErrorState message={apiErrorMessage(jobs.error, "Could not load the calendar.")} onRetry={() => void jobs.refetch()} />
      ) : jobs.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : days.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title={range === "upcoming" ? "Nothing scheduled" : "Nothing posted in the last 30 days"}
          description="Approve a video in the Studio, then press Post to send it to your pages."
        />
      ) : (
        <div className="space-y-6">
          {days.map(([day, rows]) => (
            <section key={day} aria-label={day} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">{day}</h2>
              <GlassPanel bodyClassName="divide-y divide-border p-0">
                {rows.map((j) => (
                  <JobRow key={j.id} job={j} account={names.get(j.connected_account_id)} />
                ))}
              </GlassPanel>
            </section>
          ))}
          {jobs.hasNextPage && (
            <Button variant="outline" disabled={jobs.isFetchingNextPage} onClick={() => void jobs.fetchNextPage()}>
              {jobs.isFetchingNextPage ? "Loading..." : "Show more"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function JobRow({ job: j, account }: { job: PublishJob; account?: string }) {
  const cancel = useCancelPost();
  const retry = useRetryPost();
  const [confirm, setConfirm] = useState(false);
  const canCancel = j.status === "pending" || j.status === "uploading";
  return (
    <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium tabular">{timeFmt.format(new Date(j.planned_at))}</span>
          <span className="text-sm">{PLATFORM_LABEL[j.platform]}</span>
          {account && <span className="truncate text-sm text-muted-foreground">{account}</span>}
          <ToneBadge tone={TONE[j.status]}>{JOB_STATUS_LABEL[j.status]}</ToneBadge>
        </div>
        {j.caption && <p className="line-clamp-2 text-sm text-muted-foreground">{j.caption}</p>}
        {j.status === "failed" && j.error && (
          <p role="status" className="text-sm text-destructive">
            {j.error}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        {j.status === "published" && j.permalink && (
          <a href={j.permalink} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ExternalLink /> View
          </a>
        )}
        {j.status === "failed" && (
          <Button variant="outline" size="sm" disabled={retry.isPending} onClick={() => retry.mutate(j.id)}>
            <RotateCcw /> Try again
          </Button>
        )}
        {canCancel && (
          <Button variant="ghost" size="sm" onClick={() => setConfirm(true)}>
            <X /> Cancel
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Cancel this post?"
        description="It will not be posted. You can post the video again from the Studio."
        confirmLabel="Cancel post"
        pending={cancel.isPending}
        onConfirm={() => cancel.mutate(j.id, { onSuccess: () => setConfirm(false) })}
      />
    </div>
  );
}
