import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

type Opts = { onSuccess?: (d: unknown) => void; onError?: (e: unknown) => void };
const launch = vi.fn<(body: Record<string, unknown>, o: Opts) => void>();
const sendOtp = vi.fn<(body: Record<string, unknown>, o: Opts) => void>();

vi.mock("next/navigation", () => ({ useParams: () => ({ orgSlug: "shop" }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/use-access", () => ({ useIsRestricted: () => true }));
vi.mock("@bengo-hub/shared-ui-lib/search", () => ({ useDebouncedValue: (v: unknown) => v }));
vi.mock("@/hooks/use-publishing", () => ({
  usePublishAccounts: () => ({ data: [{ id: "pg1", platform: "facebook", display_name: "Shop Page" }] }),
}));
vi.mock("@/hooks/use-ads", () => ({
  useAdAccounts: () => ({ isSuccess: true, data: [{ connected_account_id: "a1", name: "Shop Ads", currency: "KES", active: true }] }),
  useAdQuote: () => ({
    isError: false,
    data: { currency: "KES", budget: 60000, days: 7, balance: 0, shortfall: 0, funding: "card", launch_credits: 0, blockers: [], account_name: "Shop Ads", ad_account_id: "act_1" },
  }),
  useBoost: () => ({ data: undefined }),
  useBoostAction: () => ({ mutate: vi.fn(), isPending: false }),
  useLaunchBoost: () => ({ mutate: launch, isPending: false }),
  useBoostOtp: () => ({ mutate: sendOtp, isPending: false }),
}));

import { BoostDialog, codeErrorText } from "./boost-dialog";

const apiErr = (status: number, data: Record<string, unknown>) => ({ response: { status, data } });

function open() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BoostDialog open onOpenChange={() => {}} assetId="v1" defaultText="Fresh bread daily" />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Confirm and launch" }));
}

beforeEach(() => {
  launch.mockReset();
  sendOtp.mockReset();
});
// This project runs vitest without globals, so Testing Library cannot unmount on its own.
afterEach(cleanup);

describe("BoostDialog WhatsApp code", () => {
  it("asks for a code over the limit, allows three tries, then a new code", () => {
    launch.mockImplementationOnce((_b, o) => o.onError?.(apiErr(428, { error: "otp_required", threshold_kes: 50000 })));
    sendOtp.mockImplementation((_b, o) =>
      o.onSuccess?.({ otp_id: "otp1", expires_at: "2026-11-16T10:10:00Z", channel: "whatsapp", to_masked: "+2547****321" }),
    );
    open();

    expect(sendOtp).toHaveBeenCalledTimes(1);
    const body = sendOtp.mock.calls[0][0];
    expect(body).toMatchObject({ asset_id: "v1", message: "Fresh bread daily" });
    expect(body).not.toHaveProperty("otp_id");
    expect(screen.getByText(/We sent a 6-digit code to your WhatsApp/)).toBeInTheDocument();
    expect(screen.getByText("+2547****321")).toBeInTheDocument();

    const input = screen.getByLabelText("Code from WhatsApp");
    launch.mockImplementation((_b, o) => o.onError?.(apiErr(403, { error: "That code is not right" })));
    for (let i = 0; i < 3; i++) {
      fireEvent.change(input, { target: { value: "12a3456" } });
      fireEvent.click(screen.getByRole("button", { name: "Confirm and launch" }));
    }
    expect(launch).toHaveBeenCalledTimes(4);
    expect(launch.mock.calls[1][0]).toEqual({ ...body, otp_id: "otp1", otp_code: "123456" });
    expect(screen.getByRole("alert")).toHaveTextContent("That code is not right. Ask for a new code to try again.");
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: "Confirm and launch" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Send a new code" }));
    expect(sendOtp).toHaveBeenCalledTimes(2);
    expect(sendOtp.mock.calls[1][0]).toEqual(body);
    expect(screen.getByLabelText("Code from WhatsApp")).not.toBeDisabled();
  });

  it("launches once the code is right", () => {
    launch.mockImplementationOnce((_b, o) => o.onError?.(apiErr(428, { error: "otp_required", threshold_kes: 50000 })));
    sendOtp.mockImplementation((_b, o) => o.onSuccess?.({ otp_id: "otp1", expires_at: "", channel: "whatsapp", to_masked: "+2547****321" }));
    open();
    launch.mockImplementationOnce((_b, o) => o.onSuccess?.({ id: "b1", status: "launching" }));
    fireEvent.change(screen.getByLabelText("Code from WhatsApp"), { target: { value: "654321" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm and launch" }));
    expect(launch.mock.calls[1][0]).toMatchObject({ otp_id: "otp1", otp_code: "654321" });
    expect(screen.queryByLabelText("Code from WhatsApp")).toBeNull();
  });

  it("tells the owner to add a verified WhatsApp number", () => {
    launch.mockImplementationOnce((_b, o) => o.onError?.(apiErr(428, { error: "otp_required", threshold_kes: 50000 })));
    sendOtp.mockImplementation((_b, o) => o.onError?.(apiErr(409, { error: "no_verified_phone" })));
    open();
    expect(screen.getByRole("alert")).toHaveTextContent(/no verified WhatsApp number/);
    expect(screen.getByRole("link", { name: "Open account settings" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Code from WhatsApp")).toBeNull();
  });
});

describe("codeErrorText", () => {
  it("shows the API reason and the tries left", () => {
    expect(codeErrorText("That code is not right", 2)).toBe("That code is not right. You can try 2 more times.");
    expect(codeErrorText("invalid_otp", 1)).toBe("That code did not work. You can try 1 more time.");
    expect(codeErrorText("", 0)).toBe("That code did not work. Ask for a new code to try again.");
  });
});
