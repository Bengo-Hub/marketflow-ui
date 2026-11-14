import { describe, expect, it } from "vitest";
import { reportSettingsFrom, reportSettingsPatch } from "./report-settings";

describe("report settings", () => {
  it("defaults to the weekly email on, no average and no footer", () => {
    expect(reportSettingsFrom(undefined)).toEqual({ weeklyReport: true, averageSaleValue: null, emailFooter: "" });
    expect(reportSettingsFrom({ weekly_report: "off", average_sale_value: 2500, email_footer: "Shop 4, Kisumu" })).toEqual({
      weeklyReport: false,
      averageSaleValue: 2500,
      emailFooter: "Shop 4, Kisumu",
    });
    expect(reportSettingsFrom({ average_sale_value: 0 }).averageSaleValue).toBeNull();
  });

  it("saves a tidy footer and clears an empty one", () => {
    expect(reportSettingsPatch({ weeklyReport: true, averageSaleValue: null, emailFooter: "  Shop 4\n Kisumu " })).toEqual({
      weekly_report: "on",
      average_sale_value: null,
      email_footer: "Shop 4 Kisumu",
    });
    expect(reportSettingsPatch({ weeklyReport: false, averageSaleValue: 1200, emailFooter: "   " }).email_footer).toBeNull();
  });
});
