import { describe, expect, it } from "vitest";
import { CREATIVE_SETTINGS, validateContacts, validateBranding, validateDiscardWindow, validateLandmarks, validateScreens, windowHours } from "./creative-settings-card";
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
  it("checks the landmark registry", () => {
    expect(validateLandmarks("")).toBeNull();
    expect(validateLandmarks('{"kisumu cbd": {"landmarks": ["Mega Plaza towers"], "street_life": "matatus"}}')).toBeNull();
    expect(validateLandmarks("{oops")).toBe("Not valid JSON.");
    expect(validateLandmarks('["kisumu"]')).not.toBeNull();
    expect(validateLandmarks('{"kisumu": {"landmarks": "Mega Plaza"}}')).toContain("kisumu");
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

describe("real app screens", () => {
  it("checks the screen rules", () => {
    expect(validateScreens("")).toBeNull();
    expect(validateScreens('{"enabled": true, "max_scenes": 3}')).toBeNull();
    expect(validateScreens('{"enabled": "yes"}')).toContain("enabled");
    expect(validateScreens('{"enabled": true, "max_scenes": 9}')).toContain("max_scenes");
  });
});

describe("in-scene branding", () => {
  it("checks the branding rules", () => {
    expect(validateBranding("")).toBeNull();
    expect(validateBranding('{"enabled": true, "max_scenes": 2, "kinds": ["presenter"], "max_width": 0.15}')).toBeNull();
    expect(validateBranding('{"enabled": false}')).toBeNull();
    expect(validateBranding('{"max_scenes": 2}')).toContain("enabled");
    expect(validateBranding('{"enabled": true, "max_scenes": 5}')).toContain("max_scenes");
    expect(validateBranding('{"enabled": true, "kinds": ["product"]}')).toContain("kinds");
    expect(validateBranding('{"enabled": true, "max_width": 0.9}')).toContain("max_width");
  });
});
