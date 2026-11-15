import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConnectedAccounts } from "./connected-accounts";

describe("ConnectedAccounts", () => {
  it("shows each account with its kind, name, id and picture", () => {
    render(
      <ConnectedAccounts
        accounts={[
          { type: "facebook_page", external_id: "1380", name: "Codevertex Africa", picture_url: "https://g/1380/picture", default: true },
          { type: "instagram_business", external_id: "ig1", name: "codevertex" },
          { type: "meta_ad_account", external_id: "act_9", name: "Codevertex Ads" },
        ]}
      />,
    );
    expect(screen.getByText("Codevertex Africa")).toBeInTheDocument();
    expect(screen.getByText(/Facebook Page/)).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.getByText("@codevertex")).toBeInTheDocument();
    expect(screen.getByText(/Ad account/)).toBeInTheDocument();
    expect(screen.getByText(/ID 1380/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Codevertex Africa" })).toHaveAttribute("src", "https://g/1380/picture");
  });

  it("says which accounts are expiring or stopped working", () => {
    render(
      <ConnectedAccounts
        accounts={[
          { type: "facebook_page", external_id: "1", name: "Shop", health: "ok" },
          { type: "instagram_business", external_id: "ig", name: "shop", health: "expiring", expires_at: "2026-11-20T10:00:00Z" },
          {
            type: "meta_ad_account",
            external_id: "act_1",
            name: "Shop Ads",
            health: "expired",
            problem: "A recent post failed because the platform no longer accepts this connection.",
          },
        ]}
      />,
    );
    expect(screen.getByText("Expiring")).toBeInTheDocument();
    expect(screen.getByText(/Reconnect by 20 Nov 2026/)).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByText(/no longer accepts this connection/)).toBeInTheDocument();
  });

  it("renders nothing without accounts", () => {
    const { container } = render(<ConnectedAccounts accounts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
