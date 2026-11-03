"use client";

import { useState } from "react";
import { SearchableCombobox } from "@bengo-hub/shared-ui-lib/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CapsuleTabs, Field, GlassPanel } from "@/components/ui-kit";
import { useCreateVideoAd, useVoices } from "@/hooks/use-video-ads";
import { FORMATS, type CreativeBrief, type PosterFormat } from "@/lib/api/creative";
import { DELIVERIES, VIDEO_KINDS, type Delivery, type VideoKind } from "@/lib/api/video-ads";

const LENGTHS = [15, 30, 45, 60] as const;
const MAX_PHOTOS = 8;
const MAX_CLIPS = 4;

/** Links typed one per line, kept only when they are http(s). */
function links(text: string, max: number) {
  return text
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//.test(s))
    .slice(0, max);
}

/**
 * Starts a video ad: the script is written first (1 credit) and waits for the owner's
 * edits. Nothing else is paid until the owner presses Render on the script.
 */
export function VideoAdForm({ brief }: { brief: CreativeBrief }) {
  const create = useCreateVideoAd(brief.id);
  const voices = useVoices();
  const offerPhotos = (brief.offering?.photo_urls ?? []).filter((u) => /^https?:\/\//.test(u));
  const [kind, setKind] = useState<VideoKind>("template");
  const [format, setFormat] = useState<PosterFormat>("1080x1920");
  const [seconds, setSeconds] = useState<number>(30);
  const [language, setLanguage] = useState<"en" | "sw">(brief.language === "sw" ? "sw" : "en");
  const [delivery, setDelivery] = useState<Delivery>("ad");
  const [voice, setVoice] = useState("");
  const [actor, setActor] = useState("");
  const [photos, setPhotos] = useState(offerPhotos.join("\n"));
  const [clips, setClips] = useState("");
  const photoList = links(photos, MAX_PHOTOS);
  const clipList = links(clips, MAX_CLIPS);
  const presenter = kind !== "template";
  const hint = VIDEO_KINDS.find((k) => k.value === kind)?.hint;

  return (
    <GlassPanel title="New video ad">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({
            kind,
            format,
            seconds,
            language,
            delivery,
            voice: voice || undefined,
            actor_prompt: presenter && actor.trim() ? actor.trim() : undefined,
            photo_urls: photoList,
            footage_urls: clipList,
          });
        }}
      >
        <Field label="Type" hint={hint}>
          <CapsuleTabs label="Video type" options={VIDEO_KINDS.map((k) => ({ value: k.value, label: k.label }))} value={kind} onChange={setKind} />
        </Field>
        <Field label="Size">
          <CapsuleTabs label="Size" options={FORMATS.map((f) => ({ value: f.value, label: f.label }))} value={format} onChange={setFormat} />
        </Field>
        <Field label="Length">
          <CapsuleTabs
            label="Length"
            options={LENGTHS.map((n) => ({ value: String(n), label: `${n} s` }))}
            value={String(seconds)}
            onChange={(v) => setSeconds(Number(v))}
          />
        </Field>
        <Field label="Language">
          <CapsuleTabs label="Language" options={[{ value: "en" as const, label: "English" }, { value: "sw" as const, label: "Swahili" }]} value={language} onChange={setLanguage} />
        </Field>
        <Field label="Delivery" hint="How the voice reads: an advert, casual, for kids, a story or an explainer.">
          <CapsuleTabs label="Delivery" options={DELIVERIES} value={delivery} onChange={setDelivery} />
        </Field>
        <Field label="Voice" hint="Leave empty to pick the best voice for the delivery.">
          <SearchableCombobox
            options={[
              { value: "", label: "Best for the delivery" },
              ...(voices.data?.voices ?? []).map((v) => ({ value: v.voice_id, label: [v.name, v.accent].filter(Boolean).join(", ") })),
            ]}
            value={voice}
            onChange={(v: string) => setVoice(v)}
            placeholder={voices.isLoading ? "Loading voices..." : "Best for the delivery"}
          />
        </Field>
        {presenter && (
          <Field label="Presenter" htmlFor="va-actor" hint="Who talks to camera. The same person appears in every presenter scene of this ad.">
            <Input id="va-actor" value={actor} maxLength={300} placeholder="A warm Kenyan mother in her thirties" onChange={(e) => setActor(e.target.value)} />
          </Field>
        )}
        <Field label="Your photos" htmlFor="va-photos" hint={`Links, one per line, up to ${MAX_PHOTOS}. Product scenes always show your own photos.`}>
          <Textarea id="va-photos" rows={3} value={photos} onChange={(e) => setPhotos(e.target.value)} />
        </Field>
        <Field label="Your clips" htmlFor="va-clips" hint={`Optional. Video links, one per line, up to ${MAX_CLIPS}.`}>
          <Textarea id="va-clips" rows={2} value={clips} onChange={(e) => setClips(e.target.value)} />
        </Field>
        <p className="text-sm text-muted-foreground">
          The script is written first for 1 credit. You check and change it, see the price, and only then render.
        </p>
        <Button type="submit" className="w-full" disabled={create.isPending || photoList.length + clipList.length === 0}>
          {create.isPending ? "Starting..." : "Write the script"}
        </Button>
      </form>
    </GlassPanel>
  );
}
