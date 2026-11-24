import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AccountChecklist } from "./account-checklist";
import { adsSetupApi, sortItems, summary, type SetupChecklist, type SetupItem } from "@/lib/api/ads-setup";

const account = { connected_account_id: "a1", platform: "google", external_id: "1", name: "Shop", status: "active" };
const call: SetupItem = {
  key: "google.call", title: "Phone number on your ads", status: "warning", detail: "No number.",
  fix: { label: "Add the number", changes: ["Add this phone number."], token: "t1", fields: [{ key: "phone", label: "Phone number", value: "0700", required: true }] },
};
const ok: SetupItem = { key: "google.account", title: "Account", status: "ok", detail: "Fine." };
const list = (can_fix = true): SetupChecklist => ({ account, items: [ok, call], checked_at: "", can_fix });

const show = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AccountChecklist account={account} />
    </QueryClientProvider>,
  );

describe("AccountChecklist", () => {
  beforeEach(() => {
    vi.spyOn(adsSetupApi, "checklist").mockResolvedValue(list());
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows the changes first and runs the fix only on confirm, with the edited value", async () => {
    const fix = vi.spyOn(adsSetupApi, "fix").mockResolvedValue(list());
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Add the number" }));
    expect(await screen.findByText("Add this phone number.")).toBeTruthy();
    expect(fix).not.toHaveBeenCalled();
    const input = screen.getByLabelText(/Phone number/, { selector: "input" });
    fireEvent.change(input, { target: { value: "" } });
    const confirm = () => screen.getAllByRole("button", { name: "Add the number" }).at(-1) as HTMLButtonElement;
    expect(confirm().disabled).toBe(true);
    fireEvent.change(input, { target: { value: "0711" } });
    fireEvent.click(confirm());
    await waitFor(() => expect(fix).toHaveBeenCalledWith("a1", "google.call", "t1", { phone: "0711" }));
  });

  it("shows a refusal and keeps the dialog open", async () => {
    vi.spyOn(adsSetupApi, "fix").mockRejectedValue({ response: { data: { error: "Google refused: bad number" } } });
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Add the number" }));
    await screen.findByText("Add this phone number.");
    fireEvent.click(screen.getAllByRole("button", { name: "Add the number" }).at(-1)!);
    expect((await screen.findByRole("alert")).textContent).toContain("bad number");
  });

  it("opens a MarketFlow page in the same tab and a provider page in a new one", async () => {
    vi.spyOn(adsSetupApi, "checklist").mockResolvedValue({
      ...list(),
      items: [
        { ...ok, status: "action", link: { label: "Reconnect Google Ads", url: "/shop/settings/integrations" } },
        { ...call, link: { label: "Open assets", url: "https://ads.google.com/aw" } },
      ],
    });
    show();
    const inside = await screen.findByRole("link", { name: "Reconnect Google Ads" });
    expect(inside.getAttribute("href")).toBe("/shop/settings/integrations");
    expect(inside.getAttribute("target")).toBeNull();
    expect(screen.getByRole("link", { name: /Open assets/ }).getAttribute("target")).toBe("_blank");
  });

  it("offers no fix to a member who may not change it", async () => {
    vi.spyOn(adsSetupApi, "checklist").mockResolvedValue(list(false));
    show();
    expect(await screen.findByText("The account owner or an admin can fix this.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add the number" })).toBeNull();
  });
});

describe("ads setup helpers", () => {
  it("puts problems first and sums up", () => {
    expect(sortItems([ok, call]).map((i) => i.key)).toEqual(["google.call", "google.account"]);
    expect(summary([ok, call])).toBe("1 to improve");
    expect(summary([ok])).toBe("Everything is set up");
  });
});
