import { describe, expect, it } from "vitest";
import { deleteAction, deleteConfirmText, reconnectToDeleteHint, unsupportedFromError } from "./delete-from-platform";

describe("delete from platform (owner 2026-11-14)", () => {
  it("offers the delete only on a published post the API can delete", () => {
    expect(deleteAction({ status: "published", platform: "facebook", can_delete_on_platform: true })).toEqual({
      kind: "delete",
      label: "Delete from platform",
    });
    expect(deleteAction({ status: "pending", platform: "facebook", can_delete_on_platform: true })).toBeNull();
    expect(deleteAction({ status: "deleted_on_platform", platform: "youtube" })).toBeNull();
  });

  it("shows the platform's own steps where it cannot delete", () => {
    const a = deleteAction({
      status: "published",
      platform: "tiktok",
      can_delete_on_platform: false,
      delete_unavailable_reason: "tikTok does not let apps delete a post. Delete it on TikTok.",
      delete_steps: ["Open the video in the TikTok app.", "Tap Delete and confirm."],
      delete_help_url: "https://support.tiktok.com",
    });
    expect(a).toEqual({
      kind: "manual",
      label: "Delete it on TikTok",
      reason: "TikTok does not let apps delete a post. Delete it on TikTok.",
      steps: ["Open the video in the TikTok app.", "Tap Delete and confirm."],
      helpUrl: "https://support.tiktok.com",
    });
  });

  it("falls back to known steps when the API sent none", () => {
    const a = deleteAction({ status: "published", platform: "instagram" });
    expect(a?.kind).toBe("manual");
    expect(a && a.kind === "manual" && a.steps.length).toBeGreaterThan(0);
    expect(a?.label).toBe("Delete it on Instagram");
  });

  it("reads a 409 delete_unsupported answer into manual steps", () => {
    const err = {
      response: {
        status: 409,
        data: {
          code: "delete_unsupported",
          error: "the connected YouTube account has not given MarketFlow permission to delete posts.",
          details: { platform: "youtube", steps: ["Sign in to YouTube Studio."], help_url: "https://support.google.com/youtube/answer/55770" },
        },
      },
    };
    expect(unsupportedFromError(err, "youtube")).toEqual({
      kind: "manual",
      label: "Delete it on YouTube",
      reason: "The connected YouTube account has not given MarketFlow permission to delete posts.",
      steps: ["Sign in to YouTube Studio."],
      helpUrl: "https://support.google.com/youtube/answer/55770",
    });
    expect(unsupportedFromError({ response: { status: 502, data: { code: "platform_error", error: "x" } } }, "youtube")).toBeNull();
    expect(unsupportedFromError(new Error("network"), "youtube")).toBeNull();
  });

  it("asks to reconnect only an account that can post but not delete", () => {
    expect(reconnectToDeleteHint({ enabled: true, needs_reconnect: false, needs_reconnect_to_delete: true })).toBe("Reconnect to allow deleting");
    expect(reconnectToDeleteHint({ enabled: true, needs_reconnect: false, needs_reconnect_to_delete: false })).toBeNull();
    expect(reconnectToDeleteHint({ enabled: true, needs_reconnect: false })).toBeNull();
    expect(reconnectToDeleteHint({ enabled: true, needs_reconnect: true, needs_reconnect_to_delete: true })).toBeNull();
    expect(reconnectToDeleteHint({ enabled: false, needs_reconnect: false, needs_reconnect_to_delete: true })).toBeNull();
  });

  it("names the platform in the confirm text", () => {
    expect(deleteConfirmText("facebook")).toContain("Facebook");
    expect(deleteConfirmText("facebook")).toContain("cannot be undone");
  });
});
