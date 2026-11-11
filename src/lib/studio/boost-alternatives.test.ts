import { describe, expect, it } from "vitest";
import { boostAlternatives } from "./boost-alternatives";
import type { CreativeVersion } from "@/lib/api/creative";

const v = (id: string, status: string, kind = "video_ad", no = 1): CreativeVersion =>
  ({
    id,
    brief_id: "b",
    version_no: no,
    kind,
    status,
    edges: { assets: [{ id: "asset-" + id, kind: "video" }] },
  }) as unknown as CreativeVersion;

// Budget optimiser (away decision 23): a boost may run up to two more approved videos of the brief.
describe("boostAlternatives", () => {
  it("lists the brief's other approved videos", () => {
    const got = boostAlternatives(
      [v("a", "approved", "video_ad", 1), v("b", "approved", "video_ad", 2), v("c", "ready"), v("d", "approved", "poster")],
      "a",
    );
    expect(got).toEqual([{ assetId: "asset-b", label: "Version 2" }]);
  });
  it("is empty without siblings", () => {
    expect(boostAlternatives([v("a", "approved")], "a")).toEqual([]);
  });
});
