"use client";

import { useState } from "react";
import { Copy, ExternalLink, Link2, MousePointerClick, Plus } from "lucide-react";
import { toast } from "sonner";
import { FeatureLock, useFeature } from "@bengo-hub/shared-ui-lib/subscription";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CapsuleTabs, EmptyState, ErrorState, Field, Pager, PageHeader, ToneBadge, humanize } from "@/components/ui-kit";
import { useCreateShortLink, useShortLinks } from "@/hooks/use-short-links";
import { LINK_TYPES } from "@/lib/api/short-links";

const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" });

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Link copied");
  } catch {
    toast.error("Could not copy the link");
  }
}

function NewLinkDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateShortLink();
  const [target, setTarget] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("custom");
  const [made, setMade] = useState<string | null>(null);
  const valid = /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(target.trim());
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{made ? "Your short link" : "New short link"}</DialogTitle></DialogHeader>
        {made ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background/70 p-3">
              <code className="min-w-0 flex-1 truncate text-sm">{made}</code>
              <Button size="sm" onClick={() => void copy(made)}><Copy /> Copy</Button>
            </div>
            <p className="text-sm text-muted-foreground">Every tap is counted here before the visitor goes on to the page.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Where it goes" required htmlFor="sl-t" error={target && !valid ? "Use a full link starting with https://" : null}>
              <Input id="sl-t" inputMode="url" placeholder="https://..." value={target} onChange={(e) => setTarget(e.target.value)} />
            </Field>
            <Field label="Name" htmlFor="sl-n" hint="Only you see this, to tell links apart.">
              <Input id="sl-n" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-medium">Kind of link</p>
              <CapsuleTabs label="Link type" value={type} onChange={setType} options={LINK_TYPES.map((t) => ({ value: t, label: t === "custom" ? "Other" : humanize(t) }))} />
            </div>
          </div>
        )}
        <DialogFooter>
          {made ? (
            <Button onClick={onClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                disabled={!valid || create.isPending}
                onClick={() => create.mutate({ target_url: target.trim(), title: title.trim() || undefined, link_type: type }, { onSuccess: (r) => setMade(r.short_url) })}
              >
                {create.isPending ? "Creating..." : "Create link"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ShortLinksPage() {
  const has = useFeature("shortlinks");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const list = useShortLinks(page, type);
  const rows = list.data?.data ?? [];
  const newBtn = <Button onClick={() => setCreating(true)}><Plus /> New link</Button>;

  return (
    <div className="space-y-6">
      <PageHeader icon={<Link2 />} title="Short links" description="Short, trackable links for your bio, status updates and ads." actions={has ? newBtn : <FeatureLock feature="shortlinks" mode="block">{newBtn}</FeatureLock>} />
      <CapsuleTabs label="Filter by kind" value={type} onChange={(v) => { setType(v); setPage(1); }} options={[{ value: "all", label: "All" }, ...LINK_TYPES.map((t) => ({ value: t, label: t === "custom" ? "Other" : humanize(t) }))]} />

      <div className="glass overflow-hidden rounded-[1.25rem]">
        {list.isError && <ErrorState message="Could not load your links." onRetry={() => void list.refetch()} />}
        {list.isLoading && <div className="space-y-2 p-4" aria-busy>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div>}
        {!list.isLoading && !list.isError && rows.length === 0 && <EmptyState icon={<Link2 />} title="No short links yet" description="Make one for a product, your public page or a funnel, and see how many people tap it." action={has ? newBtn : undefined} />}
        {rows.length > 0 && (
          <ul className="divide-y divide-border">
            {rows.map((l) => (
              <li key={l.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{l.title || l.short_url.replace(/^https?:\/\//, "")}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.target_url}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <ToneBadge>{l.link_type === "custom" ? "Other" : humanize(l.link_type)}</ToneBadge>
                    <span className="text-xs text-muted-foreground">Made {when.format(new Date(l.created_at))}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="flex items-center justify-end gap-1 font-display text-lg font-semibold tabular"><MousePointerClick className="h-4 w-4 text-primary" />{l.click_count.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{l.last_clicked_at ? `last ${when.format(new Date(l.last_clicked_at))}` : "no taps yet"}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label="Copy link" onClick={() => void copy(l.short_url)}><Copy /></Button>
                  <a href={l.target_url} target="_blank" rel="noreferrer" aria-label="Open where it goes" className="hidden h-10 w-10 items-center justify-center rounded-xl hover:bg-accent sm:inline-flex"><ExternalLink className="h-4 w-4" /></a>
                </div>
              </li>
            ))}
          </ul>
        )}
        {list.data && <div className="px-4 pb-4"><Pager page={page} limit={list.data.limit || 25} total={list.data.total} onPage={setPage} /></div>}
      </div>
      {creating && <NewLinkDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
