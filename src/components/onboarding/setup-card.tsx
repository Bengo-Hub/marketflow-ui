"use client";

import Link from "next/link";
import { Rocket, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useChecklist, useDismissChecklist } from "@/hooks/use-onboarding";
import { STEP_META } from "@/lib/api/onboarding";

/** Dashboard prompt while setup is unfinished and not hidden: progress and the next step. */
export function SetupCard({ orgSlug }: { orgSlug: string }) {
  const checklist = useChecklist();
  const dismiss = useDismissChecklist();
  const c = checklist.data;
  if (!c || c.complete || c.dismissed) return null;
  const next = c.steps.find((s) => !s.done && !s.optional);
  const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;

  return (
    <section aria-label="Finish setting up" className="glass flex flex-col gap-4 rounded-[1.25rem] p-5 sm:flex-row sm:items-center">
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Rocket className="size-5" /></div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-semibold">Finish setting up: {c.done} of {c.total} done</p>
        <p className="text-sm text-muted-foreground">{next ? `Next: ${STEP_META[next.key].title.toLowerCase()}.` : "Almost there."}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Setup progress">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link href={`/${orgSlug}/onboarding`} className={buttonVariants()}>Continue setup</Link>
        <Button variant="ghost" size="icon" aria-label="Hide the setup guide" disabled={dismiss.isPending} onClick={() => dismiss.mutate(true)}><X /></Button>
      </div>
    </section>
  );
}
