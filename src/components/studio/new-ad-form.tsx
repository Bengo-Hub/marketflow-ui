"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AIFieldButton } from "@/components/marketing-os/ai-field-button";
import { marketingOsApi } from "@/lib/api/marketing-os";
import { SearchableCombobox, type ComboboxOption } from "@bengo-hub/shared-ui-lib/combobox";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CapsuleTabs, Field } from "@/components/ui-kit";
import { useCreateBrief, useOfferingSearch } from "@/hooks/use-creative";
import { creativeApi, OBJECTIVES, type Objective, type Offering } from "@/lib/api/creative";
import { kes } from "@/lib/api/billing";
import { CreativePlanStep } from "@/components/studio/creative-plan-step";
import type { BriefPlan } from "@/lib/studio/creative-plan";

function optionOf(o: Offering): ComboboxOption {
  const promo = o.type === "PROMOTION";
  return {
    value: `${o.source}:${o.source_id}`,
    label: o.name,
    hint: promo ? "Promotion" : o.price != null ? kes(o.price) : o.sku,
    description: promo && o.ends_at ? `Ends ${new Date(o.ends_at).toLocaleDateString("en-KE", { dateStyle: "medium" })}` : o.description,
  };
}

/** The brief keeps a snapshot of the offering; inventory, pos or the website stay its owner. */
function snapshot(o: Offering): Record<string, unknown> {
  const { source, source_id, type, name, sku, description, price, photo_urls, promo_code, ends_at } = o;
  return Object.fromEntries(Object.entries({ source, source_id, type, name, sku, description, price, photo_urls, promo_code, ends_at }).filter(([, v]) => v !== undefined && v !== ""));
}

export function NewAdForm({ onDone }: { onDone: (briefId?: string) => void }) {
  const top = useOfferingSearch("");
  const create = useCreateBrief();
  const known = useRef(new Map<string, Offering>());
  const [picked, setPicked] = useState("");
  const [offering, setOffering] = useState<Record<string, unknown> | null>(null);
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState<Objective>("sales");
  const [audience, setAudience] = useState("");
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const brand = useQuery({ queryKey: ["os-brand-context", orgSlug], queryFn: marketingOsApi.brandContext, staleTime: 5 * 60_000 });
  const [language, setLanguage] = useState<"en" | "sw">("en");
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<BriefPlan | null>(null);

  const options = (top.data ?? []).map(optionOf);
  const catalogueDown = top.isError;

  const choose = (value: string, opt?: ComboboxOption) => {
    setPicked(value);
    const o = top.data?.find((x) => `${x.source}:${x.source_id}` === value) ?? known.current.get(value);
    if (o) {
      setOffering(snapshot(o));
      if (!title.trim()) setTitle(o.type === "PROMOTION" ? o.name : `${o.name} ad`);
    } else if (opt) {
      setOffering({ name: opt.label });
    } else {
      setOffering(null);
    }
  };

  const typed = (name: string) => {
    const t = name.trim();
    if (!t) return;
    const value = `typed:${t}`;
    setPicked(value);
    setOffering({ name: t });
    if (!title.trim()) setTitle(`${t} ad`);
    return { value, label: t };
  };

  const valid = title.trim().length > 0 && title.trim().length <= 160;
  const submit = () =>
    create.mutate(
      {
        title: title.trim(),
        objective,
        language,
        audience: audience.trim() || undefined,
        offering: offering ?? undefined,
        // The chosen Creative Plan option, when the owner made one (metadata.plan).
        metadata: planning && plan ? { plan } : undefined,
      },
      { onSuccess: (b) => onDone(b.id) },
    );

  return (
    <>
      <div className="space-y-4">
        <Field
          label="What is the ad for?"
          hint={catalogueDown ? "Your catalogue can't be reached right now, so type the product or service." : "A product, service or running promotion. Type a name to add one that isn't listed."}
        >
          {catalogueDown ? (
            <Input placeholder="For example: Aloe vera gel 1 litre" onChange={(e) => setOffering(e.target.value.trim() ? { name: e.target.value.trim() } : null)} />
          ) : (
            <SearchableCombobox
              options={options}
              value={picked}
              valueLabel={typeof offering?.name === "string" ? offering.name : undefined}
              onChange={choose}
              loading={top.isLoading}
              placeholder="Choose a product, service or promotion"
              searchPlaceholder="Search by name or SKU"
              emptyText="Nothing found. Type the name to use it."
              onRemoteSearch={async (q) => {
                const found = await creativeApi.offerings(q).catch(() => []);
                for (const o of found) known.current.set(`${o.source}:${o.source_id}`, o);
                return found.map(optionOf);
              }}
              onCreate={typed}
              createLabel={'Use "{text}"'}
            />
          )}
        </Field>
        <Field label="Ad name" required htmlFor="ad-title" hint="Only you see this.">
          <Input id="ad-title" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Goal">
          <CapsuleTabs label="Goal" value={objective} onChange={setObjective} options={OBJECTIVES} />
        </Field>
        <Field label="Who is it for?" htmlFor="ad-aud" hint="Optional. Pick one of your audiences, generate one from your brand context, or write your own.">
          <Textarea id="ad-aud" rows={2} value={audience} maxLength={500} onChange={(e) => setAudience(e.target.value)} />
          {/* The brand context's audiences, one tap each, and an AI suggestion that reads the brand
              context, knowledge base and the offer chosen above (owner, 2026-11-28). */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {(brand.data?.audience ?? []).slice(0, 5).map((a) => (
              <button key={a} type="button" onClick={() => setAudience(a)}
                className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">
                {a}
              </button>
            ))}
            <AIFieldButton
              field="audience"
              label="Generate with AI"
              form={() => ({ offer: [offering?.name, offering?.description].filter((v): v is string => typeof v === "string" && v !== "").join(": "), ad_name: title, goal: objective })}
              onResult={(s) => s.items?.[0] && setAudience(s.items[0])}
            />
          </div>
        </Field>
        <Field label="Poster language">
          <CapsuleTabs
            label="Poster language"
            value={language}
            onChange={setLanguage}
            options={[
              { value: "en", label: "English" },
              { value: "sw", label: "Swahili" },
            ]}
          />
        </Field>
        <div className="space-y-2">
          <Button type="button" size="sm" variant="ghost" aria-expanded={planning} onClick={() => setPlanning((v) => !v)}>
            {planning ? "Skip the plan" : "Plan it first (optional)"}
          </Button>
          {planning && <CreativePlanStep onChange={setPlan} />}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onDone()}>
          Cancel
        </Button>
        <Button disabled={!valid || create.isPending} onClick={submit}>
          {create.isPending ? "Creating..." : "Create ad"}
        </Button>
      </DialogFooter>
    </>
  );
}
