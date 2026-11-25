"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { brandImagesKey } from "@/components/media/brand-images-panel";
import { MediaImage } from "@/components/media-image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog, Field } from "@/components/ui-kit";
import { useAddBrandFace, useBrandFaces, useRemoveBrandFace, useSwitchBrandFaces } from "@/hooks/use-brand-faces";
import { useAdminLocked } from "@/hooks/use-access";
import { faceFormProblem, type BrandFace } from "@/lib/api/brand-faces";
import { brandImagesApi } from "@/lib/api/brand-images";
import { cn } from "@/lib/utils";

const day = (iso: string) => iso.slice(0, 10);
/** The consent's last day; the stored end is the midnight after it. */
const lastDay = (until: string) => day(new Date(new Date(until).getTime() - 1).toISOString());

/**
 * Brand faces: people who agreed that the business's AI presenter may look like them. Off until an
 * admin turns it on; each person is one consent record. Removing one stops its use at once.
 */
export function BrandFacesPanel() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const canChange = !useAdminLocked();
  const faces = useBrandFaces();
  const images = useQuery({ queryKey: brandImagesKey(orgSlug), queryFn: brandImagesApi.list });
  const toggle = useSwitchBrandFaces();
  const add = useAddBrandFace();
  const remove = useRemoveBrandFace();
  const [imageId, setImageId] = useState("");
  const [name, setName] = useState("");
  const [until, setUntil] = useState("");
  const [under18, setUnder18] = useState<boolean | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [ending, setEnding] = useState<BrandFace | null>(null);
  const [off, setOff] = useState(false);

  const d = faces.data;
  if (!d) return null;
  if (!d.available) return <p className="text-sm text-muted-foreground">Brand faces are not available right now.</p>;
  const live = d.faces.filter((f) => f.live);
  const past = d.faces.filter((f) => !f.live);
  const photos = (images.data?.images ?? []).filter((i) => !live.some((f) => f.image_id === i.id));
  const pictureOf = (id: string) => images.data?.images.find((i) => i.id === id);
  const problem = faceFormProblem({ imageId, name, until, under18, agreed }, day(new Date().toISOString()));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-background/60 p-4">
        <div>
          <p className="text-sm font-medium">Use people who agreed as the presenter</p>
          <p className="text-xs text-muted-foreground">
            Off, your presenter is never modelled on a real person. On, you can pick a person below for a video. Turning it off ends every
            consent.
          </p>
          {!canChange && <p className="mt-1 text-xs text-muted-foreground">Only an admin can change this.</p>}
        </div>
        <Switch
          checked={d.on}
          disabled={!canChange || toggle.isPending}
          onCheckedChange={(on) => (on || live.length === 0 ? toggle.mutate(on) : setOff(true))}
          aria-label="Use people who agreed as the presenter"
        />
      </div>

      {live.length > 0 && (
        <ul className="space-y-2" aria-label="People who agreed">
          {live.map((f) => {
            const img = pictureOf(f.image_id);
            return (
              <li key={f.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-2 text-sm">
                {img && <MediaImage src={img.url} displayWidth={96} alt={f.name} className="size-14 rounded-lg object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    AI presenter in video ads, until {lastDay(f.until)}. Recorded by {f.recorded_by} on {day(f.recorded_at)}.
                  </p>
                </div>
                {canChange && (
                  <Button type="button" size="sm" variant="outline" disabled={remove.isPending} onClick={() => setEnding(f)}>
                    Remove
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {d.on && canChange && live.length < d.max_faces && (
        <form
          className="space-y-3 rounded-lg border border-dashed p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (problem || under18 !== false) return;
            add.mutate(
              { image_id: imageId, name: name.trim(), until, under_18: under18, agreed },
              {
                onSuccess: () => {
                  setImageId("");
                  setName("");
                  setUntil("");
                  setUnder18(null);
                  setAgreed(false);
                },
              },
            );
          }}
        >
          <p className="text-sm font-medium">Add a person</p>
          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add a picture of the person to your brand images first. Only your own pictures can be used.</p>
          ) : (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Picture">
              {photos.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  role="radio"
                  aria-checked={imageId === i.id}
                  aria-label={i.name || "Brand image"}
                  onClick={() => setImageId(i.id)}
                  className={cn("overflow-hidden rounded-lg border-2", imageId === i.id ? "border-primary" : "border-transparent")}
                >
                  <MediaImage src={i.url} displayWidth={96} alt="" className="size-20 object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name or label" htmlFor="bf-name" hint="Kept with the record. Never sent to an AI model.">
              <Input id="bf-name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Agreed until" htmlFor="bf-until" hint={`At most ${d.max_days} days from today.`}>
              <Input id="bf-until" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
            </Field>
          </div>
          <fieldset className="space-y-1 text-sm">
            <legend className="font-medium">Is this person under 18?</legend>
            <div className="flex gap-4">
              {[
                { v: false, label: "No, an adult" },
                { v: true, label: "Yes" },
              ].map((o) => (
                <label key={o.label} className="flex items-center gap-2">
                  <input type="radio" name="bf-age" checked={under18 === o.v} onChange={() => setUnder18(o.v)} />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
            <span>{d.statement}</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!!problem || add.isPending}>
              {add.isPending ? "Saving..." : "Record the consent"}
            </Button>
            {problem && <span className="text-xs text-muted-foreground">{problem}</span>}
          </div>
        </form>
      )}

      {past.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Ended consents ({past.length})</summary>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {past.map((f) => (
              <li key={f.id}>
                {f.name}: recorded by {f.recorded_by} on {day(f.recorded_at)}, {f.ended_at ? `ended ${day(f.ended_at)}` : `not in use`}
                {f.ended_by && f.ended_by !== "system" ? ` by ${f.ended_by}` : ""}.
              </li>
            ))}
          </ul>
        </details>
      )}

      <ConfirmDialog
        open={!!ending}
        onOpenChange={(open) => !open && setEnding(null)}
        title={`Stop using ${ending?.name ?? "this person"}?`}
        description="The face is no longer used from now. Presenter pictures and unapproved drafts made from it are deleted. Approved videos stay; delete them from your channels yourself if the person asks."
        confirmLabel="Stop using this face"
        onConfirm={() => {
          if (ending) remove.mutate(ending.id);
          setEnding(null);
        }}
      />
      <ConfirmDialog
        open={off}
        onOpenChange={setOff}
        title="Turn brand faces off?"
        description="Every consent ends now. Presenter pictures and unapproved drafts made from them are deleted."
        confirmLabel="Turn off"
        onConfirm={() => {
          toggle.mutate(false);
          setOff(false);
        }}
      />
    </div>
  );
}
