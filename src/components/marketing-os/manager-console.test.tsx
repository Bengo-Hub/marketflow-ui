import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const askStream = vi.fn();
vi.mock("@/lib/api/marketing-os", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/api/marketing-os")>();
  return { ...real, marketingOsApi: { ...real.marketingOsApi, askStream: (...a: unknown[]) => askStream(...a) } };
});

// The poster button opens the Studio with the app router.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), useParams: () => ({ orgSlug: "acme" }) }));

import { ManagerConsole } from "./manager-console";

// Sprint 21: the console's "Set up my team" button runs the team setup (free the first time,
// even with no credits) and shows the org chart.
describe("ManagerConsole team setup", () => {
  it("sends team_setup and shows the org chart", async () => {
    askStream.mockResolvedValue({
      run_id: "r1",
      result: { route: "team", cost_usd: 0 },
      answer: "Your marketing team is ready.\nVera, Marketing Manager",
      credits_charged: 0,
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ManagerConsole orgSlug="shop" team={[]} draft="" onDraftChange={() => {}} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Set up my team/ }));
    await waitFor(() => expect(screen.getByText(/Your marketing team is ready/)).toBeInTheDocument());
    expect(askStream.mock.calls[0][0]).toMatchObject({ team_setup: true });
    expect(screen.getByText(/^Free\./)).toBeInTheDocument();
  });
});
