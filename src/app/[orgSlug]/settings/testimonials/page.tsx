"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, MessageSquareQuote, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { MediaImage } from "@/components/media-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog, EmptyState, ErrorState, Field, PageHeader, ToneBadge } from "@/components/ui-kit";
import { useMoveTestimonial, useRemoveTestimonial, useSaveTestimonial, useTestimonials } from "@/hooks/use-testimonials";
import type { Testimonial } from "@/lib/api/testimonials";
import { cn } from "@/lib/utils";

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5" role={onChange ? "radiogroup" : "img"} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const star = <Star className={cn("size-4", n <= value ? "fill-warning text-warning" : "text-muted-foreground/40")} />;
        return onChange ? (
          <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={`${n} star${n > 1 ? "s" : ""}`} className="grid size-9 place-items-center rounded-lg hover:bg-accent" onClick={() => onChange(n)}>
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
}

function TestimonialForm({ item, nextOrder, onDone }: { item?: Testimonial; nextOrder: number; onDone: () => void }) {
  const save = useSaveTestimonial();
  const [form, setForm] = useState({
    author_name: item?.author_name ?? "",
    author_role: item?.author_role ?? "",
    body: item?.body ?? "",
    avatar_url: item?.avatar_url ?? "",
    rating: item?.rating ?? 5,
    is_published: item?.is_published ?? true,
  });
  const avatarBad = !!form.avatar_url.trim() && !/^https?:\/\/\S+$/i.test(form.avatar_url.trim());
  const submit = () =>
    save.mutate(
      { id: item?.id, data: { ...form, author_name: form.author_name.trim(), body: form.body.trim(), ...(item ? {} : { display_order: nextOrder }) } },
      { onSuccess: onDone },
    );
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required htmlFor="t-n"><Input id="t-n" maxLength={120} value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} /></Field>
        <Field label="Who they are" htmlFor="t-r" hint="For example: customer since 2023"><Input id="t-r" maxLength={120} value={form.author_role} onChange={(e) => setForm({ ...form, author_role: e.target.value })} /></Field>
        <Field label="What they said" required htmlFor="t-b" className="sm:col-span-2">
          <Textarea id="t-b" rows={4} maxLength={2000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </Field>
        <Field label="Photo link" htmlFor="t-a" error={avatarBad ? "Use a link that starts with https://" : undefined} className="sm:col-span-2">
          <Input id="t-a" type="url" inputMode="url" placeholder="https://" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
        </Field>
        <Field label="Rating"><Stars value={form.rating} onChange={(rating) => setForm({ ...form, rating })} /></Field>
        <label className="flex items-center gap-3 self-end pb-2 text-sm">
          <Switch checked={form.is_published} onCheckedChange={(v: boolean) => setForm({ ...form, is_published: v })} />
          Show on my public page
        </label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button disabled={!form.author_name.trim() || !form.body.trim() || avatarBad || save.isPending} onClick={submit}>
          {save.isPending ? "Saving..." : item ? "Save testimonial" : "Add testimonial"}
        </Button>
      </DialogFooter>
    </>
  );
}

export default function TestimonialsSettingsPage() {
  const list = useTestimonials();
  const save = useSaveTestimonial();
  const move = useMoveTestimonial();
  const remove = useRemoveTestimonial();
  const [editing, setEditing] = useState<{ item?: Testimonial } | null>(null);
  const [deleting, setDeleting] = useState<Testimonial | null>(null);
  const rows = list.data?.data ?? [];
  const shown = rows.filter((t) => t.is_published).length;
  const nextOrder = (rows.reduce((m, t) => Math.max(m, t.display_order), 0) || 0) + 10;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<MessageSquareQuote />}
        title="Testimonials"
        description={rows.length ? `${shown} of ${rows.length} shown on your public page, in this order.` : "Customer stories shown on your public page."}
        actions={<Button onClick={() => setEditing({})}><Plus /> Add testimonial</Button>}
      />
      {list.isError && <ErrorState message="Could not load testimonials." onRetry={() => void list.refetch()} />}
      {list.isLoading && <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="glass h-32 animate-pulse rounded-[1.25rem]" />)}</div>}
      {!list.isLoading && !list.isError && rows.length === 0 && (
        <div className="glass rounded-[1.25rem]">
          <EmptyState icon={<MessageSquareQuote />} title="No testimonials yet" description="A few words from a happy customer help visitors trust you. Ask for permission before you add one." action={<Button onClick={() => setEditing({})}><Plus /> Add the first one</Button>} />
        </div>
      )}

      <ol className="space-y-3">
        {rows.map((t, i) => (
          <li key={t.id} className={cn("glass flex gap-4 rounded-[1.25rem] p-4 sm:p-5", !t.is_published && "opacity-70")}>
            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="icon-sm" aria-label={`Move ${t.author_name} up`} disabled={i === 0 || move.isPending} onClick={() => move.mutate({ list: rows, index: i, dir: -1 })}><ArrowUp /></Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Move ${t.author_name} down`} disabled={i === rows.length - 1 || move.isPending} onClick={() => move.mutate({ list: rows, index: i, dir: 1 })}><ArrowDown /></Button>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  {t.avatar_url ? (
                    <MediaImage src={t.avatar_url} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">{t.author_name.slice(0, 1).toUpperCase()}</div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.author_name}</p>
                    {t.author_role && <p className="truncate text-xs text-muted-foreground">{t.author_role}</p>}
                  </div>
                </div>
                <Stars value={t.rating} />
              </div>
              <blockquote className="mt-3 line-clamp-4 text-sm leading-relaxed text-foreground/90">{t.body}</blockquote>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="mr-auto flex items-center gap-2 text-sm">
                  <Switch checked={t.is_published} disabled={save.isPending} onCheckedChange={(v: boolean) => save.mutate({ id: t.id, data: { is_published: v } })} aria-label={`Show ${t.author_name} on the public page`} />
                  {t.is_published ? <ToneBadge tone="success">Shown</ToneBadge> : <ToneBadge>Hidden</ToneBadge>}
                </label>
                <Button variant="ghost" size="sm" onClick={() => setEditing({ item: t })}><Pencil /> Edit</Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${t.author_name}`} onClick={() => setDeleting(t)}><Trash2 className="text-destructive" /></Button>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing?.item ? "Edit testimonial" : "Add a testimonial"}</DialogTitle></DialogHeader>
          {editing && <TestimonialForm key={editing.item?.id ?? "new"} item={editing.item} nextOrder={nextOrder} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete the testimonial from ${deleting?.author_name}?`}
        description="It comes off your public page straight away. To keep it but stop showing it, switch it off instead."
        confirmLabel="Delete testimonial"
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}
