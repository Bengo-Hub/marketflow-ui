"use client";

import { useState } from "react";
import { FileChartColumn, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ErrorState, Field, GlassPanel, PageHeader } from "@/components/ui-kit";
import { useTenantProfile, useUpdateTenantProfile } from "@/hooks/use-tenant-profile";
import type { TenantProfile } from "@/lib/api/tenant-profile";
import { MoneyInput } from "@bengo-hub/shared-ui-lib/payments";
import { amountSetting } from "@/lib/sales/follow-up-settings";
import { FALLBACK_CURRENCY } from "@/lib/money";
import { MAX_EMAIL_FOOTER, reportSettingsFrom, reportSettingsPatch } from "@/lib/reports/report-settings";

/** Sprint 7 #48, #52 and #54: the weekly report email, the average sale value and the email footer. */
export default function ReportSettingsPage() {
  const { data, isLoading, error, refetch, dataUpdatedAt } = useTenantProfile();
  if (error) return <ErrorState message="Could not load your settings." onRetry={() => void refetch()} />;
  if (isLoading || !data) return <div className="glass mx-auto h-64 max-w-3xl animate-pulse rounded-[1.25rem]" aria-busy />;
  return <ReportSettingsForm key={dataUpdatedAt} data={data} />;
}

function ReportSettingsForm({ data }: { data: TenantProfile }) {
  const save = useUpdateTenantProfile();
  const initial = reportSettingsFrom(data.metadata);
  const [weeklyReport, setWeeklyReport] = useState(initial.weeklyReport);
  const currency = data.currency || FALLBACK_CURRENCY;
  const [amount, setAmount] = useState<number | null>(initial.averageSaleValue || null);
  const [footer, setFooter] = useState(initial.emailFooter);
  // Empty or 0 uses the won-deal average; the API caps the amount like the sales hand-off.
  const parsed = amountSetting(amount);
  const amountError = parsed === undefined ? "Enter a smaller amount, or leave it empty." : undefined;
  const footerError = footer.trim().length > MAX_EMAIL_FOOTER ? `Keep it to ${MAX_EMAIL_FOOTER} characters.` : undefined;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsed === undefined || footerError) return;
    save.mutate({ metadata: reportSettingsPatch({ weeklyReport, averageSaleValue: parsed, emailFooter: footer }) });
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6" noValidate>
      <PageHeader
        icon={<FileChartColumn />}
        title="Reports and emails"
        description="Your weekly report, how campaign returns are worked out, and the line that closes your emails."
      />

      <GlassPanel title="Weekly report">
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-background/60 p-4">
          <div>
            <p className="text-sm font-medium">Email me my week every Monday</p>
            <p className="text-xs text-muted-foreground">
              New leads, converted leads, deals won, ad spend and your top campaigns, sent to you and your MarketFlow admins.
              Nothing is sent for a week with no activity.
            </p>
          </div>
          <Switch checked={weeklyReport} onCheckedChange={setWeeklyReport} aria-label="Email me my week every Monday" />
        </div>
      </GlassPanel>

      <GlassPanel
        title="Campaign return"
        description="A converted lead without a won deal counts at this value when the dashboard works out what each campaign brought back."
      >
        <Field
          label={`Average sale value (${currency})`}
          hint="Leave it empty to use the average of your won deals over the last 180 days."
          error={amountError}
          htmlFor="rs-amount"
        >
          <MoneyInput id="rs-amount" currency={currency} wholeOnly min={0} value={amount} onChange={setAmount} placeholder="For example: 2,500" />
        </Field>
      </GlassPanel>

      <GlassPanel
        title="Email footer"
        description="Your emails to leads and customers already carry your logo, colour, email and phone. This line goes under them."
      >
        <Field
          label="Closing line"
          hint="For example your address and opening hours."
          error={footerError}
          htmlFor="rs-footer"
        >
          <Input
            id="rs-footer"
            value={footer}
            maxLength={MAX_EMAIL_FOOTER + 20}
            onChange={(e) => setFooter(e.target.value)}
            placeholder="Shop 4, Mega Plaza, Kisumu. Open Monday to Saturday, 8am to 6pm."
          />
        </Field>
      </GlassPanel>

      <div className="flex justify-end">
        <Button type="submit" disabled={save.isPending || parsed === undefined || Boolean(footerError)}>
          <Save className="h-4 w-4" />
          {save.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
