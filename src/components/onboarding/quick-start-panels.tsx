"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMarkStep } from "@/hooks/use-onboarding";
import { pageUrl, plansHref, whatsappShareHref, widgetSnippet } from "@/lib/onboarding/quick-start";

async function copy(text: string, what: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
    return true;
  } catch {
    toast.error(`Could not copy the ${what.toLowerCase()}. Select it and copy it yourself.`);
    return false;
  }
}

/** The plan step: see the plans, or stay on the trial for now (which marks the step done). */
export function PlanStepPanel({ done }: { done: boolean }) {
  const mark = useMarkStep();
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">
        Plans differ in how many AI credits you get each month, video ads, the ad autopilot and removing the Codevertex badge. You can change plan at any time from Billing.
      </p>
      <div className="flex flex-wrap gap-2">
        <a href={plansHref()} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm" })}>
          See plans
        </a>
        {!done && (
          <Button size="sm" variant="ghost" disabled={mark.isPending} onClick={() => mark.mutate("plan")}>
            Stay on the trial for now
          </Button>
        )}
      </div>
    </div>
  );
}

/** The widget step: the embed code to copy, and "I've added it". A lead from the widget also completes it. */
export function WidgetStepPanel({ slug, color, done }: { slug: string; color?: string; done: boolean }) {
  const mark = useMarkStep();
  const snippet = widgetSnippet(slug, color);
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">Paste this just before the closing body tag of your website. It works on any site, WordPress and Shopify included.</p>
      <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs" aria-label="Widget code">
        {snippet}
      </pre>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => void copy(snippet, "Code")}>
          Copy the code
        </Button>
        {!done && (
          <Button size="sm" variant="ghost" disabled={mark.isPending} onClick={() => mark.mutate("widget")}>
            I&apos;ve added it
          </Button>
        )}
      </div>
    </div>
  );
}

/** The share step: the public page's link to copy or send on WhatsApp; either marks the step done. */
export function ShareStepPanel({ slug, businessName, done }: { slug: string; businessName?: string; done: boolean }) {
  const mark = useMarkStep();
  const [shared, setShared] = useState(done);
  const url = pageUrl(slug);
  const markOnce = () => {
    if (!shared) {
      setShared(true);
      mark.mutate("share_page");
    }
  };
  return (
    <div className="space-y-3 text-sm">
      <Input readOnly value={url} aria-label="Your public page" onFocus={(e) => e.currentTarget.select()} />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            if (await copy(url, "Link")) markOnce();
          }}
        >
          Copy the link
        </Button>
        <a href={whatsappShareHref(url, businessName)} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm" })} onClick={markOnce}>
          Share on WhatsApp
        </a>
      </div>
    </div>
  );
}
