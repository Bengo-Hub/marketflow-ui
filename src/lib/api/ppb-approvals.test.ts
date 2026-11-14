import { describe, expect, it } from "vitest";
import {
  enteredByLabel,
  sortPPBApprovals,
  isPPBApprovalRequired,
  isPPBHeld,
  normalizePPBReference,
  ppbCaptionLine,
  ppbReferenceError,
  ppbRequiredProduct,
} from "./ppb-approvals";

describe("PPB approval reference", () => {
  it("tidies and checks a typed reference like the server", () => {
    expect(normalizePPBReference("  PPB/ADV/2026   0001 ")).toBe("PPB/ADV/2026 0001");
    expect(ppbReferenceError("PPB/ADV/2026/0001")).toBeNull();
    expect(ppbReferenceError("PPB-ADV-#12 (radio)")).toBeNull();
    expect(ppbReferenceError("   ")).toMatch(/Enter the approval reference/);
    expect(ppbReferenceError("ab")).toMatch(/3 to 80/);
    expect(ppbReferenceError("/ADV/1")).toMatch(/3 to 80/);
    expect(ppbReferenceError("<script>")).toMatch(/3 to 80/);
    expect(ppbReferenceError("A".repeat(81))).toMatch(/3 to 80/);
  });

  it("writes the line the ad carries", () => {
    expect(ppbCaptionLine("PPB/ADV/1")).toBe("PPB approval ref. PPB/ADV/1");
  });

  it("holds only a pharmacy's medicine ad without a reference", () => {
    expect(isPPBHeld({ pharmacy: true, medicine: true, required: true })).toBe(true);
    expect(isPPBHeld({ pharmacy: true, medicine: true, required: true, approval: null })).toBe(true);
    expect(
      isPPBHeld({
        pharmacy: true,
        medicine: true,
        required: true,
        approval: { offering_key: "inventory:1", reference: "PPB/1", entered_at: "2026-11-14T08:00:00Z" },
      }),
    ).toBe(false);
    expect(isPPBHeld({ pharmacy: true, medicine: false, required: false })).toBe(false);
    expect(isPPBHeld({ pharmacy: false, medicine: true, required: false })).toBe(false);
    expect(isPPBHeld(undefined)).toBe(false);
  });
});

describe("PPB approvals settings list", () => {
  const members = [
    { id: "u1", email: "owner@example.com", you: true },
    { id: "u2", email: "admin@example.com", you: false },
  ];
  it("names who entered a reference", () => {
    expect(enteredByLabel("u1", members)).toBe("You");
    expect(enteredByLabel("u2", members)).toBe("admin@example.com");
    expect(enteredByLabel("u3", members)).toBe("A team member");
    expect(enteredByLabel("u2", undefined)).toBe("A team member");
    expect(enteredByLabel(undefined, members)).toBe("Not recorded");
  });
  it("sorts by product name, then key", () => {
    const at = "2026-11-14T08:00:00Z";
    const sorted = sortPPBApprovals([
      { offering_key: "inventory:2", offering_name: "panadol", reference: "B", entered_at: at },
      { offering_key: "name:coartem", reference: "C", entered_at: at },
      { offering_key: "inventory:1", offering_name: "Amoxil", reference: "A", entered_at: at },
    ]);
    expect(sorted.map((a) => a.reference)).toEqual(["A", "C", "B"]);
  });
});

describe("ppb_approval_required answer", () => {
  const held = {
    response: { status: 409, data: { code: "ppb_approval_required", details: { offering_key: "inventory:7", offering_name: "Panadol 500mg" } } },
  };
  it("recognises only the server's ppb_approval_required answer", () => {
    expect(isPPBApprovalRequired(held)).toBe(true);
    expect(isPPBApprovalRequired({ response: { status: 409, data: { code: "conflict" } } })).toBe(false);
    expect(isPPBApprovalRequired({ response: { status: 400, data: { code: "ppb_approval_required" } } })).toBe(false);
    expect(isPPBApprovalRequired(new Error("network"))).toBe(false);
    expect(isPPBApprovalRequired(undefined)).toBe(false);
  });
  it("names the product to enter the reference for", () => {
    expect(ppbRequiredProduct(held)).toEqual({ offering_key: "inventory:7", offering_name: "Panadol 500mg" });
    expect(ppbRequiredProduct({ response: { status: 409, data: { code: "ppb_approval_required", details: {} } } })).toBeNull();
    expect(ppbRequiredProduct({ response: { status: 409, data: { code: "conflict" } } })).toBeNull();
  });
});
