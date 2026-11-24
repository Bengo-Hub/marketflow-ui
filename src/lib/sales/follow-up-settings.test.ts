import { describe, expect, it } from "vitest";
import { amountSetting, parseHandoffAmount, salesSettingsFrom, salesSettingsPatch } from "./follow-up-settings";

describe("sales follow-up settings", () => {
  it("defaults to answering leads with no hand-off amount", () => {
    expect(salesSettingsFrom(undefined)).toEqual({ autoReply: true, handoffValue: null });
    expect(salesSettingsFrom({ sales_auto_reply: false, sales_handoff_value: 100000 })).toEqual({ autoReply: false, handoffValue: 100000 });
    expect(salesSettingsFrom({ sales_handoff_value: "x" }).handoffValue).toBeNull();
  });

  it("reads typed amounts", () => {
    expect(parseHandoffAmount("150000")).toBe(150000);
    expect(parseHandoffAmount("150,000")).toBe(150000);
    expect(parseHandoffAmount("KES 150k")).toBe(150000);
    expect(parseHandoffAmount("1.2m")).toBe(1200000);
    expect(parseHandoffAmount("")).toBeNull();
    expect(parseHandoffAmount("0")).toBeNull();
    expect(parseHandoffAmount("a lot")).toBeUndefined();
    expect(parseHandoffAmount("-5")).toBeUndefined();
  });

  it("saves both keys, clearing the amount with null", () => {
    expect(salesSettingsPatch({ autoReply: true, handoffValue: null })).toEqual({ sales_auto_reply: true, sales_handoff_value: null });
  });
});

describe("amountSetting", () => {
  it("saves a money field's value as a setting", () => {
    expect(amountSetting(150000)).toBe(150000);
    expect(amountSetting(2500.6)).toBe(2501);
    expect(amountSetting(0)).toBeNull();
    expect(amountSetting(null)).toBeNull();
    expect(amountSetting(1e12)).toBeUndefined();
  });
});
