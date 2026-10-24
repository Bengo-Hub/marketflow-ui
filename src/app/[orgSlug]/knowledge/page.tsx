"use client";

import { useRef, useState } from "react";
import { BookOpen, CheckCircle2, FileUp, Loader2, Lock, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useTenantBranding } from "@bengo-hub/shared-ui-lib/tenant";
import { FeatureLock, useFeature } from "@bengo-hub/shared-ui-lib/subscription";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CapsuleTabs, ConfirmDialog, EmptyState, ErrorState, Field, Pager, PageHeader, ToneBadge, humanize } from "@/components/ui-kit";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDeleteKnowledge, useImportKnowledge, useKnowledge, useSaveKnowledge } from "@/hooks/use-knowledge";
import { KB_CATEGORIES, type KbEntry, type KbInput } from "@/lib/api/knowledge";

const label = (c: string) => (c === "faq" ? "Questions" : c === "business_opportunity" ? "Opportunity" : c === "custom" ? "Other" : humanize(c));

function EntryForm({ initial, id, onDone }: { initial: KbInput; id?: string; onDone: () => void }) {
  const save = useSaveKnowledge();
  const [f, setF] = useState<KbInput>(initial);
  const [tags, setTags] = useState((initial.tags ?? []).join(", "));
  const num = (v: string) => (v === "" ? undefined : Number(v));
  return (
    <>
      <div className="max-h-[62vh] space-y-4 overflow-y-auto pr-1">
        <div>
          <p className="mb-1.5 text-sm font-medium">Kind</p>
          <CapsuleTabs label="Category" value={f.category} onChange={(v) => setF({ ...f, category: v })} options={KB_CATEGORIES.map((c) => ({ value: c, label: label(c) }))} />
        </div>
        <Field label={f.category === "faq" ? "Question" : "Title"} required htmlFor="kb-t">
          <Input id="kb-t" value={f.title} maxLength={200} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label={f.category === "faq" ? "Answer" : "What the assistant should know"} required htmlFor="kb-c" hint="Plain sentences work best. The assistant quotes this when people ask.">
          <Textarea id="kb-c" rows={8} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} />
        </Field>
        {f.category === "product" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product code" htmlFor="kb-pc"><Input id="kb-pc" value={f.product_code ?? ""} onChange={(e) => setF({ ...f, product_code: e.target.value || undefined })} /></Field>
            <Field label="Price" htmlFor="kb-pp"><Input id="kb-pp" type="number" inputMode="decimal" min={0} value={f.product_price ?? ""} onChange={(e) => setF({ ...f, product_price: num(e.target.value) })} /></Field>
            <Field label="Image link" className="sm:col-span-2" htmlFor="kb-pi"><Input id="kb-pi" inputMode="url" value={f.product_image_url ?? ""} onChange={(e) => setF({ ...f, product_image_url: e.target.value || undefined })} /></Field>
          </div>
        )}
        <Field label="Tags" htmlFor="kb-tags" hint="Separate with commas.">
          <Input id="kb-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button
          disabled={!f.title.trim() || !f.content.trim() || save.isPending}
          onClick={() =>
            save.mutate(
              { id, data: { ...f, title: f.title.trim(), content: f.content.trim(), tags: tags.split(",").map((t) => t.trim()).filter(Boolean) } },
              { onSuccess: onDone },
            )
          }
        >
          {save.isPending ? "Saving..." : id ? "Save entry" : "Add entry"}
        </Button>
      </DialogFooter>
    </>
  );
}

export default function KnowledgePage() {
  const has = useFeature("knowledge_base");
  const { tenant } = useTenantBranding();
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ id?: string; data: KbInput } | null>(null);
  const [deleting, setDeleting] = useState<KbEntry | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const q = useDebouncedValue(search.trim(), 300);
  const list = useKnowledge({ q, category }, page);
  const del = useDeleteKnowledge();
  const imp = useImportKnowledge();
  const rows = list.data?.data ?? [];
  const isShared = (e: KbEntry) => e.scope === "platform" && (!tenant?.id || e.tenant_id !== tenant.id);

  const add = (
    <div className="flex gap-2">
      <Button variant="outline" disabled={imp.isPending} onClick={() => fileRef.current?.click()}>
        {imp.isPending ? <Loader2 className="animate-spin" /> : <FileUp />} Import CSV
      </Button>
      <Button onClick={() => setEditing({ data: { category: category === "all" ? "faq" : category, title: "", content: "" } })}><Plus /> Add entry</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader icon={<BookOpen />} title="Knowledge base" description="What your chat assistant knows: products, common questions and your rules." actions={has ? add : <FeatureLock feature="knowledge_base" mode="block">{add}</FeatureLock>} />
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) imp.mutate(file);
          e.target.value = "";
        }}
      />
      {imp.data?.errors && imp.data.errors.length > 0 && (
        <div role="alert" className="rounded-2xl border border-warning/25 bg-warning/10 p-4 text-sm">
          <p className="font-medium">Some rows were skipped:</p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">{imp.data.errors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <CapsuleTabs label="Filter by kind" value={category} onChange={(v) => { setCategory(v); setPage(1); }} options={[{ value: "all", label: "All" }, ...KB_CATEGORIES.map((c) => ({ value: c, label: label(c) }))]} />
        <div className="relative sm:ml-auto sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search the knowledge base" className="pl-9" placeholder="Search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="glass overflow-hidden rounded-[1.25rem]">
        {list.isError && <ErrorState message="Could not load the knowledge base." onRetry={() => void list.refetch()} />}
        {list.isLoading && <div className="space-y-2 p-4" aria-busy>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>}
        {!list.isLoading && !list.isError && rows.length === 0 && (
          <EmptyState icon={<BookOpen />} title={q ? "Nothing matches" : "Nothing here yet"} description="Add your products, prices, delivery terms and the questions customers ask most. The assistant answers from them." />
        )}
        {rows.length > 0 && (
          <ul className="divide-y divide-border">
            {rows.map((e) => {
              const shared = isShared(e);
              return (
                <li key={e.id} className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{e.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{e.content}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <ToneBadge>{label(e.category)}</ToneBadge>
                      {e.embedded ? (
                        <ToneBadge tone="success"><CheckCircle2 /> The assistant knows this</ToneBadge>
                      ) : (
                        <ToneBadge tone="warning"><Loader2 className="animate-spin" /> Learning</ToneBadge>
                      )}
                      {shared && <ToneBadge tone="info"><Lock /> Shared by Codevertex</ToneBadge>}
                      {(e.tags ?? []).slice(0, 3).map((t) => <span key={t} className="text-xs text-muted-foreground">#{t}</span>)}
                    </div>
                  </div>
                  {!shared && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${e.title}`}
                        onClick={() =>
                          setEditing({
                            id: e.id,
                            data: {
                              category: e.category, title: e.title, content: e.content, product_code: e.product_code ?? undefined,
                              product_price: e.product_price ?? undefined, product_image_url: e.product_image_url ?? undefined, tags: e.tags ?? [],
                            },
                          })
                        }
                      >
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Delete ${e.title}`} onClick={() => setDeleting(e)}><Trash2 className="text-destructive" /></Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {list.data && <div className="px-4 pb-4"><Pager page={page} limit={list.data.limit || 20} total={list.data.total} onPage={setPage} /></div>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit entry" : "New entry"}</DialogTitle></DialogHeader>
          {editing && <EntryForm key={editing.id ?? "new"} initial={editing.data} id={editing.id} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.title}"?`}
        description="The assistant stops using it right away. This cannot be undone."
        confirmLabel="Delete entry"
        pending={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}
