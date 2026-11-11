"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui-kit";
import type { FunnelABTest } from "@/lib/api/funnels";

/** Problems with a test before it can be saved (marketflow-api funnels.ValidateABTest). */
export function abTestProblem(t: FunnelABTest | null | undefined): string | null {
  if (!t?.enabled) return null;
  if (t.split < 10 || t.split > 90) return "Show version B to between 10% and 90% of visitors.";
  if (!t.b.headline?.trim() && !t.b.subheadline?.trim() && !t.b.hero_image_url?.trim()) return "Give version B a different headline, subheadline or image.";
  if (t.b.hero_image_url && !t.b.hero_image_url.startsWith("https://")) return "Version B's image must be an https link.";
  return null;
}

/** Sprint 7 #53: version B of the page's headline, subheadline and top image. */
export function ABTestEditor({ value, onChange }: { value: FunnelABTest | null | undefined; onChange: (t: FunnelABTest) => void }) {
  const t: FunnelABTest = value ?? { enabled: false, split: 50, b: {} };
  const set = (patch: Partial<FunnelABTest>) => onChange({ ...t, ...patch });
  const setB = (patch: FunnelABTest["b"]) => set({ b: { ...t.b, ...patch } });
  const problem = abTestProblem(t);
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-background/60 p-4">
        <div>
          <p className="text-sm font-medium">Test a second version</p>
          <p className="text-xs text-muted-foreground">
            Part of your visitors see version B. Each visitor keeps seeing the same version, and the results show which one brings more leads.
          </p>
        </div>
        <Switch checked={t.enabled} onCheckedChange={(enabled) => set({ enabled })} aria-label="Test a second version" />
      </div>
      {t.enabled && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Version B headline" className="sm:col-span-2" htmlFor="ab-h" hint="Leave empty to keep the main headline.">
            <Input id="ab-h" maxLength={200} value={t.b.headline ?? ""} onChange={(e) => setB({ headline: e.target.value })} />
          </Field>
          <Field label="Version B subheadline" className="sm:col-span-2" htmlFor="ab-sh">
            <Textarea id="ab-sh" rows={2} maxLength={200} value={t.b.subheadline ?? ""} onChange={(e) => setB({ subheadline: e.target.value })} />
          </Field>
          <Field label="Version B top image link" htmlFor="ab-hero" hint="https only.">
            <Input id="ab-hero" inputMode="url" value={t.b.hero_image_url ?? ""} onChange={(e) => setB({ hero_image_url: e.target.value })} />
          </Field>
          <Field label={`Visitors who see B: ${t.split}%`} htmlFor="ab-split">
            <input
              id="ab-split"
              type="range"
              min={10}
              max={90}
              step={10}
              value={t.split}
              onChange={(e) => set({ split: Number(e.target.value) })}
              className="w-full accent-[hsl(var(--primary))]"
            />
          </Field>
          {problem && <p className="text-sm text-destructive sm:col-span-2">{problem}</p>}
        </div>
      )}
    </div>
  );
}
