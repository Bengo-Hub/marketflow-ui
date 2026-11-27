import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MediaRoutePanel, routeOptions } from "./media-route-panel";
import { apiClient } from "@/lib/api/client";
import type { MediaRoute } from "@/lib/api/media-routes";

vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

const get = apiClient.get as unknown as ReturnType<typeof vi.fn>;
const patch = apiClient.patch as unknown as ReturnType<typeof vi.fn>;

const voiceFal: MediaRoute = {
  key: "media.route.voice_fal_standard",
  label: "Voice fallback on fal (standard)",
  card: "fal",
  kind: "fal",
  categories: ["text-to-speech"],
  default: "elevenlabs/tts/eleven-v4-turbo",
  value: "elevenlabs/tts/eleven-v5-turbo",
  effective: "elevenlabs/tts/eleven-v5-turbo",
  previous: "elevenlabs/tts/eleven-v4-turbo",
};
const scribe: MediaRoute = {
  key: "media.route.voice_timings_via_scribe",
  label: "Time fal voice-overs with Scribe v2",
  card: "fal",
  kind: "flag",
  default: "false",
  value: "",
  effective: "false",
};

beforeEach(() => {
  get.mockImplementation(async (url: string) => {
    if (url.includes("/media-routes")) return { data: { routes: [voiceFal, scribe] } };
    if (url.includes("/fal-pricing")) {
      return {
        data: {
          prices: {
            "elevenlabs/tts/eleven-v5-turbo": { unit_price: 0.05, unit: "1000 characters", currency: "USD" },
            "elevenlabs/tts/eleven-v4-turbo": { unit_price: 0.04, unit: "1000 characters", currency: "USD" },
          },
        },
      };
    }
    throw new Error("unexpected " + url);
  });
  patch.mockImplementation(async (_url: string, body: { settings: Record<string, string> }) => {
    const [key, value] = Object.entries(body.settings)[0];
    const next = key === voiceFal.key ? { ...voiceFal, value, effective: value || voiceFal.default, previous: voiceFal.effective } : scribe;
    return { data: { routes: [next, scribe] } };
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPanel() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MediaRoutePanel card="fal" models={[]} recommendations={{}} idPrefix="t" />
    </QueryClientProvider>,
  );
}

describe("routeOptions", () => {
  it("keeps only models of the tier's category and keeps the running and default ids", () => {
    const rows = routeOptions({ ...voiceFal, effective: "my/unlisted" }, [
      { id: "elevenlabs/tts/eleven-v4-turbo", category: "text-to-speech" },
      { id: "fal-ai/nano-banana-pro", category: "text-to-image" },
      { id: "elevenlabs/tts/eleven-v5-turbo", category: "text-to-speech" },
    ]);
    expect(rows.map((r) => r.value)).toEqual(["my/unlisted", "elevenlabs/tts/eleven-v4-turbo", "elevenlabs/tts/eleven-v5-turbo"]);
    expect(rows[1].hint).toMatch(/default/);
  });

  it("offers only ElevenLabs ids on an ElevenLabs tier", () => {
    const rows = routeOptions(
      { ...voiceFal, kind: "elevenlabs", card: "elevenlabs", categories: undefined, default: "eleven_v4", effective: "eleven_v4", value: "" },
      [{ id: "eleven_v4" }, { id: "eleven_v5" }, { id: "scribe_v2" }],
    );
    expect(rows.map((r) => r.value)).toEqual(["eleven_v4", "eleven_v5"]);
  });
});

describe("MediaRoutePanel", () => {
  it("shows the price of what runs, compares a pick and saves only that key", async () => {
    renderPanel();
    expect(await screen.findByRole("region", { name: "Media tiers" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/USD 0.05 per 1000 characters/)).toBeInTheDocument());

    const input = screen.getByLabelText("Voice fallback on fal (standard)");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.change(input, { target: { value: "elevenlabs/tts/eleven-v4-turbo" } });
    await waitFor(() => expect(screen.getByTestId("compare")).toHaveTextContent(/at USD 0.04 per 1000 characters/));

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch.mock.calls[0][1]).toEqual({ settings: { "media.route.voice_fal_standard": "elevenlabs/tts/eleven-v4-turbo" } });
  });

  it("resets to the default with an empty value and reverts to the previous model", async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: /Revert to elevenlabs\/tts\/eleven-v4-turbo/ }));
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch.mock.calls[0][1]).toEqual({ settings: { "media.route.voice_fal_standard": "elevenlabs/tts/eleven-v4-turbo" } });

    cleanup();
    patch.mockClear();
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: /Reset to default/ }));
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch.mock.calls[0][1]).toEqual({ settings: { "media.route.voice_fal_standard": "" } });
  });

  it("turns the Scribe timings setting on with its own key", async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole("switch", { name: "Time fal voice-overs with Scribe v2" }));
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch.mock.calls[0][1]).toEqual({ settings: { "media.route.voice_timings_via_scribe": "true" } });
  });
});
