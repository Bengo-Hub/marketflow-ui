"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Copy, MessageSquareQuote, Pencil, Plus, Share2, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { MediaImage } from "@/components/media-image";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog, EmptyState, ErrorState, Field, PageHeader, ToneBadge } from "@/components/ui-kit";
import { useAdminLocked } from "@/hooks/use-access";
import { useMoveTestimonial, useRemoveTestimonial, useReviewTestimonial, useSaveTestimonial, useTestimonials } from "@/hooks/use-testimonials";
import type { Testimonial } from "@/lib/api/testimonials";
import { testimonialLinkUrl } from "@/lib/urls";
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

/** A customer's or website testimonial keeps its author, words and rating as given. */
const wordsLocked = (t?: Testimonial) => !!t?.source && t.source !== "manual";

const SOURCE_LABEL: Record<string, string> = { form: "From your testimonial link", website: "Found on your website", manual: "Added by you" };

function TestimonialForm({ item, nextOrder, onDone }: { item?: Testimonial; nextOrder: number; onDone: () => void }) {
  const save = useSaveTestimonial();
  const locked = wordsLocked(item);
  const [form, setForm] = useState({
    author_name: item?.author_name ?? "",
    author_role: item?.author_role ?? "",
    body: item?.body ?? "",
    avatar_url: item?.avatar_url ?? "",
    rating: item?.rating ?? 5,
    is_published: item?.is_published ?? true,
  });
  const avatarBad = !!form.avatar_url.trim() && !/^https?:\/\/\S+$/i.test(form.avatar_url.trim());
  const submit = () => {
    // The customer's own words, name and rating are never sent back for a form or website testimonial.
    const { author_name, body, rating, ...rest } = form;
    const data = locked
      ? { author_role: rest.author_role, avatar_url: rest.avatar_url, is_published: item?.status === "approved" ? rest.is_published : undefined }
      : { ...rest, rating, author_name: author_name.trim(), body: body.trim(), ...(item ? {} : { display_order: nextOrder }) };
    save.mutate({ id: item?.id, data }, { onSuccess: onDone });
  };
  return (
    <>
      {locked && (
        <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
          This testimonial is shown exactly as {item?.source === "website" ? "your website shows it" : "the customer wrote it"}. You can change who they are, the photo and the order, never their words.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required htmlFor="t-n"><Input id="t-n" maxLength={120} disabled={locked} value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} /></Field>
        <Field label="Who they are" htmlFor="t-r" hint="For example: customer since 2023"><Input id="t-r" maxLength={120} value={form.author_role} onChange={(e) => setForm({ ...form, author_role: e.target.value })} /></Field>
        <Field label="What they said" required htmlFor="t-b" className="sm:col-span-2">
          <Textarea id="t-b" rows={4} maxLength={2000} disabled={locked} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </Field>
        <Field label="Photo link" htmlFor="t-a" error={avatarBad ? "Use a link that starts with https://" : undefined} className="sm:col-span-2">
          <Input id="t-a" type="url" inputMode="url" placeholder="https://" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
        </Field>
        <Field label="Rating"><Stars value={form.rating} onChange={locked ? undefined : (rating) => setForm({ ...form, rating })} /></Field>
        {(!locked || item?.status === "approved") && (
          <label className="flex items-center gap-3 self-end pb-2 text-sm">
            <Switch checked={form.is_published} onCheckedChange={(v: boolean) => setForm({ ...form, is_published: v })} />
            Show on my public page
          </label>
        )}
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

/** The business's testimonial link, to share with customers (also {{testimonial_link}} in sequences). */
function ShareLink({ slug }: { slug: string }) {
  const url = testimonialLinkUrl(slug);
  const copy = () => void navigator.clipboard.writeText(url).then(() => toast.success("Link copied"), () => toast.error("Could not copy the link"));
  const wa = `https://wa.me/?text=${encodeURIComponent(`We'd love to hear how we did. Share your experience here: ${url}`)}`;
  return (
    <div className="glass flex flex-wrap items-center gap-3 rounded-[1.25rem] p-4 sm:p-5">
      <div className="min-w-0 flex-1">
        <p className="font-medium">Ask customers for a testimonial</p>
        <p className="truncate text-sm text-muted-foreground">{url}</p>
        <p className="mt-1 text-xs text-muted-foreground">What they send waits here for your approval. In a sequence step, write {"{{testimonial_link}}"}.</p>
      </div>
      <Button variant="outline" size="sm" onClick={copy}><Copy /> Copy link</Button>
      <a href={wa} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}><Share2 /> Share on WhatsApp</a>
    </div>
  );
}

function ReviewBadge({ t }: { t: Testimonial }) {
  if (t.status === "pending") return <ToneBadge tone="warning">Waiting for review</ToneBadge>;
  if (t.status === "rejected") return <ToneBadge tone="danger">Declined</ToneBadge>;
  return t.is_published ? <ToneBadge tone="success">Shown</ToneBadge> : <ToneBadge>Hidden</ToneBadge>;
}

export default function TestimonialsSettingsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const search = useSearchParams();
  const reviewId = search.get("review");
  const list = useTestimonials();
  const save = useSaveTestimonial();
  const move = useMoveTestimonial();
  const remove = useRemoveTestimonial();
  const review = useReviewTestimonial();
  const locked = useAdminLocked();
  const [editing, setEditing] = useState<{ item?: Testimonial } | null>(null);
  const [deleting, setDeleting] = useState<Testimonial | null>(null);
  const [view, setView] = useState<"all" | "pending">(search.get("status") === "pending" || reviewId ? "pending" : "all");
  const all = list.data?.data ?? [];
  const pending = all.filter((t) => t.status === "pending");
  const rows = view === "pending" ? pending : all;
  const shown = all.filter((t) => t.is_published).length;
  const nextOrder = (all.reduce((m, t) => Math.max(m, t.display_order), 0) || 0) + 10;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<MessageSquareQuote />}
        title="Testimonials"
        description={all.length ? `${shown} of ${all.length} shown on your public page, in this order.` : "Customer stories shown on your public page."}
        actions={<Button onClick={() => setEditing({})}><Plus /> Add testimonial</Button>}
      />
      {orgSlug && <ShareLink slug={orgSlug} />}
      {all.length > 0 && (
        <div className="flex gap-2" role="tablist" aria-label="Which testimonials">
          <Button role="tab" aria-selected={view === "all"} variant={view === "all" ? "default" : "outline"} size="sm" onClick={() => setView("all")}>All ({all.length})</Button>
          <Button role="tab" aria-selected={view === "pending"} variant={view === "pending" ? "default" : "outline"} size="sm" onClick={() => setView("pending")}>Waiting for review ({pending.length})</Button>
        </div>
      )}
      {list.isError && <ErrorState message="Could not load testimonials." onRetry={() => void list.refetch()} />}
      {list.isLoading && <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="glass h-32 animate-pulse rounded-[1.25rem]" />)}</div>}
      {!list.isLoading && !list.isError && rows.length === 0 && (
        <div className="glass rounded-[1.25rem]">
          <EmptyState icon={<MessageSquareQuote />} title="No testimonials yet" description="A few words from a happy customer help visitors trust you. Ask for permission before you add one." action={<Button onClick={() => setEditing({})}><Plus /> Add the first one</Button>} />
        </div>
      )}

      <ol className="space-y-3">
        {rows.map((t, i) => (
          <li key={t.id} id={`t-${t.id}`} className={cn("glass flex gap-4 rounded-[1.25rem] p-4 sm:p-5", !t.is_published && t.status !== "pending" && "opacity-70", t.id === reviewId && "ring-2 ring-primary")}>
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
                {t.rating > 0 ? <Stars value={t.rating} /> : <span className="text-xs text-muted-foreground">No rating given</span>}
              </div>
              <blockquote className={cn("mt-3 text-sm leading-relaxed text-foreground/90", t.status !== "pending" && "line-clamp-4")}>{t.body}</blockquote>
              {t.media_url && (
                t.media_kind === "video" ? (
                  <video src={t.media_url} controls preload="metadata" className="mt-3 max-h-64 rounded-xl" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- a signed, short-lived link
                  <img src={t.media_url} alt={`Photo from ${t.author_name}`} className="mt-3 max-h-64 rounded-xl object-cover" />
                )
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {SOURCE_LABEL[t.source ?? "manual"]}
                {t.source === "website" && t.source_url && <> at <a href={t.source_url} target="_blank" rel="noreferrer" className="underline">{t.source_url}</a></>}
                {t.source === "form" && t.consent && " with the customer's consent to publish"}
                {t.submitter_email && <> · {t.submitter_email}</>}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {t.status === "pending" || t.status === "rejected" ? (
                  <div className="mr-auto flex flex-wrap items-center gap-2">
                    <ReviewBadge t={t} />
                    {/* Reviewing a customer's words is an admin's call. */}
                    <Button size="sm" disabled={locked || review.isPending} onClick={() => review.mutate({ id: t.id, approve: true })}><Check /> Approve and show</Button>
                    {t.status === "pending" && (
                      <Button size="sm" variant="outline" disabled={locked || review.isPending} onClick={() => review.mutate({ id: t.id, approve: false })}><X /> Decline</Button>
                    )}
                  </div>
                ) : (
                  <label className="mr-auto flex items-center gap-2 text-sm">
                    <Switch checked={t.is_published} disabled={save.isPending} onCheckedChange={(v: boolean) => save.mutate({ id: t.id, data: { is_published: v } })} aria-label={`Show ${t.author_name} on the public page`} />
                    <ReviewBadge t={t} />
                  </label>
                )}
                <Button variant="ghost" size="sm" onClick={() => setEditing({ item: t })}><Pencil /> Edit</Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${t.author_name}`} onClick={() => setDeleting(t)}><Trash2 className="text-destructive" /></Button>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
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
