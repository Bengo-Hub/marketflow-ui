"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Megaphone, MoreHorizontal, Pause, Pencil, Play, Plus, Square } from "lucide-react";
import { FeatureLock, useAnyFeature } from "@bengo-hub/shared-ui-lib/subscription";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { CapsuleTabs, ConfirmDialog, EmptyState, ErrorState, Field, Pager, PageHeader, StatusBadge, ToneBadge, humanize } from "@/components/ui-kit";
import { useCampaignAction, useCampaigns, useSaveCampaign } from "@/hooks/use-campaigns";
import {
  CAMPAIGN_CHANNELS, CAMPAIGN_PLATFORMS, CAMPAIGN_STATUSES, CAMPAIGN_TYPES, formatMoney, type Campaign, type CampaignInput,
} from "@/lib/api/campaigns";

const empty: CampaignInput = { name: "", campaign_type: "lead_gen", platform: "meta", channel: "whatsapp", currency: "KES" };
const label = (v: string) => (v === "sms" ? "SMS" : v === "lead_gen" ? "Lead generation" : v === "re_engagement" ? "Re-engagement" : humanize(v));

function CampaignForm({ initial, id, onDone }: { initial: CampaignInput; id?: string; onDone: () => void }) {
  const save = useSaveCampaign();
  const [f, setF] = useState<CampaignInput>(initial);
  const num = (v: string) => (v === "" ? undefined : Math.max(0, Number(v)));
  const datesBad = !!(f.start_date && f.end_date && f.end_date < f.start_date);
  return (
    <>
      <div className="space-y-4">
        <Field label="Name" required htmlFor="cf-name">
          <Input id="cf-name" value={f.name} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-medium">Goal</p>
          <CapsuleTabs label="Campaign goal" value={f.campaign_type ?? "lead_gen"} onChange={(v) => setF({ ...f, campaign_type: v })} options={CAMPAIGN_TYPES.map((t) => ({ value: t, label: label(t) }))} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-sm font-medium">Ads run on</p>
            <CapsuleTabs label="Platform" value={f.platform ?? "meta"} onChange={(v) => setF({ ...f, platform: v })} options={CAMPAIGN_PLATFORMS.map((p) => ({ value: p, label: p === "manual" ? "No ads" : humanize(p) }))} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Follow up by</p>
            <CapsuleTabs label="Channel" value={f.channel ?? "whatsapp"} onChange={(v) => setF({ ...f, channel: v })} options={CAMPAIGN_CHANNELS.map((c) => ({ value: c, label: label(c) }))} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Daily budget" htmlFor="cf-bd">
            <Input id="cf-bd" type="number" inputMode="decimal" min={0} value={f.budget_daily ?? ""} onChange={(e) => setF({ ...f, budget_daily: num(e.target.value) })} />
          </Field>
          <Field label="Total budget" htmlFor="cf-bt">
            <Input id="cf-bt" type="number" inputMode="decimal" min={0} value={f.budget_total ?? ""} onChange={(e) => setF({ ...f, budget_total: num(e.target.value) })} />
          </Field>
          <Field label="Currency" htmlFor="cf-cur">
            <Input id="cf-cur" maxLength={3} value={f.currency ?? ""} onChange={(e) => setF({ ...f, currency: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Starts" htmlFor="cf-sd">
            <Input id="cf-sd" type="date" value={f.start_date?.slice(0, 10) ?? ""} onChange={(e) => setF({ ...f, start_date: e.target.value || undefined })} />
          </Field>
          <Field label="Ends" htmlFor="cf-ed" error={datesBad ? "Ends before it starts" : null}>
            <Input id="cf-ed" type="date" value={f.end_date?.slice(0, 10) ?? ""} onChange={(e) => setF({ ...f, end_date: e.target.value || undefined })} />
          </Field>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button
          disabled={!f.name.trim() || datesBad || save.isPending}
          onClick={() =>
            save.mutate(
              {
                id,
                data: {
                  ...f,
                  name: f.name.trim(),
                  // The API takes RFC 3339 times.
                  start_date: f.start_date ? new Date(`${f.start_date.slice(0, 10)}T00:00:00`).toISOString() : undefined,
                  end_date: f.end_date ? new Date(`${f.end_date.slice(0, 10)}T23:59:59`).toISOString() : undefined,
                },
              },
              { onSuccess: onDone },
            )
          }
        >
          {save.isPending ? "Saving..." : id ? "Save campaign" : "Create campaign"}
        </Button>
      </DialogFooter>
    </>
  );
}

export default function CampaignsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const canCreate = useAnyFeature("basic_campaigns", "unlimited_campaigns");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ id?: string; data: CampaignInput } | null>(null);
  const [ending, setEnding] = useState<Campaign | null>(null);
  const list = useCampaigns(status, page);
  const action = useCampaignAction();
  const rows = list.data?.data ?? [];
  const counts = list.data?.lead_counts ?? {};

  const newButton = (
    <Button onClick={() => setEditing({ data: empty })}>
      <Plus />
      New campaign
    </Button>
  );
  const menu = (c: Campaign) => (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Actions for ${c.name}`} className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-accent">
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() =>
            setEditing({
              id: c.id,
              data: {
                name: c.name, campaign_type: c.campaign_type, platform: c.platform, channel: c.channel,
                budget_daily: c.budget_daily ?? undefined, budget_total: c.budget_total ?? undefined, currency: c.currency ?? "KES",
                start_date: c.start_date ?? undefined, end_date: c.end_date ?? undefined,
              },
            })
          }
        >
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </DropdownMenuItem>
        {c.status === "active" && (
          <DropdownMenuItem onClick={() => action.mutate({ id: c.id, action: "pause" })}>
            <Pause className="mr-2 h-4 w-4" /> Pause
          </DropdownMenuItem>
        )}
        {(c.status === "paused" || c.status === "draft") && (
          <DropdownMenuItem onClick={() => action.mutate({ id: c.id, action: "resume" })}>
            <Play className="mr-2 h-4 w-4" /> {c.status === "draft" ? "Start" : "Resume"}
          </DropdownMenuItem>
        )}
        {c.status !== "completed" && (
          <DropdownMenuItem className="text-destructive" onClick={() => setEnding(c)}>
            <Square className="mr-2 h-4 w-4" /> End campaign
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Megaphone />}
        title="Campaigns"
        description="Ad campaigns and the leads they bring in."
        actions={canCreate ? newButton : <FeatureLock feature="basic_campaigns" mode="block">{newButton}</FeatureLock>}
      />
      <CapsuleTabs
        label="Filter by status"
        value={status}
        onChange={(v) => { setStatus(v); setPage(1); }}
        options={[{ value: "all", label: "All" }, ...CAMPAIGN_STATUSES.map((s) => ({ value: s, label: humanize(s) }))]}
      />

      <div className="glass overflow-hidden rounded-[1.25rem]">
        {list.isError && <ErrorState message="Could not load campaigns." onRetry={() => void list.refetch()} />}
        {list.isLoading && <div className="space-y-2 p-4" aria-busy>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>}
        {!list.isLoading && !list.isError && rows.length === 0 && (
          <EmptyState icon={<Megaphone />} title={status === "all" ? "No campaigns yet" : `No ${humanize(status).toLowerCase()} campaigns`} description="Create a campaign to track the leads and spend of your ads." />
        )}
        {rows.length > 0 && (
          <ul className="divide-y divide-border">
            {rows.map((c) => (
              <li key={c.id} className="flex items-center gap-3 p-4 hover:bg-accent/30">
                <Link href={`/${orgSlug}/campaigns/${c.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium hover:text-primary">{c.name}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={c.status} />
                    <ToneBadge>{c.platform === "manual" ? "No ads" : humanize(c.platform)}</ToneBadge>
                    {c.channel && <ToneBadge tone="info">{label(c.channel)}</ToneBadge>}
                    {c.budget_daily ? <span className="text-xs text-muted-foreground">{formatMoney(c.budget_daily, c.currency)} a day</span> : null}
                  </div>
                </Link>
                <div className="text-right">
                  <p className="font-display text-lg font-semibold tabular">{(counts[c.id] ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">leads</p>
                </div>
                {menu(c)}
              </li>
            ))}
          </ul>
        )}
        {list.data && <div className="px-4 pb-4"><Pager page={page} limit={list.data.limit || 20} total={list.data.total} onPage={setPage} /></div>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit campaign" : "New campaign"}</DialogTitle>
          </DialogHeader>
          {editing && <CampaignForm key={editing.id ?? "new"} initial={editing.data} id={editing.id} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!ending}
        onOpenChange={(o) => !o && setEnding(null)}
        title={`End "${ending?.name}"?`}
        description="The campaign is marked completed and stops counting as active. Its leads and results stay."
        confirmLabel="End campaign"
        pending={action.isPending}
        onConfirm={() => ending && action.mutate({ id: ending.id, action: "end" }, { onSuccess: () => setEnding(null) })}
      />
    </div>
  );
}
