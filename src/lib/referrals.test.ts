import { describe, expect, it } from "vitest";
import { cleanReferralCode, inviteLink, inviteMessage, rewardValue, untilReset, whatsAppShare } from "./referrals";

describe("gift a friend helpers", () => {
  it("keeps only well formed referral codes", () => {
    expect(cleanReferralCode(" CV-AB12CD34 ")).toBe("CV-AB12CD34");
    expect(cleanReferralCode("CV-1a2b3c4d")).toBe("CV-1a2b3c4d");
    expect(cleanReferralCode("AB12CD34")).toBe("");
    expect(cleanReferralCode("CV-AB<script>")).toBe("");
    expect(cleanReferralCode(null)).toBe("");
  });

  it("builds the share link and WhatsApp text", () => {
    expect(inviteLink("CV-AB12CD34", "https://mf.example/")).toBe("https://mf.example/join?ref=CV-AB12CD34");
    const msg = inviteMessage("Shiko Beauty", "https://mf.example/join?ref=CV-1", 5);
    expect(msg).toContain("Shiko Beauty uses MarketFlow");
    expect(msg).toContain("5 free AI credits once you make your first payment");
    expect(whatsAppShare("a b")).toBe("https://wa.me/?text=a%20b");
  });

  it("shows a reward's value in KES and USD", () => {
    expect(rewardValue(5, 12.5)).toEqual({ kes: "KES 63" });
    expect(rewardValue(5, 12.5, 130)).toEqual({ kes: "KES 63", usd: "USD 0.48" });
  });

  it("counts down to the reset", () => {
    const now = new Date("2026-11-12T21:30:00Z");
    expect(untilReset("2026-11-13T00:00:00Z", now)).toBe("in 2 h 30 min");
    expect(untilReset("2026-11-12T21:40:00Z", now)).toBe("in 10 min");
    expect(untilReset("2026-11-12T20:00:00Z", now)).toBe("soon");
  });
});
