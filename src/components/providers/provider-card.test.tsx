import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProviderCard, modelOptions } from "./provider-card";
import { RoutingPolicyEditor } from "./routing-policy-editor";
import { findProvider } from "@/lib/providers/catalog";

vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));

afterEach(cleanup);

function withQuery(ui: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;
}

describe("ProviderCard", () => {
  it("ties labels to inputs, keeps the base URL under Advanced and orders the footer", () => {
    render(withQuery(<ProviderCard provider={findProvider("ai_llm", "groq")!} />));
    expect(screen.getByRole("article", { name: "Groq" })).toBeInTheDocument();
    expect(screen.getByText("Not configured")).toBeInTheDocument();
    expect(screen.getByLabelText(/API key/)).toHaveAttribute("type", "password");
    const base = screen.getByLabelText("Base URL");
    expect(base.closest("details")).not.toBeNull();
    expect(screen.getByText("Advanced settings")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button").map((b) => b.textContent?.trim());
    expect(buttons.slice(-3)).toEqual(["Configure", "Test", "Sync models"]);
  });

  it("shows Update and a connected badge once configured", () => {
    render(
      withQuery(
        <ProviderCard
          provider={findProvider("meta_ads", "oauth")!}
          existing={{ id: "1", provider_type: "meta_ads", provider_name: "oauth", is_active: true }}
        />,
      ),
    );
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
    expect(screen.getByLabelText(/App secret/)).toHaveAttribute("placeholder", "•••••••• (leave blank to keep)");
  });
});

describe("modelOptions", () => {
  it("tags free and vision models and keeps an unlisted saved id", () => {
    const rows = modelOptions(
      [
        { id: "qwen/qwen3-vl:free", free: true, vision: true },
        { id: "deepseek/deepseek-r2:free", free: true },
        { id: "openai/gpt-5" },
      ],
      "my/custom-model",
    );
    expect(rows.map((r) => [r.value, r.hint])).toEqual([
      ["my/custom-model", "not in the list"],
      ["qwen/qwen3-vl:free", "free, reads images"],
      ["deepseek/deepseek-r2:free", "free"],
      ["openai/gpt-5", undefined],
    ]);
    expect(modelOptions([{ id: "a" }], "a")).toHaveLength(1);
  });
});

function Harness({ initial }: { initial: string }) {
  const [v, setV] = useState(initial);
  return (
    <>
      <RoutingPolicyEditor id="policy" value={v} onChange={setV} />
      <output data-testid="saved">{v}</output>
    </>
  );
}

describe("RoutingPolicyEditor", () => {
  it("edits a class as a list and saves the same JSON shape", () => {
    render(<Harness initial={JSON.stringify({ classes: { premium: [{ provider: "anthropic", model: "@premium" }] }, decide: { monthly_usd_ceiling: 20 } })} />);
    fireEvent.change(screen.getByLabelText("Timeout in seconds (premium target 1)"), { target: { value: "45" } });
    fireEvent.click(screen.getByRole("button", { name: /Add fallback/ }));
    fireEvent.change(screen.getByLabelText("Provider (premium target 2)"), { target: { value: "gemini" } });
    const saved = JSON.parse(screen.getByTestId("saved").textContent!);
    expect(saved).toEqual({
      classes: { premium: [{ provider: "anthropic", model: "@premium", timeout_seconds: 45 }, { provider: "gemini", model: "" }] },
      decide: { monthly_usd_ceiling: 20 },
    });
    expect(screen.getByText(/Also set in this policy: decide/)).toBeInTheDocument();
  });

  it("opens the raw JSON view when the text does not parse", () => {
    render(<Harness initial="{oops" />);
    expect(screen.getByRole("tab", { name: "Raw JSON" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(/Not valid JSON/);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: '{"classes":{"nano":[{"provider":"groq","model":"@router"}]}}' } });
    fireEvent.click(screen.getByRole("tab", { name: "By class" }));
    expect(screen.getByLabelText("Model (nano target 1)")).toHaveValue("@router");
  });
});
