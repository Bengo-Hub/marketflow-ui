import { describe, expect, it } from "vitest";
import {
  businessTypeChosen,
  businessTypeLabel,
  changedBusinessType,
  initialBusinessType,
  isAdminOnlyType,
  ownerChoices,
  pickerOrder,
  type BusinessTypeOption,
} from "./business-types";

const list: BusinessTypeOption[] = [
  { key: "generic", label: "Other business", description: "Any business not listed here." },
  { key: "flp", label: "Forever Living (FBO)", description: "Forever Business Owners.", admin_only: true },
  { key: "pharmacy", label: "Pharmacy or chemist", description: "Pharmacy and Poisons Board advertising limits apply." },
  { key: "hospitality", label: "Hotel, guest house or lodge", description: "No fake availability." },
];

describe("pickerOrder", () => {
  it("keeps the API order and puts Other business last", () => {
    expect(pickerOrder(list).map((t) => t.key)).toEqual(["flp", "pharmacy", "hospitality", "generic"]);
  });
  it("does not change the input", () => {
    pickerOrder(list);
    expect(list[0].key).toBe("generic");
  });
});

describe("ownerChoices", () => {
  it("hides admin-only types (Forever Living)", () => {
    expect(ownerChoices(list).map((t) => t.key)).toEqual(["pharmacy", "hospitality", "generic"]);
  });
  it("marks a stored Forever Living type read-only", () => {
    expect(isAdminOnlyType(list, "flp")).toBe(true);
    expect(isAdminOnlyType(undefined, "FLP")).toBe(true);
    expect(isAdminOnlyType(list, "pharmacy")).toBe(false);
  });
});

describe("businessTypeLabel", () => {
  it("uses the API label", () => {
    expect(businessTypeLabel(list, "pharmacy")).toBe("Pharmacy or chemist");
    expect(businessTypeLabel(list, " Hospitality ")).toBe("Hotel, guest house or lodge");
  });
  it("falls back when the list is not loaded or the key is unknown", () => {
    expect(businessTypeLabel(undefined, "")).toBe("Other business");
    expect(businessTypeLabel(undefined, "flp")).toBe("Forever Living");
    expect(businessTypeLabel(list, "e-commerce")).toBe("E commerce");
  });
});

describe("chosen state", () => {
  it("reads the chosen flag from the metadata", () => {
    expect(businessTypeChosen(undefined)).toBe(false);
    expect(businessTypeChosen({ business_type_chosen_at: "" })).toBe(false);
    expect(businessTypeChosen({ business_type_chosen_at: "2026-11-14T10:00:00Z" })).toBe(true);
  });
  it("starts an unchosen generic tenant with nothing selected", () => {
    expect(initialBusinessType("generic", false)).toBe("");
    expect(initialBusinessType("", false)).toBe("");
    expect(initialBusinessType("generic", true)).toBe("generic");
    expect(initialBusinessType("salon", false)).toBe("salon");
  });
});

describe("changedBusinessType", () => {
  it("sends a changed type", () => {
    expect(changedBusinessType("generic", "salon")).toBe("salon");
    expect(changedBusinessType(null, "retail")).toBe("retail");
  });
  it("sends nothing when unchanged and already chosen, or nothing picked", () => {
    expect(changedBusinessType("salon", "salon")).toBeUndefined();
    expect(changedBusinessType("codevertex", "codevertex")).toBeUndefined();
    expect(changedBusinessType(undefined, "")).toBeUndefined();
  });
  it("sends an explicit Other business when the type was never chosen", () => {
    expect(changedBusinessType("generic", "generic", false)).toBe("generic");
  });
  it("never sends Forever Living from the owner's form", () => {
    expect(changedBusinessType("flp", "flp", false)).toBeUndefined();
    expect(changedBusinessType("generic", "flp")).toBeUndefined();
  });
});
