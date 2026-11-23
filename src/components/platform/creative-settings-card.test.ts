import { describe, expect, it } from "vitest";
import { CREATIVE_SETTINGS, validateContacts, validateDiscardWindow, windowHours } from "./creative-settings-card";
import { fileNameFrom } from "@/lib/api/creative";
import { creditCeilingProblem } from "@/lib/api/autopilot";

describe("creative settings", () => {
  it("reads discard windows in hours", () => {
    expect(windowHours("24h")).toBe(24);
    expect(windowHours("72")).toBe(72);
    expect(windowHours("1h30m")).toBe(1.5);
    expect(windowHours("soon")).toBeNull();
  });
  it("keeps the discard window between an hour and 30 days", () => {
    expect(validateDiscardWindow("")).toBeNull();
    expect(validateDiscardWindow("48h")).toBeNull();
    expect(validateDiscardWindow("30m")).not.toBeNull();
    expect(validateDiscardWindow("800h")).not.toBeNull();
  });
  it("accepts only known contact kinds", () => {
    expect(validateContacts("whatsapp, phone,link")).toBeNull();
    expect(validateContacts("whatsapp,fax")).toContain("fax");
  });
  it("checks the logo plate settings", () => {
    const check = (key: string, v: string) => CREATIVE_SETTINGS.find((s) => s.key === key)?.validate?.(v) ?? null;
    expect(check("creative.logo_plate_style", "Light")).toBeNull();
    expect(check("creative.logo_plate_style", "glow")).not.toBeNull();
    expect(check("creative.logo_plate_opacity", "0.8")).toBeNull();
    expect(check("creative.logo_plate_opacity", "0.2")).not.toBeNull();
    expect(check("creative.logo_every_scene", "false")).toBeNull();
    expect(check("creative.logo_every_scene", "yes")).not.toBeNull();
  });
});

describe("downloads and budgets", () => {
  it("reads the file name from Content-Disposition", () => {
    expect(fileNameFrom('attachment; filename="marketflow-video-12345678.mp4"')).toBe("marketflow-video-12345678.mp4");
    expect(fileNameFrom("")).toBe("marketflow-file");
  });
  it("checks the monthly credit ceiling", () => {
    expect(creditCeilingProblem(100)).toBeNull();
    expect(creditCeilingProblem(0)).not.toBeNull();
    expect(creditCeilingProblem(5001)).not.toBeNull();
    expect(creditCeilingProblem(1.5)).not.toBeNull();
  });
});
