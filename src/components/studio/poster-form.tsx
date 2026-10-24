"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CapsuleTabs, Field, GlassPanel } from "@/components/ui-kit";
import { useCreativeQuote, useMakePoster } from "@/hooks/use-creative";
import { kes } from "@/lib/api/billing";
import { FORMATS, type CreativeBrief, type CreativeVersion, type PosterFormat, type Tier } from "@/lib/api/creative";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 4;
const MAX_LINE = 200;

/** Words a first poster starts with, from the offering the ad is about. */
function defaults(brief: CreativeBrief) {
  const o = brief.offering ?? {};
  const promo = o.type === "PROMOTION";
  const ends = o.ends_at ? new Date(o.ends_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "";
  return {
    prompt: o.name ? `${o.name}${o.description ? `: ${o.description}` : ""}. A clean, bright product photo on a simple background.` : "",
    headline: o.name ?? "",
    subline: promo ? [o.promo_code && `Use code ${o.promo_code}`, ends && `ends ${ends}`].filter(Boolean).join(", ") : "",
    price: typeof o.price === "number" && o.price > 0 ? kes(o.price) : "",
    cta: brief.objective === "leads" ? "Message us on WhatsApp" : brief.objective === "traffic" ? "Visit our website" : "Order now",
  };
}

export function PosterForm({ brief, base, onStarted }: { brief: CreativeBrief; base: CreativeVersion | null; onStarted: () => void }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const start = base?.copy ?? defaults(brief);
  const offerPhotos = (brief.offering?.photo_urls ?? []).filter((u) => /^https?:\/\//.test(u));
  const [prompt, setPrompt] = useState(start.prompt ?? "");
  const [format, setFormat] = useState<PosterFormat>(base?.format ?? "1080x1350");
  const [tier, setTier] = useState<Tier>(base?.tier ?? "standard");
  const [headline, setHeadline] = useState(start.headline ?? "");
  const [subline, setSubline] = useState(start.subline ?? "");
  const [price, setPrice] = useState(start.price ?? "");
  const [cta, setCta] = useState(start.cta ?? "");
  const [photos, setPhotos] = useState<string[]>(offerPhotos.slice(0, MAX_PHOTOS));
  const quote = useCreativeQuote(brief.tenant_id, tier);
  const make = useMakePoster(brief.id);

  const q = quote.data;
  const short = q && !q.enough;
  const valid = prompt.trim().length > 0 && prompt.length <= 2000;

  const toggle = (u: string) =>
    setPhotos((p) => (p.includes(u) ? p.filter((x) => x !== u) : p.length < MAX_PHOTOS ? [...p, u] : p));

  const submit = () =>
    make.mutate(
      {
        prompt: prompt.trim(),
        format,
        tier,
        headline: headline.trim(),
        subline: subline.trim(),
        price: price.trim(),
        cta: cta.trim(),
        photo_urls: photos.length ? photos : undefined,
        parent_version_id: base?.id,
      },
      { onSuccess: onStarted },
    );

  return (
    <GlassPanel title={base ? `New poster from version ${base.version_no}` : "Make a poster"} description="Each poster is a draft for 3 days unless you approve or keep it.">
      <div className="space-y-4">
        <Field label="Picture" required htmlFor="pf-prompt" hint="What should the photo show? Name the product, the setting and the mood.">
          <Textarea id="pf-prompt" rows={4} value={prompt} maxLength={2000} onChange={(e) => setPrompt(e.target.value)} />
        </Field>

        {offerPhotos.length > 0 && (
          <Field label="Your photos" hint={`Up to ${MAX_PHOTOS}. The poster is built around them.`}>
            <div className="grid grid-cols-4 gap-2">
              {offerPhotos.map((u) => {
                const on = photos.includes(u);
                return (
                  <button
                    key={u}
                    type="button"
                    aria-pressed={on}
                    aria-label={on ? "Don't use this photo" : "Use this photo"}
                    onClick={() => toggle(u)}
                    className={cn("relative aspect-square overflow-hidden rounded-xl border-2 transition", on ? "border-primary" : "border-transparent opacity-60 hover:opacity-100")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="" className="size-full object-cover" loading="lazy" />
                    {on && (
                      <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        <Field label="Size">
          <CapsuleTabs label="Poster size" value={format} onChange={setFormat} options={FORMATS.map((f) => ({ value: f.value, label: f.label }))} />
          <p className="text-xs text-muted-foreground">{FORMATS.find((f) => f.value === format)?.hint}</p>
        </Field>

        <Field label="Quality" hint={tier === "premium" ? "Sharper detail for products that need it. Uses more credits." : "Good for most posts."}>
          <CapsuleTabs
            label="Quality"
            value={tier}
            onChange={setTier}
            options={[
              { value: "standard", label: "Standard" },
              { value: "premium", label: "Premium" },
            ]}
          />
        </Field>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-foreground">Words on the poster</legend>
          <Input aria-label="Headline" placeholder="Headline" value={headline} maxLength={MAX_LINE} onChange={(e) => setHeadline(e.target.value)} />
          <Input aria-label="Second line" placeholder="Second line" value={subline} maxLength={MAX_LINE} onChange={(e) => setSubline(e.target.value)} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Input aria-label="Price" placeholder="Price" value={price} maxLength={MAX_LINE} onChange={(e) => setPrice(e.target.value)} />
            <Input aria-label="Button text" placeholder="Button text" value={cta} maxLength={MAX_LINE} onChange={(e) => setCta(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">You can change the words later for free. The picture stays the same.</p>
        </fieldset>

        <div className={cn("rounded-xl px-3 py-2.5 text-sm", short ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground")} aria-live="polite">
          {quote.isLoading && "Checking your credits..."}
          {quote.isError && "Couldn't check your credits. The poster still starts if you have enough."}
          {q && q.enough && (
            <>
              This poster uses <span className="font-medium text-foreground tabular">{q.credits_each}</span> AI credits
              {q.balance >= 0 && (
                <>
                  . You have <span className="font-medium text-foreground tabular">{q.balance.toLocaleString()}</span>
                </>
              )}
              .
            </>
          )}
          {short && (
            <>
              This poster needs {q.credits_needed} AI credits and you have {Math.max(0, q.balance)}.{" "}
              {q.suggested_bundle && <>The {q.suggested_bundle.units.toLocaleString()} credit bundle ({kes(q.suggested_bundle.price_kes)}) covers it. </>}
              <Link href={`/${orgSlug}/settings/billing`} className="font-medium underline underline-offset-2">
                Buy credits
              </Link>
            </>
          )}
        </div>

        <div className="flex gap-2">
          {base && (
            <Button variant="outline" onClick={onStarted}>
              Cancel
            </Button>
          )}
          <Button className="flex-1" disabled={!valid || make.isPending || !!short} onClick={submit}>
            {make.isPending ? "Starting..." : "Make poster"}
          </Button>
        </div>
      </div>
    </GlassPanel>
  );
}
