"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, ExternalLink, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ErrorState, Field, GlassPanel, PageHeader, ToneBadge } from "@/components/ui-kit";
import { useUpdateTenantProfile } from "@/hooks/use-tenant-profile";
import { tenantProfileApi } from "@/lib/api/tenant-profile";
import {
  WEEKDAYS,
  describeHours,
  formatMinutes,
  leadResponsePatch,
  leadResponseProblems,
  parseReminder,
  shortMinutes,
  type LeadResponseResponse,
  type LeadResponseView,
} from "@/lib/leads/lead-response-settings";

/**
 * Item 62 (owner, 2026-11-24): how the business answers new leads. The automatic follow-up, the
 * reminders to the team for leads nobody contacted (in business hours) and the daily list. Each value
 * shows MarketFlow's default; the owner or an admin can change it for the business.
 */
export default function LeadResponseSettingsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const q = useQuery({ queryKey: ["lead-response", orgSlug], queryFn: tenantProfileApi.leadResponse, staleTime: 30_000 });
  if (q.error) return <ErrorState message="Could not load the lead response settings." onRetry={() => void q.refetch()} />;
  if (q.isLoading || !q.data) return <div className="glass mx-auto h-64 max-w-3xl animate-pulse rounded-[1.25rem]" aria-busy />;
  return <LeadResponseForm key={q.dataUpdatedAt} data={q.data} />;
}

function LeadResponseForm({ data }: { data: LeadResponseResponse }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const save = useUpdateTenantProfile();
  const p = data.platform;
  const [v, setV] = useState<LeadResponseView>(data.effective);
  const [reminderText, setReminderText] = useState(data.effective.reminder_minutes.map(shortMinutes).join(", "));
  const parsed = reminderText.split(",").map((s) => s.trim()).filter(Boolean).map(parseReminder);
  const unreadable = parsed.some((m) => m === null);
  const current: LeadResponseView = { ...v, reminder_minutes: unreadable ? [] : (parsed as number[]) };
  const problems = unreadable ? ["Write reminder times like 15m, 2h or 1d, separated by commas."] : leadResponseProblems(current);
  const disabled = !data.can_edit;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (problems.length > 0 || disabled) return;
    save.mutate(
      { metadata: { lead_response: leadResponsePatch(current, p) } },
      { onSuccess: () => void qc.invalidateQueries({ queryKey: ["lead-response", orgSlug] }) },
    );
  };
  const resetToDefaults = () => {
    setV(p);
    setReminderText(p.reminder_minutes.map(shortMinutes).join(", "));
  };
  const toggleDay = (day: number) =>
    setV((cur) => ({
      ...cur,
      business_days: cur.business_days.includes(day) ? cur.business_days.filter((d) => d !== day) : [...cur.business_days, day],
    }));
  const defaultNote = (same: boolean, text: string) => (same ? "MarketFlow default" : `MarketFlow default: ${text}`);

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6" noValidate>
      <PageHeader
        icon={<BellRing />}
        title="Lead response"
        description="Every new lead hears from you within a minute, and your team is reminded about any lead nobody has contacted yet."
      />

      {disabled && (
        <p className="rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
          Only the account owner or an admin can change these settings.
        </p>
      )}

      <GlassPanel
        title="Automatic follow-up"
        description="A thank-you email straight away with a link to book a call, a WhatsApp message when the lead agreed to WhatsApp, and a follow-up after one day and after three days. It stops as soon as the lead replies, books a call or someone on your team contacts them."
      >
        <div className="space-y-4 px-5 pb-5 pt-3">
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">Follow up new leads automatically</span>
              <span className="block text-xs text-muted-foreground">{defaultNote(v.follow_up === p.follow_up, p.follow_up ? "on" : "off")}</span>
            </span>
            <Switch checked={v.follow_up} disabled={disabled} onCheckedChange={(c) => setV((cur) => ({ ...cur, follow_up: c }))} aria-label="Follow up new leads automatically" />
          </label>
          {data.sequence ? (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span>
                Messages: <span className="font-medium">{data.sequence.name}</span>, {data.sequence.steps} {data.sequence.steps === 1 ? "step" : "steps"}
              </span>
              {!data.sequence.active && <ToneBadge tone="warning">Paused in Nurture</ToneBadge>}
              <Link href={`/${orgSlug}/sequences`} className="inline-flex items-center gap-1 text-primary hover:underline">
                Edit the messages <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {v.follow_up
                ? "Your follow-up messages are set up with your first new lead. You can then change the wording under Nurture."
                : "No follow-up messages are set up."}
            </p>
          )}
        </div>
      </GlassPanel>

      <GlassPanel
        title="Reminders to your team"
        description="Your account owner and admins get an email about every new lead, and a reminder for each lead still waiting for a reply. Reminder times count business hours only: a lead that arrives at night is chased the next business morning."
      >
        <div className="space-y-5 px-5 pb-5 pt-3">
          <Field
            label="Remind after"
            htmlFor="lr-reminders"
            hint={`For example 15m, 2h, 24h. ${defaultNote(
              current.reminder_minutes.join() === p.reminder_minutes.join(),
              p.reminder_minutes.map(formatMinutes).join(", "),
            )}.`}
          >
            <Input id="lr-reminders" value={reminderText} disabled={disabled} onChange={(e) => setReminderText(e.target.value)} />
          </Field>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Business days</legend>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((w) => {
                const on = v.business_days.includes(w.day);
                return (
                  <button
                    key={w.day}
                    type="button"
                    disabled={disabled}
                    aria-pressed={on}
                    aria-label={w.long}
                    onClick={() => toggleDay(w.day)}
                    className={`min-h-9 rounded-full border px-3 text-sm transition-colors disabled:opacity-60 ${
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/60 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {w.short}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Opens" htmlFor="lr-open">
              <Input id="lr-open" type="time" value={v.business_hours.open} disabled={disabled}
                onChange={(e) => setV((cur) => ({ ...cur, business_hours: { ...cur.business_hours, open: e.target.value } }))} />
            </Field>
            <Field label="Closes" htmlFor="lr-close">
              <Input id="lr-close" type="time" value={v.business_hours.close === "24:00" ? "23:59" : v.business_hours.close} disabled={disabled}
                onChange={(e) => setV((cur) => ({ ...cur, business_hours: { ...cur.business_hours, close: e.target.value } }))} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            {describeHours(current)}, {data.timezone} time. {defaultNote(describeHours(current) === describeHours(p), describeHours(p))}.
          </p>

          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">Daily list of leads still waiting</span>
              <span className="block text-xs text-muted-foreground">
                Every morning, with your marketing brief. {defaultNote(v.daily_list === p.daily_list, p.daily_list ? "on" : "off")}
              </span>
            </span>
            <Switch checked={v.daily_list} disabled={disabled} onCheckedChange={(c) => setV((cur) => ({ ...cur, daily_list: c }))} aria-label="Daily list of leads still waiting" />
          </label>
        </div>
      </GlassPanel>

      {problems.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-destructive" role="alert">
          {problems.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}

      {!disabled && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4" />
            Use MarketFlow defaults
          </Button>
          <Button type="submit" disabled={save.isPending || problems.length > 0}>
            <Save className="h-4 w-4" />
            {save.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </form>
  );
}
