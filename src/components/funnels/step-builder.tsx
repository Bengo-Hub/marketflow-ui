"use client";

import { ArrowDown, ArrowUp, CalendarDays, FileText, Handshake, ListChecks, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { SearchableCombobox } from "@bengo-hub/shared-ui-lib/combobox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppIcon } from "@/components/public-profile/whatsapp-icon";
import { Field } from "@/components/ui-kit";
import type { BlockType, FunnelField, FunnelStep } from "@/lib/api/funnels";

const BLOCKS: Record<BlockType, { label: string; hint: string; icon: React.ReactNode; flp?: boolean }> = {
  form: { label: "Lead form", hint: "Collects details and creates a lead.", icon: <ListChecks className="h-4 w-4" /> },
  content: { label: "Text and button", hint: "A heading, a paragraph and an optional link.", icon: <FileText className="h-4 w-4" /> },
  whatsapp: { label: "WhatsApp button", hint: "Opens a chat with your number.", icon: <WhatsAppIcon className="h-4 w-4" /> },
  google_calendar: { label: "Booking", hint: "Free times from your Google Calendar.", icon: <CalendarDays className="h-4 w-4" /> },
  product: { label: "Forever product", hint: "A product that opens in your Forever shop.", icon: <ShoppingBag className="h-4 w-4" />, flp: true },
  recruit: { label: "Join my team", hint: "Links to the Forever join form.", icon: <Handshake className="h-4 w-4" />, flp: true },
};

export const DEFAULT_FORM: FunnelStep = {
  block_type: "form",
  title: "Leave your details",
  cta_text: "Send",
  fields: [
    { key: "first_name", label: "Name", type: "text", required: true },
    { key: "phone", label: "Phone or WhatsApp", type: "tel", required: true },
    { key: "email", label: "Email", type: "email" },
  ],
};

const FIELD_TYPES: Array<NonNullable<FunnelField["type"]>> = ["text", "email", "tel", "number", "date", "textarea"];
const keyFrom = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "answer";

function FieldsEditor({ fields, onChange }: { fields: FunnelField[]; onChange: (f: FunnelField[]) => void }) {
  const set = (i: number, patch: Partial<FunnelField>) => onChange(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Questions</p>
      {fields.map((f, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/60 p-2">
          <Input
            aria-label="Question"
            className="min-w-40 flex-1"
            value={f.label}
            onChange={(e) => set(i, { label: e.target.value, ...(["first_name", "last_name", "email", "phone", "interest"].includes(f.key) ? {} : { key: keyFrom(e.target.value) }) })}
          />
          <div className="w-36">
            <SearchableCombobox
              options={FIELD_TYPES.map((t) => ({ value: t, label: t === "tel" ? "Phone" : t === "textarea" ? "Long text" : t[0].toUpperCase() + t.slice(1) }))}
              value={f.type ?? "text"}
              onChange={(v: string) => set(i, { type: (v || "text") as FunnelField["type"] })}
              placeholder="Answer type"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Switch checked={!!f.required} onCheckedChange={(v) => set(i, { required: v })} aria-label="Required" /> Required
          </label>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove question" onClick={() => onChange(fields.filter((_, j) => j !== i))}>
            <X />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...fields, { key: `question_${fields.length + 1}`, label: "", type: "text" }])}>
        <Plus /> Add a question
      </Button>
      {!fields.some((f) => f.key === "phone" || f.key === "email") && (
        <p className="text-xs text-destructive">Keep a phone or email question: a lead needs one of them.</p>
      )}
    </div>
  );
}

/** Builds the ordered blocks a funnel page shows. Each block maps to a renderer on /f/{slug}. */
export function StepBuilder({ steps, onChange, isFLP }: { steps: FunnelStep[]; onChange: (s: FunnelStep[]) => void; isFLP: boolean }) {
  const set = (i: number, patch: Partial<FunnelStep>) => onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= steps.length) return;
    const next = steps.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = (t: BlockType) => onChange([...steps, t === "form" ? { ...DEFAULT_FORM } : { block_type: t, title: "" }]);

  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        const meta = BLOCKS[s.block_type] ?? BLOCKS.content;
        return (
          <div key={i} className="rounded-2xl border border-border bg-background/50 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">{meta.icon}</span>
                {i + 1}. {meta.label}
              </p>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Move down" disabled={i === steps.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove block" onClick={() => onChange(steps.filter((_, j) => j !== i))}><Trash2 className="text-destructive" /></Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Heading" htmlFor={`st-t-${i}`}>
                <Input id={`st-t-${i}`} value={s.title ?? ""} onChange={(e) => set(i, { title: e.target.value })} />
              </Field>
              {s.block_type !== "google_calendar" && (
                <Field label="Button text" htmlFor={`st-c-${i}`}>
                  <Input id={`st-c-${i}`} value={s.cta_text ?? ""} onChange={(e) => set(i, { cta_text: e.target.value })} />
                </Field>
              )}
              <Field label="Text" className="sm:col-span-2" htmlFor={`st-d-${i}`}>
                <Textarea id={`st-d-${i}`} rows={2} value={s.description ?? ""} onChange={(e) => set(i, { description: e.target.value })} />
              </Field>
              {s.block_type === "content" && (
                <Field label="Button link" className="sm:col-span-2" htmlFor={`st-u-${i}`}>
                  <Input id={`st-u-${i}`} inputMode="url" placeholder="https://..." value={s.cta_url ?? ""} onChange={(e) => set(i, { cta_url: e.target.value })} />
                </Field>
              )}
              {s.block_type === "whatsapp" && (
                <Field label="Message they start with" className="sm:col-span-2" htmlFor={`st-w-${i}`}>
                  <Input id={`st-w-${i}`} value={s.whatsapp_message ?? ""} onChange={(e) => set(i, { whatsapp_message: e.target.value })} />
                </Field>
              )}
              {s.block_type === "product" && (
                <>
                  <Field label="Product name" htmlFor={`st-pn-${i}`}><Input id={`st-pn-${i}`} value={s.product_name ?? ""} onChange={(e) => set(i, { product_name: e.target.value })} /></Field>
                  <Field label="Forever item code" htmlFor={`st-pc-${i}`}><Input id={`st-pc-${i}`} value={s.product_code ?? ""} onChange={(e) => set(i, { product_code: e.target.value.trim() })} /></Field>
                  <Field label="Price shown" htmlFor={`st-pp-${i}`}><Input id={`st-pp-${i}`} value={s.product_price ?? ""} onChange={(e) => set(i, { product_price: e.target.value })} /></Field>
                  <Field label="Image link" htmlFor={`st-pi-${i}`}><Input id={`st-pi-${i}`} inputMode="url" value={s.product_image ?? ""} onChange={(e) => set(i, { product_image: e.target.value })} /></Field>
                </>
              )}
            </div>
            {s.block_type === "form" && (
              <div className="mt-3">
                <FieldsEditor fields={s.fields ?? []} onChange={(fields) => set(i, { fields })} />
              </div>
            )}
          </div>
        );
      })}
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-border px-4 text-sm font-medium hover:border-primary/50">
          <Plus className="h-4 w-4" /> Add a block
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          {(Object.keys(BLOCKS) as BlockType[])
            .filter((t) => isFLP || !BLOCKS[t].flp)
            .map((t) => (
              <DropdownMenuItem key={t} onClick={() => add(t)} className="items-start gap-3 py-2">
                <span className="mt-0.5 text-primary">{BLOCKS[t].icon}</span>
                <span>
                  <span className="block text-sm font-medium">{BLOCKS[t].label}</span>
                  <span className="block text-xs text-muted-foreground">{BLOCKS[t].hint}</span>
                </span>
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
