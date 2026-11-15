/**
 * Sprint 7 #48, #52 and #54: report and email settings, kept in tenant metadata
 * (marketflow-api tenant.WeeklyReportKey, AverageSaleValueKey and EmailFooterKey).
 */
export interface ReportSettings {
  /** The Monday report email (unset means on). */
  weeklyReport: boolean;
  /** What one converted lead is worth; null uses the average of won deals. */
  averageSaleValue: number | null;
  /** The closing line under every email to leads and customers. */
  emailFooter: string;
}

export const MAX_EMAIL_FOOTER = 300;

export function reportSettingsFrom(meta: Record<string, unknown> | undefined): ReportSettings {
  const v = meta?.average_sale_value;
  const footer = meta?.email_footer;
  return {
    weeklyReport: meta?.weekly_report !== "off",
    averageSaleValue: typeof v === "number" && v > 0 ? v : null,
    emailFooter: typeof footer === "string" ? footer : "",
  };
}

/** The metadata patch that saves the settings; null clears the amount and an empty footer. */
export function reportSettingsPatch(s: ReportSettings): {
  weekly_report: "on" | "off";
  average_sale_value: number | null;
  email_footer: string | null;
} {
  const footer = s.emailFooter.replace(/\s+/g, " ").trim();
  return {
    weekly_report: s.weeklyReport ? "on" : "off",
    average_sale_value: s.averageSaleValue,
    email_footer: footer === "" ? null : footer,
  };
}
