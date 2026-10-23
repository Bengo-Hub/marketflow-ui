"use client";

import { useState } from "react";
import { BarChart3, Copy, ExternalLink, Globe, MoreHorizontal, Pencil, Plus, Rocket, Undo2, Archive } from "lucide-react";
import { toast } from "sonner";
import { FeatureLock, useFeature } from "@bengo-hub/shared-ui-lib/subscription";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_FORM, StepBuilder } from "@/components/funnels/step-builder";
import { CapsuleTabs, ConfirmDialog, EmptyState, ErrorState, Field, Pager, PageHeader, StatusBadge, ToneBadge, humanize } from "@/components/ui-kit";
import { useFunnelAction, useFunnelAnalytics, useFunnels, useSaveFunnel } from "@/hooks/use-funnels";
import { useTenantProfile } from "@/hooks/use-tenant-profile";
import { FUNNEL_STATUSES, FUNNEL_TYPES, slugify, type Funnel, type FunnelInput } from "@/lib/api/funnels";
import { funnelUrl } from "@/lib/urls";

type Tab = "page" | "blocks" | "html";
const empty: FunnelInput = { name: "", slug: "", funnel_type: "generic", steps: [DEFAULT_FORM], metadata: {} };

function FunnelEditor({ initial, id, isFLP, onDone }: { initial: FunnelInput; id?: string; isFLP: boolean; onDone: () => void }) {
  const save = useSaveFunnel();
  const [f, setF] = useState<FunnelInput>(initial);
  const [tab, setTab] = useState<Tab>("page");
  const [slugEdited, setSlugEdited] = useState(!!id);
  const meta = f.metadata ?? {};
  const setMeta = (patch: Record<string, string | undefined>) => setF({ ...f, metadata: { ...meta, ...patch } });
  const slugOk = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug) && f.slug.length <= 60;
  const formOk = (f.steps ?? []).every((s) => s.block_type !== "form" || (s.fields ?? []).some((x) => x.key === "phone" || x.key === "email"));

  return (
    <>
      <CapsuleTabs<Tab>
        label="Editor section"
        value={tab}
        onChange={setTab}
        options={[{ value: "page", label: "Page" }, { value: "blocks", label: `Blocks (${f.steps?.length ?? 0})` }, { value: "html", label: "Custom HTML" }]}
      />
      <div className="max-h-[60vh] overflow-y-auto pr-1">
        {tab === "page" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required htmlFor="fn-name" hint="Only you see this.">
              <Input
                id="fn-name"
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value, ...(slugEdited ? {} : { slug: slugify(e.target.value) }) })}
              />
            </Field>
            <Field label="Link" required htmlFor="fn-slug" error={f.slug && !slugOk ? "Lowercase letters, numbers and dashes only" : null} hint={f.slug ? funnelUrl(f.slug) : undefined}>
              <Input id="fn-slug" value={f.slug} onChange={(e) => { setSlugEdited(true); setF({ ...f, slug: e.target.value.toLowerCase() }); }} />
            </Field>
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-sm font-medium">Type</p>
              <CapsuleTabs label="Funnel type" value={f.funnel_type ?? "generic"} onChange={(v) => setF({ ...f, funnel_type: v })} options={FUNNEL_TYPES.filter((t) => isFLP || t === "generic" || t === "product_inquiry").map((t) => ({ value: t, label: t === "c9_challenge" ? "C9 challenge" : humanize(t) }))} />
            </div>
            <Field label="Headline" className="sm:col-span-2" htmlFor="fn-h">
              <Input id="fn-h" value={(meta.headline as string) ?? ""} onChange={(e) => setMeta({ headline: e.target.value || undefined })} />
            </Field>
            <Field label="Subheadline" className="sm:col-span-2" htmlFor="fn-sh">
              <Textarea id="fn-sh" rows={2} value={(meta.subheadline as string) ?? ""} onChange={(e) => setMeta({ subheadline: e.target.value || undefined })} />
            </Field>
            <Field label="Top image link" htmlFor="fn-hero" hint="A wide photo, https only.">
              <Input id="fn-hero" inputMode="url" value={(meta.hero_image_url as string) ?? ""} onChange={(e) => setMeta({ hero_image_url: e.target.value || undefined })} />
            </Field>
            <Field label="Page colour" htmlFor="fn-color" hint="Leave as is to use your account colour.">
              <input
                id="fn-color"
                type="color"
                value={/^#[0-9a-f]{6}$/i.test((meta.brand_color as string) ?? "") ? (meta.brand_color as string) : "#9100b0"}
                onChange={(e) => setMeta({ brand_color: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-xl border border-input bg-background p-1"
              />
            </Field>
          </div>
        )}
        {tab === "blocks" && <StepBuilder steps={f.steps ?? []} onChange={(steps) => setF({ ...f, steps })} isFLP={isFLP} />}
        {tab === "html" && (
          <Field label="Custom HTML" hint="Replaces the blocks with your own layout. Scripts, forms and frames are removed when saved; the lead form and chat are added for you." htmlFor="fn-html">
            <Textarea id="fn-html" rows={14} className="font-mono text-xs" value={f.landing_page_html ?? ""} onChange={(e) => setF({ ...f, landing_page_html: e.target.value })} />
          </Field>
        )}
      </div>
      <DialogFooter>
        {!formOk && <p className="mr-auto text-sm text-destructive">Each lead form needs a phone or email question.</p>}
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button
          disabled={!f.name.trim() || !slugOk || !formOk || save.isPending}
          onClick={() => save.mutate({ id, data: { ...f, name: f.name.trim() } }, { onSuccess: onDone })}
        >
          {save.isPending ? "Saving..." : id ? "Save funnel" : "Create funnel"}
        </Button>
      </DialogFooter>
    </>
  );
}

function AnalyticsView({ funnel }: { funnel: Funnel }) {
  const q = useFunnelAnalytics(funnel.id);
  const steps = q.data?.steps ?? [];
  const first = steps[0]?.views ?? 0;
  return (
    <div className="space-y-4">
      {q.isError && <ErrorState onRetry={() => void q.refetch()} />}
      {q.isLoading && <div className="h-40 animate-pulse rounded-xl bg-muted" />}
      {q.data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border p-4"><p className="text-xs text-muted-foreground">People who saw it</p><p className="font-display text-2xl font-semibold tabular">{first.toLocaleString()}</p></div>
            <div className="rounded-2xl border border-border p-4"><p className="text-xs text-muted-foreground">Leads from it</p><p className="font-display text-2xl font-semibold tabular">{q.data.lead_submissions.toLocaleString()}</p></div>
          </div>
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No views recorded yet. Views count once the page is published and opened.</p>
          ) : (
            <ol className="space-y-2">
              {steps.map((s) => {
                const pct = first > 0 ? Math.round((s.views / first) * 100) : 0;
                const block = funnel.steps?.[s.step_index];
                return (
                  <li key={s.step_index}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="truncate">{s.step_index + 1}. {block?.title || humanize(block?.block_type ?? "block")}</span>
                      <span className="shrink-0 tabular text-muted-foreground">{s.views.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div className="h-full rounded-full bg-[hsl(var(--chart-1))]" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

export default function FunnelsPage() {
  const hasFunnels = useFeature("funnel_builder");
  const profile = useTenantProfile();
  const isFLP = profile.data?.business_type === "flp";
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ id?: string; data: FunnelInput } | null>(null);
  const [stats, setStats] = useState<Funnel | null>(null);
  const [archiving, setArchiving] = useState<Funnel | null>(null);
  const list = useFunnels(status, page);
  const action = useFunnelAction();
  const rows = list.data?.data ?? [];

  const copy = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(funnelUrl(slug));
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };
  const newBtn = <Button onClick={() => setEditing({ data: empty })}><Plus /> New funnel</Button>;

  return (
    <div className="space-y-6">
      <PageHeader icon={<Globe />} title="Funnels" description="Landing pages that turn ad clicks and shared links into leads." actions={hasFunnels ? newBtn : <FeatureLock feature="funnel_builder" mode="block">{newBtn}</FeatureLock>} />
      <CapsuleTabs label="Filter by status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "all", label: "All" }, ...FUNNEL_STATUSES.map((s) => ({ value: s, label: humanize(s) }))]} />

      <div className="glass overflow-hidden rounded-[1.25rem]">
        {list.isError && <ErrorState message="Could not load funnels." onRetry={() => void list.refetch()} />}
        {list.isLoading && <div className="space-y-2 p-4" aria-busy>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>}
        {!list.isLoading && !list.isError && rows.length === 0 && (
          <EmptyState icon={<Globe />} title="No funnels yet" description="Create a page with a lead form, a WhatsApp button or a booking calendar, then share its link." action={hasFunnels ? newBtn : undefined} />
        )}
        {rows.length > 0 && (
          <ul className="divide-y divide-border">
            {rows.map((fn) => (
              <li key={fn.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{fn.name}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={fn.status} />
                    <ToneBadge>{humanize(fn.funnel_type)}</ToneBadge>
                    {fn.landing_page_html ? <ToneBadge tone="info">Custom HTML</ToneBadge> : <span className="text-xs text-muted-foreground">{fn.steps?.length ?? 0} blocks</span>}
                    <span className="truncate text-xs text-muted-foreground">/f/{fn.slug}</span>
                  </div>
                </div>
                {fn.status === "draft" && (
                  <Button size="sm" className="hidden sm:inline-flex" disabled={action.isPending} onClick={() => action.mutate({ id: fn.id, action: "publish" })}>
                    <Rocket /> Publish
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger aria-label={`Actions for ${fn.name}`} className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-accent">
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing({ id: fn.id, data: { name: fn.name, slug: fn.slug, funnel_type: fn.funnel_type, steps: fn.steps ?? [], landing_page_html: fn.landing_page_html ?? "", metadata: fn.metadata ?? {} } })}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStats(fn)}><BarChart3 className="mr-2 h-4 w-4" /> Results</DropdownMenuItem>
                    {fn.status === "draft" && <DropdownMenuItem onClick={() => action.mutate({ id: fn.id, action: "publish" })}><Rocket className="mr-2 h-4 w-4" /> Publish</DropdownMenuItem>}
                    {fn.status === "published" && (
                      <>
                        <DropdownMenuItem onClick={() => window.open(funnelUrl(fn.slug), "_blank")}><ExternalLink className="mr-2 h-4 w-4" /> Open page</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void copy(fn.slug)}><Copy className="mr-2 h-4 w-4" /> Copy link</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => action.mutate({ id: fn.id, action: "unpublish" })}><Undo2 className="mr-2 h-4 w-4" /> Take offline</DropdownMenuItem>
                      </>
                    )}
                    {fn.status !== "archived" && <DropdownMenuItem className="text-destructive" onClick={() => setArchiving(fn)}><Archive className="mr-2 h-4 w-4" /> Archive</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        )}
        {list.data && <div className="px-4 pb-4"><Pager page={page} limit={list.data.limit || 20} total={list.data.total} onPage={setPage} /></div>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit funnel" : "New funnel"}</DialogTitle></DialogHeader>
          {editing && <FunnelEditor key={editing.id ?? "new"} initial={editing.data} id={editing.id} isFLP={isFLP} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!stats} onOpenChange={(o) => !o && setStats(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Results: {stats?.name}</DialogTitle></DialogHeader>
          {stats && <AnalyticsView funnel={stats} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(null)}
        title={`Archive "${archiving?.name}"?`}
        description="The page goes offline and the funnel moves to Archived. Its leads stay."
        confirmLabel="Archive funnel"
        pending={action.isPending}
        onConfirm={() => archiving && action.mutate({ id: archiving.id, action: "archive" }, { onSuccess: () => setArchiving(null) })}
      />
    </div>
  );
}
