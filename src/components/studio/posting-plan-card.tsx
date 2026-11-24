"use client";

import { useState } from "react";
import { CalendarClock, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState, GlassPanel, ToneBadge } from "@/components/ui-kit";
import { useCanApprove } from "@/hooks/use-creative";
import { useBestTimes, useSaveBestTimes } from "@/hooks/use-publishing";
import { apiErrorMessage } from "@/lib/api/errors";
import {
  PLATFORM_LABEL,
  cadenceLabel,
  windowLabel,
  type BestTimes,
  type Platform,
  type PostingCadence,
  type PostingWindow,
} from "@/lib/api/publishing";

const PLATFORMS: Platform[] = ["facebook", "instagram", "tiktok", "youtube"];
const inputClass = "min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm";
const SOURCE_LABEL = { default: "Recommended", platform: "Codevertex default", tenant: "Your choice" } as const;
const whenFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * The business's posting plan: when each platform's posts go out (best-time windows, in the
 * business's time zone) and how many a week or month. The publish dialog's "best time" and every
 * Autopilot agent that follows the cadence read the same plan.
 */
export function PostingPlanCard() {
  const plan = useBestTimes();
  const canEdit = useCanApprove();
  const [editing, setEditing] = useState<Platform | null>(null);

  if (plan.isError) return <ErrorState message={apiErrorMessage(plan.error, "Could not load your posting plan.")} onRetry={() => void plan.refetch()} />;
  if (!plan.data) return null;
  const data = plan.data;

  return (
    <GlassPanel
      title="Posting plan"
      description={`Best times to post and how often, in ${data.timezone}. Recommended times come from 2025 and 2026 studies by Sprout Social, Buffer and Hootsuite, set to East African lunch and evening hours.`}
    >
      <ul className="divide-y divide-border">
        {PLATFORMS.map((p) => {
          const info = data.platforms[p];
          if (!info) return null;
          return (
            <li key={p} className="space-y-2 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <CalendarClock className="size-4 text-muted-foreground" aria-hidden />
                <span className="font-medium">{PLATFORM_LABEL[p]}</span>
                <span className="text-sm text-muted-foreground">
                  {cadenceLabel(info.cadence)}, {info.cadence.per === "month" ? info.booked.month : info.booked.week} so far
                </span>
                {info.due ? <ToneBadge tone="info">Next {whenFmt.format(new Date(info.next_best_time))}</ToneBadge> : <ToneBadge tone="success">Done for this {info.cadence.per}</ToneBadge>}
                <span className="text-xs text-muted-foreground">{SOURCE_LABEL[info.windows_source]}</span>
                {canEdit && editing !== p && (
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setEditing(p)}>
                    Change
                  </Button>
                )}
              </div>
              {editing === p ? (
                <PlatformEditor platform={p} data={data} onDone={() => setEditing(null)} />
              ) : (
                <p className="text-sm text-muted-foreground">{info.windows.map(windowLabel).join("; ")}</p>
              )}
            </li>
          );
        })}
      </ul>
    </GlassPanel>
  );
}

function PlatformEditor({ platform, data, onDone }: { platform: Platform; data: BestTimes; onDone: () => void }) {
  const info = data.platforms[platform];
  const save = useSaveBestTimes();
  const [windows, setWindows] = useState<PostingWindow[]>(info.windows);
  const [cadence, setCadence] = useState<PostingCadence>(info.cadence);
  const max = cadence.per === "week" ? 21 : 90;
  const problem =
    windows.length === 0
      ? "Add at least one time window"
      : windows.some((w) => !w.start || !w.end || w.end <= w.start)
        ? "Each window ends after it starts"
        : cadence.count < 0 || cadence.count > max
          ? `Posts a ${cadence.per} are 0 to ${max}`
          : null;
  const set = (i: number, patch: Partial<PostingWindow>) => setWindows((ws) => ws.map((w, j) => (j === i ? { ...w, ...patch } : w)));

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Posts</span>
          <Input type="number" min={0} max={max} value={cadence.count} onChange={(e) => setCadence({ ...cadence, count: Number(e.target.value) || 0 })} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Per</span>
          <select className={inputClass} value={cadence.per} onChange={(e) => setCadence({ ...cadence, per: e.target.value as PostingCadence["per"] })}>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </label>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Best times</legend>
        {windows.map((w, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
            <select aria-label="Days" className={inputClass} value={["weekdays", "weekend", "daily"].includes(w.days) ? w.days : "weekdays"} onChange={(e) => set(i, { days: e.target.value })}>
              <option value="weekdays">Weekdays</option>
              <option value="weekend">Weekends</option>
              <option value="daily">Every day</option>
            </select>
            <Input aria-label="From" type="time" value={w.start} onChange={(e) => set(i, { start: e.target.value })} />
            <Input aria-label="To" type="time" value={w.end} onChange={(e) => set(i, { end: e.target.value })} />
            <Button variant="ghost" size="icon" aria-label="Remove window" onClick={() => setWindows((ws) => ws.filter((_, j) => j !== i))}>
              <Trash2 />
            </Button>
          </div>
        ))}
        {windows.length < 8 && (
          <Button variant="outline" size="sm" onClick={() => setWindows((ws) => [...ws, { days: "weekdays", start: "12:00", end: "14:00" }])}>
            <Plus /> Add a window
          </Button>
        )}
      </fieldset>
      {problem && <p className="text-sm text-destructive">{problem}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!!problem || save.isPending}
          onClick={() => save.mutate({ windows: { [platform]: windows }, cadence: { [platform]: cadence } }, { onSuccess: onDone })}
        >
          Save
        </Button>
        <Button
          variant="outline"
          disabled={save.isPending}
          onClick={() => save.mutate({ windows: { [platform]: null }, cadence: { [platform]: null } }, { onSuccess: onDone })}
        >
          <RotateCcw /> Use recommended
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
